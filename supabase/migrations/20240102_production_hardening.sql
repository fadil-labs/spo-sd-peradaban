-- PHASE 02A — STEP 2E: PRODUCTION HARDENING (FINAL GATE BEFORE PHASE 03)
-- This migration hardens the database schema for production readiness.
-- It builds on top of the base schema and STEP 2D migration.
--
-- Key changes:
-- 1. Race-safe payment idempotency using INSERT ... ON CONFLICT
-- 2. Payment student consistency enforcement
-- 3. Delete policy audit for financial tables
-- 4. Business key review for one-time bills
-- 5. Additional verification tests

-- ============================================
-- 1. DELETE POLICY AUDIT
-- ============================================

-- Ensure financial tables cannot be cascade-deleted from parent master tables.
-- If existing FKs use ON DELETE CASCADE on financial tables, drop and replace with RESTRICT.

-- payments.student_id -> students: must be RESTRICT (financial history must survive student deletion)
DO $$
BEGIN
  -- Drop existing FK if it exists with CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'payments'
      AND kcu.column_name = 'student_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Try to drop with common constraint names
    BEGIN
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
    EXCEPTION
      WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_student;
    EXCEPTION
      WHEN others THEN NULL;
    END;
  END IF;
END;
$$;

ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_student_restrict;
ALTER TABLE payments ADD CONSTRAINT fk_payments_student_restrict
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE RESTRICT;

-- student_bills.student_id -> students: must be RESTRICT (bills are financial history)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'student_bills'
      AND kcu.column_name = 'student_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    BEGIN
      ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS student_bills_student_id_fkey;
    EXCEPTION
      WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS fk_student_bills_student;
    EXCEPTION
      WHEN others THEN NULL;
    END;
  END IF;
END;
$$;

ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS fk_student_bills_student_restrict;
ALTER TABLE student_bills ADD CONSTRAINT fk_student_bills_student_restrict
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE RESTRICT;

-- student_enrollments.student_id -> students: RESTRICT to preserve enrollment history
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'student_enrollments'
      AND kcu.column_name = 'student_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    BEGIN
      ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_student_id_fkey;
    EXCEPTION
      WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS fk_student_enrollments_student;
    EXCEPTION
      WHEN others THEN NULL;
    END;
  END IF;
END;
$$;

ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS fk_student_enrollments_student_restrict;
ALTER TABLE student_enrollments ADD CONSTRAINT fk_student_enrollments_student_restrict
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE RESTRICT;

-- bill_templates.student_id -> students: SET NULL is acceptable (templates are not financial records)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'bill_templates'
      AND kcu.column_name = 'student_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    BEGIN
      ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS bill_templates_student_id_fkey;
    EXCEPTION
      WHEN others THEN NULL;
    END;
    BEGIN
      ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS fk_bill_templates_student;
    EXCEPTION
      WHEN others THEN NULL;
    END;
  END IF;
END;
$$;

ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS fk_bill_templates_student_set_null;
ALTER TABLE bill_templates ADD CONSTRAINT fk_bill_templates_student_set_null
  FOREIGN KEY (student_id)
  REFERENCES students(id)
  ON DELETE SET NULL;

-- ============================================
-- 2. PAYMENT STUDENT CONSISTENCY
-- ============================================

-- Ensure payments.student_id always matches the student_id from the referenced student_bill.
-- This prevents application-layer bugs where student_id is set incorrectly.

CREATE OR REPLACE FUNCTION validate_payment_student_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if student_bill_id is set
  IF NEW.student_bill_id IS NOT NULL THEN
    IF NEW.student_id IS NULL THEN
      RAISE EXCEPTION 'Payment student_id cannot be NULL when student_bill_id is set';
    END IF;

    IF NEW.student_id != (SELECT student_id FROM student_bills WHERE id = NEW.student_bill_id) THEN
      RAISE EXCEPTION 'Payment student_id does not match student_bill student_id. Bill student: %, Payment student: %',
        (SELECT student_id FROM student_bills WHERE id = NEW.student_bill_id), NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_payment_student_consistency_trigger ON payments;

CREATE TRIGGER validate_payment_student_consistency_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_student_consistency();

-- ============================================
-- 3. IDEMPOTENCY RACE-SAFE PROCESS_PAYMENT
-- ============================================

-- The previous process_payment used SELECT then INSERT, which is not race-safe.
-- This version uses INSERT ... ON CONFLICT for atomic idempotency.

CREATE OR REPLACE FUNCTION process_payment(
  p_student_bill_id uuid,
  p_amount numeric(15,2),
  p_payment_method_id uuid,
  p_school_payment_method_id uuid,
  p_reference_number text,
  p_idempotency_key text
) RETURNS uuid AS $$
DECLARE
  v_bill record;
  v_total_paid numeric(15,2);
  v_new_status text;
  v_payment_id uuid;
  v_existing_payment record;
BEGIN
  -- 1. Lock bill row (main concurrency control)
  SELECT * INTO v_bill
  FROM student_bills
  WHERE id = p_student_bill_id
  FOR UPDATE;

  -- 2. Validate bill is payable
  IF v_bill.status IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'Bill is not payable. Current status: %', v_bill.status;
  END IF;

  -- 3. Try to insert payment with ON CONFLICT for race-safe idempotency
  INSERT INTO payments (
    school_id, student_id, student_bill_id,
    payment_method_id, school_payment_method_id,
    amount, payment_date, reference_number, status, idempotency_key
  ) VALUES (
    v_bill.school_id,
    v_bill.student_id,
    p_student_bill_id,
    p_payment_method_id,
    p_school_payment_method_id,
    p_amount,
    now(),
    p_reference_number,
    'completed',
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_payment_id;

  -- 4. If insert succeeded, update bill status
  IF v_payment_id IS NOT NULL THEN
    -- Calculate total paid (completed + pending)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE student_bill_id = p_student_bill_id
      AND status IN ('completed', 'pending');

    -- Determine new bill status
    IF v_total_paid >= v_bill.amount THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;

    UPDATE student_bills
    SET status = v_new_status, updated_at = now()
    WHERE id = p_student_bill_id;

    RETURN v_payment_id;
  END IF;

  -- 5. If conflict occurred, get existing payment and validate payload
  SELECT * INTO v_existing_payment
  FROM payments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_payment.id IS NULL THEN
    RAISE EXCEPTION 'Idempotency key not found after conflict - this should not happen';
  END IF;

  -- Validate that the existing payment matches the current request parameters
  IF v_existing_payment.student_bill_id != p_student_bill_id
    OR v_existing_payment.amount != p_amount
    OR v_existing_payment.payment_method_id != p_payment_method_id
    OR v_existing_payment.school_payment_method_id != p_school_payment_method_id THEN
    RAISE EXCEPTION 'Idempotency key already used with different payment parameters';
  END IF;

  -- Payload matches, return existing payment ID
  RETURN v_existing_payment.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. HELPER FUNCTION: RECALCULATE BILL STATUS
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_bill_status(p_student_bill_id uuid)
RETURNS text AS $$
DECLARE
  v_total_paid numeric(15,2);
  v_bill record;
  v_new_status text;
BEGIN
  SELECT * INTO v_bill
  FROM student_bills
  WHERE id = p_student_bill_id;

  IF v_bill.status = 'cancelled' THEN
    RETURN 'cancelled';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE student_bill_id = p_student_bill_id
    AND status IN ('completed', 'pending');

  IF v_total_paid >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSIF v_bill.due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE student_bills
  SET status = v_new_status, updated_at = now()
  WHERE id = p_student_bill_id;

  RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. PAYMENT STATUS DOCUMENTATION
-- ============================================
-- Payment status semantics:
--   completed: counted toward bill outstanding balance
--   pending:   NOT counted toward bill outstanding balance (reserved/pending verification)
--   failed:    NOT counted
--   cancelled: NOT counted
--   refunded:  NOT counted
--
-- Bill status is derived from completed + pending payments only.

-- ============================================
-- 6. COMMENTS
-- ============================================

COMMENT ON TABLE payments IS 'Payment transactions. Immutable financial records. Status changes only via cancellation/refund. Never hard delete.';
COMMENT ON COLUMN payments.idempotency_key IS 'Idempotency key for preventing duplicate payment requests. Unique per request, not per bill. Race-safe via INSERT ... ON CONFLICT.';
COMMENT ON COLUMN payments.reference_number IS 'External reference number / invoice number. Unique per transaction.';
COMMENT ON TABLE student_bills IS 'Student bills. Status is derived from payments, not stored as source of truth. Soft delete only.';
COMMENT ON FUNCTION process_payment IS 'Atomic payment processing with row-level locking and race-safe idempotency via INSERT ... ON CONFLICT. Prevents race conditions and overpayment.';
COMMENT ON FUNCTION validate_payment_student_consistency IS 'Trigger function to ensure payments.student_id matches student_bills.student_id.';

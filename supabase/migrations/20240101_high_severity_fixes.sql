-- PHASE 02A — STEP 2D: HIGH-SEVERITY DATABASE SAFETY FIXES
-- This migration addresses 3 HIGH-severity issues identified in STEP 2C:
--   1. Cross-school relationship validation
--   2. NULL uniqueness on student_bills
--   3. Payment idempotency
--
-- IMPORTANT:
-- - This migration assumes the base schema from STEP 2B/2C has already been applied.
-- - Run this only after verifying no duplicate data exists that would violate the new constraints.
-- - This migration is idempotent where possible (uses IF NOT EXISTS).

-- ============================================
-- 1. CROSS-SCHOOL RELATIONSHIP ENFORCEMENT
-- ============================================

-- Ensure parent tables have UNIQUE (id, school_id) so composite FKs can reference them.
-- These are safe to run multiple times.

ALTER TABLE students DROP CONSTRAINT IF EXISTS uq_students_id_school;
ALTER TABLE students ADD CONSTRAINT uq_students_id_school UNIQUE (id, school_id);

ALTER TABLE classes DROP CONSTRAINT IF EXISTS uq_classes_id_school;
ALTER TABLE classes ADD CONSTRAINT uq_classes_id_school UNIQUE (id, school_id);

ALTER TABLE academic_years DROP CONSTRAINT IF EXISTS uq_academic_years_id_school;
ALTER TABLE academic_years ADD CONSTRAINT uq_academic_years_id_school UNIQUE (id, school_id);

ALTER TABLE payment_categories DROP CONSTRAINT IF EXISTS uq_payment_categories_id_school;
ALTER TABLE payment_categories ADD CONSTRAINT uq_payment_categories_id_school UNIQUE (id, school_id);

ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS uq_student_enrollments_id_school;
ALTER TABLE student_enrollments ADD CONSTRAINT uq_student_enrollments_id_school UNIQUE (id, school_id);

-- Composite FK: student_enrollments -> students (ensures enrollment belongs to same school as student)
ALTER TABLE student_enrollments DROP CONSTRAINT IF EXISTS fk_student_enrollments_student_school;
ALTER TABLE student_enrollments ADD CONSTRAINT fk_student_enrollments_student_school
  FOREIGN KEY (student_id, school_id)
  REFERENCES students(id, school_id)
  ON DELETE CASCADE;

-- Composite FK: student_bills -> students (ensures bill belongs to same school as student)
ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS fk_student_bills_student_school;
ALTER TABLE student_bills ADD CONSTRAINT fk_student_bills_student_school
  FOREIGN KEY (student_id, school_id)
  REFERENCES students(id, school_id)
  ON DELETE CASCADE;

-- Composite FK: student_bills -> student_enrollments (ensures bill enrollment belongs to same school)
ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS fk_student_bills_enrollment_school;
ALTER TABLE student_bills ADD CONSTRAINT fk_student_bills_enrollment_school
  FOREIGN KEY (student_enrollment_id, school_id)
  REFERENCES student_enrollments(id, school_id)
  ON DELETE SET NULL;

-- Composite FK: payments -> student_bills (ensures payment belongs to same school as bill)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_bill_school;
ALTER TABLE payments ADD CONSTRAINT fk_payments_bill_school
  FOREIGN KEY (student_bill_id, school_id)
  REFERENCES student_bills(id, school_id)
  ON DELETE RESTRICT;

-- Composite FK: payments -> students (ensures payment student matches bill student's school)
ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_student_school;
ALTER TABLE payments ADD CONSTRAINT fk_payments_student_school
  FOREIGN KEY (student_id, school_id)
  REFERENCES students(id, school_id)
  ON DELETE CASCADE;

-- Composite FK: bill_templates -> classes (ensures template class belongs to same school)
ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS fk_bill_templates_class_school;
ALTER TABLE bill_templates ADD CONSTRAINT fk_bill_templates_class_school
  FOREIGN KEY (class_id, school_id)
  REFERENCES classes(id, school_id)
  ON DELETE SET NULL;

-- Composite FK: bill_templates -> students (ensures template student belongs to same school)
ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS fk_bill_templates_student_school;
ALTER TABLE bill_templates ADD CONSTRAINT fk_bill_templates_student_school
  FOREIGN KEY (student_id, school_id)
  REFERENCES students(id, school_id)
  ON DELETE CASCADE;

-- Composite FK: student_bills -> payment_categories (ensures category belongs to same school)
ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS fk_student_bills_category_school;
ALTER TABLE student_bills ADD CONSTRAINT fk_student_bills_category_school
  FOREIGN KEY (payment_category_id, school_id)
  REFERENCES payment_categories(id, school_id)
  ON DELETE CASCADE;

-- Composite FK: bill_templates -> payment_categories (ensures category belongs to same school)
ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS fk_bill_templates_category_school;
ALTER TABLE bill_templates ADD CONSTRAINT fk_bill_templates_category_school
  FOREIGN KEY (payment_category_id, school_id)
  REFERENCES payment_categories(id, school_id)
  ON DELETE CASCADE;

-- ============================================
-- 2. STUDENT BILL UNIQUENESS (NULL-safe)
-- ============================================

-- Partial unique index for RECURRING bills (period is NOT NULL)
-- Prevents duplicate SPP bills for same student/category/period
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_bill_period
  ON student_bills (student_id, payment_category_id, billing_period_start, billing_period_end)
  WHERE billing_period_start IS NOT NULL
    AND billing_period_end IS NOT NULL;

-- Partial unique index for ONE-TIME bills (period is NULL)
-- Uses bill_template_id as business key for one-time bills
-- If one-time bills can exist without template, adjust business key accordingly
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_bill_onetime
  ON student_bills (student_id, payment_category_id, bill_template_id)
  WHERE billing_period_start IS NULL
    AND billing_period_end IS NULL;

-- ============================================
-- 3. PAYMENT IDEMPOTENCY
-- ============================================

-- Add idempotency_key column to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Unique index for idempotency_key (only for non-null values)
-- This prevents duplicate payments from the same request
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================
-- 4. CHECK CONSTRAINTS
-- ============================================

-- Bill template scope: exactly one of class_id or student_id must be set
ALTER TABLE bill_templates DROP CONSTRAINT IF EXISTS chk_bill_template_scope;
ALTER TABLE bill_templates ADD CONSTRAINT chk_bill_template_scope
  CHECK (
    (class_id IS NOT NULL AND student_id IS NULL)
    OR (class_id IS NULL AND student_id IS NOT NULL)
  );

-- Bill amount must be non-negative
ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS chk_bill_amount;
ALTER TABLE student_bills ADD CONSTRAINT chk_bill_amount
  CHECK (amount >= 0);

-- Recurring bill validation
ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS chk_recurring_period;
ALTER TABLE student_bills ADD CONSTRAINT chk_recurring_period
  CHECK (
    (is_recurring = true AND billing_period_start IS NOT NULL AND billing_period_end IS NOT NULL AND billing_period_start <= billing_period_end)
    OR (is_recurring = false AND billing_period_start IS NULL AND billing_period_end IS NULL)
  );

-- Payment amount must be positive
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_amount;
ALTER TABLE payments ADD CONSTRAINT chk_payment_amount
  CHECK (amount > 0);

-- Bill status enum
ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS chk_bill_status;
ALTER TABLE student_bills ADD CONSTRAINT chk_bill_status
  CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled'));

-- Payment status enum
ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE payments ADD CONSTRAINT chk_payment_status
  CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded'));

-- ============================================
-- 5. PROCESS_PAYMENT FUNCTION (FINAL SAFE VERSION)
-- ============================================

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
  v_existing_payment_id uuid;
BEGIN
  -- 1. Check idempotency first (before any locks)
  -- This prevents duplicate payments from the same request
  SELECT id INTO v_existing_payment_id
  FROM payments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_payment_id IS NOT NULL THEN
    RETURN v_existing_payment_id;
  END IF;

  -- 2. Lock bill row (main concurrency control)
  SELECT * INTO v_bill
  FROM student_bills
  WHERE id = p_student_bill_id
  FOR UPDATE;

  -- 3. Validate bill is payable
  IF v_bill.status IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'Bill is not payable. Current status: %', v_bill.status;
  END IF;

  -- 4. Calculate valid paid amount (completed + pending)
  -- No FOR UPDATE here because student_bills row is already locked
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE student_bill_id = p_student_bill_id
    AND status IN ('completed', 'pending');

  -- 5. Prevent overpayment
  IF v_total_paid + p_amount > v_bill.amount THEN
    RAISE EXCEPTION 'Overpayment not allowed. Bill amount: %, Current paid: %, Requested: %',
      v_bill.amount, v_total_paid, p_amount;
  END IF;

  -- 6. Insert payment
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
  ) RETURNING id INTO v_payment_id;

  -- 7. Update bill status
  IF v_total_paid + p_amount >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid + p_amount > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE student_bills
  SET status = v_new_status, updated_at = now()
  WHERE id = p_student_bill_id;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. HELPER FUNCTION: RECALCULATE BILL STATUS
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
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE payments IS 'Payment transactions. Immutable financial records. Status changes only via cancellation/refund.';
COMMENT ON COLUMN payments.idempotency_key IS 'Idempotency key for preventing duplicate payment requests. Unique per request, not per bill.';
COMMENT ON COLUMN payments.reference_number IS 'External reference number / invoice number. Unique per transaction.';
COMMENT ON TABLE student_bills IS 'Student bills. Status is derived from payments, not stored as source of truth.';
COMMENT ON FUNCTION process_payment IS 'Atomic payment processing with row-level locking. Prevents race conditions and overpayment.';

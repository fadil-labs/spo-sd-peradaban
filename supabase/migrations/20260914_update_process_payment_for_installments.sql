-- Update process_payment to support installment plans
-- This migration updates the process_payment RPC to handle installment logic

CREATE OR REPLACE FUNCTION public.process_payment(
  p_student_bill_id uuid,
  p_amount numeric(15,2),
  p_payment_method_id uuid,
  p_school_payment_method_id uuid,
  p_reference_number text,
  p_idempotency_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill record;
  v_total_paid numeric(15,2);
  v_new_status text;
  v_payment_id uuid;
  v_existing_payment record;
  v_user_school_id uuid;
  v_installment_plan jsonb;
  v_installment_amount numeric(15,2);
  v_current_installment int;
  v_total_installments int;
  v_paid_installments int[];
  v_installment_number int;
  v_next_due_date text;
BEGIN
  -- Get current user's school_id
  SELECT public.current_user_school_id() INTO v_user_school_id;

  -- 1. Check idempotency first (before any locks)
  SELECT id INTO v_payment_id
  FROM payments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_payment_id IS NOT NULL THEN
    RETURN v_payment_id;
  END IF;

  -- 2. Lock bill row (main concurrency control)
  SELECT * INTO v_bill
  FROM student_bills
  WHERE id = p_student_bill_id
  FOR UPDATE;

  -- 3. Validate tenant: user can only process payments for their own school
  IF v_bill.school_id != v_user_school_id THEN
    RAISE EXCEPTION 'Cross-school payment not allowed. Bill school: %, User school: %',
      v_bill.school_id, v_user_school_id;
  END IF;

  -- 4. Validate bill is payable
  IF v_bill.status IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'Bill is not payable. Current status: %', v_bill.status;
  END IF;

  -- 5. Installment validation
  -- Get installment plan from bill (if exists)
  SELECT installment_plan INTO v_installment_plan
  FROM student_bills
  WHERE id = p_student_bill_id;

  IF v_installment_plan IS NOT NULL THEN
    -- Extract installment info
    v_total_installments := (v_installment_plan->>'total_installments')::int;
    v_installment_amount := (v_installment_plan->>'installment_amount')::numeric(15,2);
    v_current_installment := (v_installment_plan->>'current_installment')::int;
    v_paid_installments := ARRAY(SELECT jsonb_array_elements_text(v_installment_plan->'paid_installments')::int);

    -- Validate installment amount
    IF p_amount != v_installment_amount THEN
      RAISE EXCEPTION 'Installment amount must be exactly Rp%.2f for installment %. Current: Rp%.2f',
        v_installment_amount, v_current_installment, p_amount;
    END IF;

    -- Validate installment number
    IF v_current_installment > v_total_installments THEN
      RAISE EXCEPTION 'All installments have been paid.';
    END IF;

    -- Check if this installment is already paid
    IF v_current_installment = ANY(v_paid_installments) THEN
      RAISE EXCEPTION 'Installment %. has already been paid.', v_current_installment;
    END IF;
  END IF;

  -- 6. Try to insert payment with ON CONFLICT for race-safe idempotency
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

  -- 7. If insert succeeded, update bill status and installment plan
  IF v_payment_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE student_bill_id = p_student_bill_id
      AND status IN ('completed', 'pending');

    IF v_total_paid >= v_bill.amount THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Update installment plan if applicable
    IF v_installment_plan IS NOT NULL THEN
      -- Mark current installment as paid
      v_paid_installments := array_append(v_paid_installments, v_current_installment);
      
      -- Move to next installment
      IF v_current_installment < v_total_installments THEN
        v_current_installment := v_current_installment + 1;
      END IF;

      -- Update installment plan
      UPDATE student_bills
      SET 
        installment_plan = jsonb_set(
          jsonb_set(v_installment_plan, '{paid_installments}', to_jsonb(v_paid_installments)),
          '{current_installment}', to_jsonb(v_current_installment)
        ),
        status = v_new_status,
        updated_at = now()
      WHERE id = p_student_bill_id;
    ELSE
      -- No installment plan, just update status
      UPDATE student_bills
      SET status = v_new_status, updated_at = now()
      WHERE id = p_student_bill_id;
    END IF;

    RETURN v_payment_id;
  END IF;

  -- 8. If conflict occurred, get existing payment and validate payload
  SELECT * INTO v_existing_payment
  FROM payments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_payment.id IS NULL THEN
    RAISE EXCEPTION 'Idempotency key not found after conflict - this should not happen';
  END IF;

  -- Validate payload matches
  IF v_existing_payment.student_bill_id != p_student_bill_id
    OR v_existing_payment.amount != p_amount
    OR v_existing_payment.payment_method_id != p_payment_method_id
    OR v_existing_payment.school_payment_method_id != p_school_payment_method_id THEN
    RAISE EXCEPTION 'Idempotency key already used with different payment parameters';
  END IF;

  RETURN v_existing_payment.id;
END;
$$;

COMMENT ON FUNCTION public.process_payment IS 'Atomic payment processing with row-level locking, race-safe idempotency, tenant validation, and installment plan support.';

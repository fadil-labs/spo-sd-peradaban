-- PHASE PAYMENT FIX — FINALIZE PENDING PAYMENT
-- This migration creates a new stored procedure that updates
-- a pending payment to completed and updates the related
-- student_bill status accordingly.

CREATE OR REPLACE FUNCTION public.finalize_pending_payment(
  p_idempotency_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment record;
  v_bill record;
  v_total_paid numeric(15,2);
  v_new_status text;
BEGIN
  -- Find pending payment by idempotency key
  SELECT * INTO v_payment
  FROM payments
  WHERE idempotency_key = p_idempotency_key
    AND status = 'pending'
  LIMIT 1;

  IF v_payment.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get bill info
  SELECT * INTO v_bill
  FROM student_bills
  WHERE id = v_payment.student_bill_id
  FOR UPDATE;

  -- Update payment to completed
  UPDATE payments
  SET status = 'completed', payment_date = now()
  WHERE id = v_payment.id;

  -- Calculate total paid for this bill
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE student_bill_id = v_bill.id
    AND status IN ('completed', 'pending');

  -- Determine new bill status
  IF v_total_paid >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- Update bill status
  UPDATE student_bills
  SET status = v_new_status, updated_at = now()
  WHERE id = v_bill.id;

  RETURN v_payment.id;
END;
$$;

COMMENT ON FUNCTION public.finalize_pending_payment IS 'Finalizes a pending payment and updates the related student bill status.';

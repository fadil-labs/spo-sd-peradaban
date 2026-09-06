-- PHASE 06 — STEP 5M: FINANCIAL CONTROLS
-- This migration creates the financial audit trail, payment immutability protections,
-- and status transition controls. It does NOT modify the existing payment engine.

-- ============================================
-- 1. FINANCIAL_AUDIT_LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  actor_profile_id uuid,
  actor_role text,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payment_id uuid,
  student_bill_id uuid,
  old_status text,
  new_status text,
  amount numeric(15,2),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. CONSTRAINTS
-- ============================================

-- Action type enum
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS chk_financial_audit_action_type;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT chk_financial_audit_action_type
  CHECK (action_type IN (
    'payment_created',
    'payment_completed',
    'payment_failed',
    'payment_cancelled',
    'payment_refunded',
    'payment_proof_submitted',
    'payment_proof_approved',
    'payment_proof_rejected',
    'gateway_transaction_created',
    'gateway_transaction_succeeded',
    'gateway_transaction_failed',
    'bill_created',
    'bill_status_changed',
    'payment_method_toggled',
    'financial_config_changed',
    'other'
  ));

-- Entity type enum
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS chk_financial_audit_entity_type;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT chk_financial_audit_entity_type
  CHECK (entity_type IN (
    'payment',
    'student_bill',
    'payment_proof',
    'payment_gateway_transaction',
    'school_payment_method',
    'payment_category',
    'financial_report',
    'other'
  ));

-- Amount must be non-negative if provided
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS chk_financial_audit_amount;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT chk_financial_audit_amount
  CHECK (amount IS NULL OR amount >= 0);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_school_id
  ON public.financial_audit_logs (school_id);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_created_at
  ON public.financial_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_action_type
  ON public.financial_audit_logs (action_type);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_entity_type
  ON public.financial_audit_logs (entity_type);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_payment_id
  ON public.financial_audit_logs (payment_id);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_student_bill_id
  ON public.financial_audit_logs (student_bill_id);

CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_actor_profile_id
  ON public.financial_audit_logs (actor_profile_id);

-- Composite index for common query pattern: school + created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_school_created
  ON public.financial_audit_logs (school_id, created_at DESC, id DESC);

-- ============================================
-- 4. FOREIGN KEYS (SAFE DELETE BEHAVIOR)
-- ============================================

-- financial_audit_logs -> schools (school_id)
-- Do NOT use CASCADE. If school is deleted, audit records should remain but school_id becomes orphaned.
-- In practice, schools should not be deleted. Use RESTRICT to prevent accidental school deletion.
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS fk_financial_audit_logs_school;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT fk_financial_audit_logs_school
  FOREIGN KEY (school_id)
  REFERENCES public.schools(id)
  ON DELETE RESTRICT;

-- financial_audit_logs -> payments (payment_id)
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS fk_financial_audit_logs_payment;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT fk_financial_audit_logs_payment
  FOREIGN KEY (payment_id)
  REFERENCES public.payments(id)
  ON DELETE SET NULL;

-- financial_audit_logs -> student_bills (student_bill_id)
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS fk_financial_audit_logs_student_bill;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT fk_financial_audit_logs_student_bill
  FOREIGN KEY (student_bill_id)
  REFERENCES public.student_bills(id)
  ON DELETE SET NULL;

-- financial_audit_logs -> profiles (actor_profile_id)
ALTER TABLE public.financial_audit_logs DROP CONSTRAINT IF EXISTS fk_financial_audit_logs_actor;
ALTER TABLE public.financial_audit_logs ADD CONSTRAINT fk_financial_audit_logs_actor
  FOREIGN KEY (actor_profile_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin/bendahara can view financial audit logs for their school
CREATE POLICY "financial_audit_logs_select_school"
  ON public.financial_audit_logs FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- orang_tua MUST NOT have any direct SELECT/INSERT/UPDATE/DELETE policy
-- All inserts go through the controlled SECURITY DEFINER function

-- ============================================
-- 6. CONTROLLED AUDIT WRITE FUNCTION (SECURITY DEFINER)
-- ============================================

-- This function allows authorized users to create audit events without
-- granting direct table INSERT access. It derives identity server-side
-- from auth.uid() and validates school membership.
-- NOTE: actor_profile_id and actor_role are derived from auth.uid() and
-- the profiles table. Any client-provided values for these fields are IGNORED.
CREATE OR REPLACE FUNCTION public.create_financial_audit_event(
  p_action_type text,
  p_entity_type text,
  p_school_id uuid,
  p_entity_id uuid DEFAULT NULL,
  p_payment_id uuid DEFAULT NULL,
  p_student_bill_id uuid DEFAULT NULL,
  p_old_status text DEFAULT NULL,
  p_new_status text DEFAULT NULL,
  p_amount numeric(15,2) DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_audit_id uuid;
BEGIN
  -- Derive authenticated identity server-side; never trust client-provided identity
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no authenticated user';
  END IF;

  -- Load profile to get role and validate school membership
  SELECT school_id, role INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR SHARE;

  IF v_profile IS NULL OR v_profile.school_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found or incomplete';
  END IF;

  -- Validate school membership
  IF v_profile.school_id != p_school_id THEN
    RAISE EXCEPTION 'Cross-school audit not allowed. User school: %, Requested school: %',
      v_profile.school_id, p_school_id;
  END IF;

  -- Insert audit event with server-derived identity only
  INSERT INTO public.financial_audit_logs (
    school_id,
    actor_profile_id,
    actor_role,
    action_type,
    entity_type,
    entity_id,
    payment_id,
    student_bill_id,
    old_status,
    new_status,
    amount,
    metadata
  ) VALUES (
    p_school_id,
    v_user_id,
    v_profile.role,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_payment_id,
    p_student_bill_id,
    p_old_status,
    p_new_status,
    p_amount,
    p_metadata
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Grant EXECUTE to all authenticated users
-- The function itself enforces identity derivation and school validation
GRANT EXECUTE ON FUNCTION public.create_financial_audit_event(
  text, text, uuid, uuid, uuid, uuid, text, text, numeric(15,2), jsonb
) TO authenticated;

-- ============================================
-- 7. APPEND-ONLY PROTECTION (TRIGGER)
-- ============================================

-- Prevent UPDATE and DELETE on financial_audit_logs
CREATE OR REPLACE FUNCTION public.prevent_financial_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Financial audit logs are immutable. UPDATE/DELETE is not allowed.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_financial_audit_update ON public.financial_audit_logs;
CREATE TRIGGER trg_prevent_financial_audit_update
  BEFORE UPDATE ON public.financial_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_financial_audit_mutation();

DROP TRIGGER IF EXISTS trg_prevent_financial_audit_delete ON public.financial_audit_logs;
CREATE TRIGGER trg_prevent_financial_audit_delete
  BEFORE DELETE ON public.financial_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_financial_audit_mutation();

-- ============================================
-- 8. PAYMENT IMMUTABILITY PROTECTION
-- ============================================

-- Prevent updates to completed payments' critical fields
CREATE OR REPLACE FUNCTION public.prevent_completed_payment_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only prevent mutation of completed payments
  IF OLD.status = 'completed' AND NEW.status = 'completed' THEN
    -- Check if any immutable fields are being changed
    IF (
      OLD.amount != NEW.amount
      OR OLD.student_bill_id != NEW.student_bill_id
      OR OLD.student_id != NEW.student_id
      OR OLD.school_id != NEW.school_id
      OR OLD.payment_method_id != NEW.payment_method_id
      OR OLD.school_payment_method_id != NEW.school_payment_method_id
      OR OLD.reference_number != NEW.reference_number
      OR OLD.idempotency_key != NEW.idempotency_key
      OR OLD.payment_date != NEW.payment_date
    ) THEN
      RAISE EXCEPTION 'Cannot modify completed payment. Payment ID: %', OLD.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_completed_payment_mutation ON public.payments;
CREATE TRIGGER trg_prevent_completed_payment_mutation
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_completed_payment_mutation();

-- ============================================
-- 9. PAYMENT STATUS TRANSITION VALIDATION
-- ============================================

-- Valid transitions:
-- pending -> completed (process_payment)
-- pending -> failed (gateway failure)
-- pending -> cancelled (admin cancel)
-- completed -> refunded (refund)
-- completed -> cancelled (admin cancel with refund logic)
-- failed -> pending (retry)
-- failed -> cancelled (admin cancel)
-- cancelled -> (no transitions - terminal state)
-- refunded -> (no transitions - terminal state)

CREATE OR REPLACE FUNCTION public.validate_payment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status hasn't changed, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  IF OLD.status = 'pending' AND NEW.status IN ('completed', 'failed', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'completed' AND NEW.status IN ('refunded', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'failed' AND NEW.status IN ('pending', 'cancelled') THEN
    RETURN NEW;
  ELSIF OLD.status = 'cancelled' OR OLD.status = 'refunded' THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %. Terminal state cannot be changed.', OLD.status, NEW.status;
  ELSE
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_status_transition ON public.payments;
CREATE TRIGGER trg_validate_payment_status_transition
  BEFORE UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_payment_status_transition();

-- ============================================
-- 10. REVOKE DIRECT DML ON FINANCIAL_AUDIT_LOGS
-- ============================================

-- Revoke all direct DML from authenticated
REVOKE INSERT, UPDATE, DELETE ON public.financial_audit_logs FROM authenticated;

-- Do NOT grant direct INSERT back
-- All inserts must go through create_financial_audit_event() SECURITY DEFINER function

-- ============================================
-- 11. COMMENTS
-- ============================================

COMMENT ON TABLE public.financial_audit_logs IS 'Immutable financial audit trail. All financial administrative actions are recorded here.';
COMMENT ON COLUMN public.financial_audit_logs.action_type IS 'Type of financial action: payment_created, payment_completed, payment_cancelled, etc.';
COMMENT ON COLUMN public.financial_audit_logs.amount IS 'Financial amount associated with the event, if applicable.';
COMMENT ON COLUMN public.financial_audit_logs.old_status IS 'Previous status for status change events.';
COMMENT ON COLUMN public.financial_audit_logs.new_status IS 'New status for status change events.';
COMMENT ON COLUMN public.financial_audit_logs.metadata IS 'Additional context as JSONB. Never store secrets.';
COMMENT ON FUNCTION public.create_financial_audit_event IS 'SECURITY DEFINER function for creating financial audit events. Derives identity from auth.uid(). Validates school membership.';

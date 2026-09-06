-- PHASE 05 — STEP 5H: PAYMENT GATEWAY FOUNDATION
-- This migration adds payment_gateway_transactions for provider-agnostic
-- gateway tracking and webhook processing.
--
-- IMPORTANT:
-- - This migration is idempotent where possible.
-- - Does NOT deploy to production.
-- - Existing payment engine, proofs, and financial FKs are unchanged.

-- ============================================
-- 1. PAYMENT GATEWAY TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_gateway_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  payment_id uuid,
  provider text NOT NULL,
  external_order_id text NOT NULL,
  external_transaction_id text,
  provider_status text NOT NULL DEFAULT 'pending',
  payment_method_type text,
  qr_code_url text,
  expires_at timestamptz,
  raw_payload jsonb,
  webhook_received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 2. CONSTRAINTS
-- ============================================

ALTER TABLE public.payment_gateway_transactions DROP CONSTRAINT IF EXISTS fk_payment_gateway_transactions_school;
ALTER TABLE public.payment_gateway_transactions ADD CONSTRAINT fk_payment_gateway_transactions_school
  FOREIGN KEY (school_id)
  REFERENCES public.schools(id)
  ON DELETE RESTRICT;

ALTER TABLE public.payment_gateway_transactions DROP CONSTRAINT IF EXISTS fk_payment_gateway_transactions_payment;
ALTER TABLE public.payment_gateway_transactions ADD CONSTRAINT fk_payment_gateway_transactions_payment
  FOREIGN KEY (payment_id)
  REFERENCES public.payments(id)
  ON DELETE RESTRICT;

ALTER TABLE public.payment_gateway_transactions DROP CONSTRAINT IF EXISTS chk_provider_status;
ALTER TABLE public.payment_gateway_transactions ADD CONSTRAINT chk_provider_status
  CHECK (provider_status IN ('pending', 'success', 'failed', 'cancelled', 'expired'));

-- ============================================
-- 3. UNIQUE / IDEMPOTENCY
-- ============================================

-- Prevent duplicate external order per provider.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_gateway_transactions_external_order
  ON public.payment_gateway_transactions (provider, external_order_id);

-- ============================================
-- 4. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_school_id
  ON public.payment_gateway_transactions (school_id);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_payment_id
  ON public.payment_gateway_transactions (payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_provider_status
  ON public.payment_gateway_transactions (provider_status);

CREATE INDEX IF NOT EXISTS idx_payment_gateway_transactions_created_at
  ON public.payment_gateway_transactions (created_at);

-- ============================================
-- 5. RLS
-- ============================================

ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;

-- Admin/bendahara: view own school gateway transactions
CREATE POLICY "payment_gateway_transactions_select_school"
  ON public.payment_gateway_transactions
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- Admin/bendahara: update own school gateway transactions for workflow operations
CREATE POLICY "payment_gateway_transactions_update_school"
  ON public.payment_gateway_transactions
  FOR UPDATE
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- Parent: view gateway transactions for their children's payments only
CREATE POLICY "payment_gateway_transactions_select_children"
  ON public.payment_gateway_transactions
  FOR SELECT
  TO authenticated
  USING (
    payment_id IN (
      SELECT id
      FROM public.payments
      WHERE student_id IN (
        SELECT student_id
        FROM public.student_guardians
        WHERE guardian_profile_id = auth.uid()
      )
    )
    AND public.current_user_role() = 'orang_tua'
  );

-- No DELETE policy for historical gateway transactions

-- ============================================
-- 6. COMMENTS
-- ============================================

COMMENT ON TABLE public.payment_gateway_transactions IS 'Payment gateway transaction records. Historical tracking for provider-agnostic payment intents and webhooks. Financial payments remain in payments table only.';
COMMENT ON INDEX uq_payment_gateway_transactions_external_order IS 'Prevents duplicate external order IDs per provider.';

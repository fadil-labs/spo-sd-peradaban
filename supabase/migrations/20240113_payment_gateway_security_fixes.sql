-- PHASE 05 — STEP 5H.2: PAYMENT GATEWAY SECURITY FIXES
-- This migration fixes critical security issues found in STEP 5H.1 audit.
--
-- IMPORTANT:
-- - This migration is idempotent where possible.
-- - Adds INSERT RLS policy for payment_gateway_transactions.
-- - Adds processing provider_status for atomic webhook handling.

-- ============================================
-- 1. UPDATE PROVIDER STATUS CHECK
-- ============================================

-- Add processing status to allowed provider_status values
ALTER TABLE public.payment_gateway_transactions DROP CONSTRAINT IF EXISTS chk_provider_status;
ALTER TABLE public.payment_gateway_transactions ADD CONSTRAINT chk_provider_status
  CHECK (provider_status IN ('pending', 'processing', 'success', 'failed', 'cancelled', 'expired'));

-- ============================================
-- 2. RLS INSERT POLICY
-- ============================================

-- Admin/bendahara: insert gateway transactions for own school
CREATE POLICY "payment_gateway_transactions_insert_school"
  ON public.payment_gateway_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 3. COMMENTS
-- ============================================

COMMENT ON TABLE public.payment_gateway_transactions IS 'Payment gateway transaction records. Historical tracking for provider-agnostic payment intents and webhooks. Financial payments remain in payments table only. processing state indicates payment is being processed via webhook.';

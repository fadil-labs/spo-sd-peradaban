-- PHASE 05 — STEP 5E: PAYMENT PROOF STATUS & TIMESTAMPS
-- This migration adds status and timestamp columns to payment_proofs
-- to support the payment proof workflow (pending/approved/rejected).
--
-- IMPORTANT:
-- - This migration is idempotent where possible.
-- - Does not modify RLS, payment engine, or storage configuration.

-- ============================================
-- 1. ADD STATUS COLUMN
-- ============================================

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Status enum validation
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS chk_payment_proof_status;
ALTER TABLE payment_proofs ADD CONSTRAINT chk_payment_proof_status
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- ============================================
-- 2. ADD TIMESTAMP COLUMNS
-- ============================================

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================
-- 3. ADD TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_payment_proof_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_proof_updated_at_trigger ON payment_proofs;

CREATE TRIGGER update_payment_proof_updated_at_trigger
  BEFORE UPDATE ON payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_proof_updated_at();

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON COLUMN payment_proofs.status IS 'Payment proof status: pending, approved, rejected.';
COMMENT ON COLUMN payment_proofs.created_at IS 'Timestamp when payment proof was uploaded.';
COMMENT ON COLUMN payment_proofs.updated_at IS 'Timestamp when payment proof was last updated (e.g., status change).';

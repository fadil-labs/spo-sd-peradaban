-- PHASE 05 — STEP 5F: PAYMENT PROOF VERIFICATION AUDIT TRAIL
-- This migration adds columns to payment_proofs to support the verification workflow:
-- rejection_reason, verified_by, verified_at
--
-- IMPORTANT:
-- - This migration is idempotent where possible.
-- - Does not modify RLS, payment engine, or storage configuration.

-- ============================================
-- 1. ADD VERIFICATION COLUMNS
-- ============================================

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS verified_by uuid;

ALTER TABLE payment_proofs
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- ============================================
-- 2. ADD CHECK CONSTRAINTS
-- ============================================

-- Rejection reason must be NULL for pending/approved, NOT NULL for rejected
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS chk_rejection_reason_required_for_rejected;
ALTER TABLE payment_proofs ADD CONSTRAINT chk_rejection_reason_required_for_rejected
  CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL AND rejection_reason::text <> '')
    OR (status <> 'rejected')
  );

-- Rejection reason must be NULL for approved
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS chk_rejection_reason_null_for_approved;
ALTER TABLE payment_proofs ADD CONSTRAINT chk_rejection_reason_null_for_approved
  CHECK (
    (status = 'approved' AND rejection_reason IS NULL)
    OR (status <> 'approved')
  );

-- verified_by must be NULL for pending
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS chk_verified_by_required_for_reviewed;
ALTER TABLE payment_proofs ADD CONSTRAINT chk_verified_by_required_for_reviewed
  CHECK (
    (status IN ('approved', 'rejected') AND verified_by IS NOT NULL)
    OR (status = 'pending')
  );

-- verified_at must be NULL for pending
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS chk_verified_at_required_for_reviewed;
ALTER TABLE payment_proofs ADD CONSTRAINT chk_verified_at_required_for_reviewed
  CHECK (
    (status IN ('approved', 'rejected') AND verified_at IS NOT NULL)
    OR (status = 'pending')
  );

-- ============================================
-- 3. ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payment_proofs_status
  ON payment_proofs (status);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_verified_by
  ON payment_proofs (verified_by);

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON COLUMN payment_proofs.rejection_reason IS 'Required when status is rejected. Must be non-empty.';
COMMENT ON COLUMN payment_proofs.verified_by IS 'Profile ID of admin/bendahara who verified the proof. NULL when status is pending.';
COMMENT ON COLUMN payment_proofs.verified_at IS 'Timestamp when proof was verified. NULL when status is pending.';

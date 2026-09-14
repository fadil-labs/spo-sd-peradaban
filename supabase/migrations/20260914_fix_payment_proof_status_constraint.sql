-- Fix payment_proofs status check constraint
-- There appears to be an old constraint payment_proofs_status_check that doesn't allow 'approved' status
-- This migration drops the old constraint and ensures the correct one exists

-- Drop old constraint if it exists
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS payment_proofs_status_check;

-- Ensure the correct constraint exists
ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS chk_payment_proof_status;
ALTER TABLE payment_proofs ADD CONSTRAINT chk_payment_proof_status
  CHECK (status IN ('pending', 'approved', 'rejected'));

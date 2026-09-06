-- PHASE 05 — STEP 5D.1D: PAYMENT PROOF FK INTEGRITY
-- This migration adds the missing foreign key constraint for payment_proofs.payment_id
-- to ensure referential integrity with payments.id.
--
-- IMPORTANT:
-- - This migration is idempotent where possible.
-- - ON DELETE RESTRICT prevents payments from being deleted while payment proofs exist.
-- - Does not modify RLS, payment engine, or application code.

-- ============================================
-- 1. DROP EXISTING CONSTRAINT IF ANY
-- ============================================

ALTER TABLE payment_proofs
  DROP CONSTRAINT IF EXISTS fk_payment_proofs_payment;

-- ============================================
-- 2. ADD PAYMENT_PROOF -> PAYMENT FK
-- ============================================

ALTER TABLE payment_proofs DROP CONSTRAINT IF EXISTS fk_payment_proofs_payment;
ALTER TABLE payment_proofs ADD CONSTRAINT fk_payment_proofs_payment
  FOREIGN KEY (payment_id)
  REFERENCES payments(id)
  ON DELETE RESTRICT;

-- ============================================
-- 3. VERIFICATION QUERIES
-- ============================================
--
-- Verify the constraint exists:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'fk_payment_proofs_payment';
--
-- Verify ON DELETE RESTRICT:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'fk_payment_proofs_payment'
--   AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%';
--
-- Verify no orphan payment proofs:
-- SELECT pp.id
-- FROM payment_proofs pp
-- LEFT JOIN payments p ON p.id = pp.payment_id
-- WHERE p.id IS NULL;

-- ============================================
-- 4. COMMENTS
-- ============================================

COMMENT ON CONSTRAINT fk_payment_proofs_payment ON payment_proofs IS 'Ensures payment proof always references an existing payment. Prevents orphan payment proofs and protects payments from deletion while proofs exist.';

-- PHASE 07 — STEP 2.5C.3: REMOVE DUPLICATE FOREIGN KEYS
-- This migration removes duplicate foreign key constraints that cause
-- PostgREST PGRST201 errors on nested joins.
--
-- Root cause:
--   payment_proofs_payment_id_fkey duplicates fk_payment_proofs_payment
--   payments_student_bill_id_fkey duplicates fk_payments_bill_school
--
-- IMPORTANT:
-- - This migration ONLY drops redundant constraints.
-- - It does NOT modify data, RLS, functions, or application code.
-- - It preserves the explicitly hardened constraints from later migrations.

-- ============================================
-- 1. DROP DUPLICATE: payment_proofs -> payments
-- ============================================
-- Base schema (20240100_base_schema.sql) created:
--   payment_proofs_payment_id_fkey
--   payment_id -> payments(id) ON DELETE CASCADE
--
-- Later hardening (20240109_payment_proof_payment_fk.sql) created:
--   fk_payment_proofs_payment
--   payment_id -> payments(id) ON DELETE RESTRICT
--
-- Keep: fk_payment_proofs_payment (RESTRICT protects payments from deletion)
-- Drop: payment_proofs_payment_id_fkey (CASCADE, redundant)

ALTER TABLE public.payment_proofs
  DROP CONSTRAINT IF EXISTS payment_proofs_payment_id_fkey;

-- ============================================
-- 2. DROP DUPLICATE: payments -> student_bills
-- ============================================
-- Base schema (20240100_base_schema.sql) created:
--   payments_student_bill_id_fkey
--   student_bill_id -> student_bills(id) ON DELETE RESTRICT
--
-- Later hardening (20240101_high_severity_fixes.sql) created:
--   fk_payments_bill_school
--   (student_bill_id, school_id) -> student_bills(id, school_id) ON DELETE RESTRICT
--
-- Keep: fk_payments_bill_school (composite FK enforces cross-school integrity)
-- Drop: payments_student_bill_id_fkey (simple, redundant with composite)

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_student_bill_id_fkey;

-- ============================================
-- 3. COMMENTS
-- ============================================

COMMENT ON CONSTRAINT fk_payment_proofs_payment ON public.payment_proofs IS 'Ensures payment proof always references an existing payment. Prevents orphan payment proofs and protects payments from deletion while proofs exist.';

COMMENT ON CONSTRAINT fk_payments_bill_school ON public.payments IS 'Composite FK ensuring payment belongs to same school as its bill. Prevents cross-school payment assignment.';

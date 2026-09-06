-- PHASE 05 — STEP 5D.1C: FINANCIAL CASCADE DELETE PROTECTION
-- This migration changes the ON DELETE behavior for student_bills.payment_category_id
-- from CASCADE to RESTRICT to prevent accidental deletion of financial records
-- when a payment category is deleted.
--
-- IMPORTANT:
-- - This migration is idempotent where possible.
-- - bill_templates.payment_category_id remains ON DELETE CASCADE (templates are not financial records).

-- ============================================
-- 1. DROP EXISTING CASCADE FK
-- ============================================

ALTER TABLE student_bills
  DROP CONSTRAINT IF EXISTS fk_student_bills_category_school;

-- ============================================
-- 2. ADD RESTRICT FK
-- ============================================

ALTER TABLE student_bills DROP CONSTRAINT IF EXISTS fk_student_bills_category_restrict;
ALTER TABLE student_bills ADD CONSTRAINT fk_student_bills_category_restrict
  FOREIGN KEY (payment_category_id, school_id)
  REFERENCES payment_categories(id, school_id)
  ON DELETE RESTRICT;

-- ============================================
-- 3. PRESERVE BILL_TEMPLATES CASCADE
-- ============================================
--
-- bill_templates.payment_category_id -> payment_categories(id, school_id) ON DELETE CASCADE
-- is intentionally preserved because bill_templates are configuration/template data,
-- not historical financial records.

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================
--
-- Verify the new constraint exists:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'fk_student_bills_category_restrict';
--
-- Verify ON DELETE RESTRICT:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'fk_student_bills_category_restrict'
--   AND pg_get_constraintdef(oid) LIKE '%ON DELETE RESTRICT%';
--
-- Verify old constraint is gone:
-- SELECT conname
-- FROM pg_constraint
-- WHERE conname = 'fk_student_bills_category_school';

-- ============================================
-- 5. COMMENTS
-- ============================================

COMMENT ON CONSTRAINT fk_student_bills_category_restrict ON student_bills IS 'Prevents deletion of payment categories that are referenced by student bills. Financial records must not be cascade-deleted.';

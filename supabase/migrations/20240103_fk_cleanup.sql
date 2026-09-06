-- PHASE 03 — STEP 3B: DATABASE FK CLEANUP & RE-VERIFICATION
-- This migration drops conflicting composite foreign keys that were added
-- in 20240101_high_severity_fixes.sql and are now superseded by simpler
-- FKs with safer ON DELETE behavior from 20240102_production_hardening.sql.
--
-- This migration is idempotent: all DROP statements use IF EXISTS.

-- ============================================
-- 1. DROP CONFLICTING COMPOSITE FKs FROM 20240101
-- ============================================

-- Drop composite FK: payments.student_id + school_id -> students
-- Superseded by: payments.student_id -> students(id) ON DELETE RESTRICT
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS fk_payments_student_school;

-- Drop composite FK: student_bills.student_id + school_id -> students
-- Superseded by: student_bills.student_id -> students(id) ON DELETE RESTRICT
ALTER TABLE student_bills
  DROP CONSTRAINT IF EXISTS fk_student_bills_student_school;

-- Drop composite FK: student_enrollments.student_id + school_id -> students
-- Superseded by: student_enrollments.student_id -> students(id) ON DELETE RESTRICT
ALTER TABLE student_enrollments
  DROP CONSTRAINT IF EXISTS fk_student_enrollments_student_school;

-- Drop composite FK: bill_templates.student_id + school_id -> students
-- Superseded by: bill_templates.student_id -> students(id) ON DELETE SET NULL
ALTER TABLE bill_templates
  DROP CONSTRAINT IF EXISTS fk_bill_templates_student_school;

-- ============================================
-- 2. PRESERVE CROSS-SCHOOL INTEGRITY
-- ============================================
--
-- The following composite FKs are PRESERVED because they enforce
-- cross-school consistency without conflicting with delete policy:
--
-- - student_enrollments(student_id, school_id) -> students(id, school_id) ON DELETE CASCADE
-- - student_bills(student_id, school_id) -> students(id, school_id) ON DELETE CASCADE
-- - student_bills(student_enrollment_id, school_id) -> student_enrollments(id, school_id) ON DELETE SET NULL
-- - payments(student_bill_id, school_id) -> student_bills(id, school_id) ON DELETE RESTRICT
-- - bill_templates(class_id, school_id) -> classes(id, school_id) ON DELETE SET NULL
-- - student_bills(payment_category_id, school_id) -> payment_categories(id, school_id) ON DELETE CASCADE
-- - bill_templates(payment_category_id, school_id) -> payment_categories(id, school_id) ON DELETE CASCADE
--
-- Cross-school consistency for student_bills is also enforced by:
-- - trigger validate_payment_student_consistency() on payments
-- - composite FK: payments(student_bill_id, school_id) -> student_bills(id, school_id)
--
-- No additional triggers or constraints are needed.

-- ============================================
-- 3. FINAL DELETE POLICY SUMMARY
-- ============================================
--
-- Table                    Column               References              ON DELETE
-- ----------------------   ------------------   ----------------------  ----------
-- payments                 student_id           students(id)            RESTRICT
-- student_bills            student_id           students(id)            RESTRICT
-- student_enrollments      student_id           students(id)            RESTRICT
-- bill_templates           student_id           students(id)            SET NULL
-- payment_proofs           payment_id           payments(id)             CASCADE
-- audit_logs               school_id            schools(id)              CASCADE
--
-- Financial history (payments, student_bills, audit_logs) is protected
-- from accidental deletion via RESTRICT or immutability.

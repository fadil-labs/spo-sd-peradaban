-- PHASE 05 — STEP 5A: ACADEMIC FOUNDATION DATABASE HARDENING
-- This migration adds required constraints and indexes for school & academic foundation.
--
-- IMPORTANT:
-- - Assumes base schema and previous migrations have been applied.
-- - Idempotent where possible (uses IF NOT EXISTS).
-- - Does NOT deploy to production.

-- ============================================
-- 1. ACADEMIC YEAR ACTIVE PER SCHOOL
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_year_active_per_school
  ON academic_years (school_id)
  WHERE is_active = true;

-- ============================================
-- 2. CLASS NAME UNIQUENESS WITHIN SCHOOL + YEAR
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_name_per_school_year
  ON classes (school_id, academic_year_id, name);

-- ============================================
-- 3. STUDENT NIS UNIQUENESS WITHIN SCHOOL
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_nis_per_school
  ON students (school_id, nis)
  WHERE nis IS NOT NULL;

-- ============================================
-- 4. STUDENT ENROLLMENT UNIQUENESS
-- ============================================

-- Prevent duplicate enrollment for same student in same academic year
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_enrollment_per_year
  ON student_enrollments (student_id, academic_year_id);

-- ============================================
-- 5. STUDENT GUARDIAN UNIQUENESS
-- ============================================

-- Prevent duplicate guardian relationship
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_guardian
  ON student_guardians (guardian_profile_id, student_id);

-- ============================================
-- 6. TENANT CONSISTENCY FOR ENROLLMENTS
-- ============================================

-- Ensure student_enrollments.student_id matches student.school_id
CREATE OR REPLACE FUNCTION public.validate_enrollment_school_consistency()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NOT NULL THEN
    IF NEW.school_id != (SELECT school_id FROM public.students WHERE id = NEW.student_id) THEN
      RAISE EXCEPTION 'student_enrollments.school_id does not match students.school_id';
    END IF;
  END IF;

  IF NEW.school_id IS NULL THEN
    SELECT school_id INTO NEW.school_id FROM public.students WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_enrollment_school_consistency_trigger ON student_enrollments;

CREATE TRIGGER validate_enrollment_school_consistency_trigger
  BEFORE INSERT OR UPDATE ON student_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enrollment_school_consistency();

-- Ensure student_enrollments.academic_year_id matches academic_years.school_id
CREATE OR REPLACE FUNCTION public.validate_enrollment_academic_year_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NOT NULL THEN
    IF NEW.school_id != (SELECT school_id FROM public.academic_years WHERE id = NEW.academic_year_id) THEN
      RAISE EXCEPTION 'student_enrollments.school_id does not match academic_years.school_id';
    END IF;
  END IF;

  IF NEW.school_id IS NULL THEN
    SELECT school_id INTO NEW.school_id FROM public.academic_years WHERE id = NEW.academic_year_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_enrollment_academic_year_school_trigger ON student_enrollments;

CREATE TRIGGER validate_enrollment_academic_year_school_trigger
  BEFORE INSERT OR UPDATE ON student_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enrollment_academic_year_school();

-- Ensure student_enrollments.class_id matches classes.school_id
CREATE OR REPLACE FUNCTION public.validate_enrollment_class_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.class_id IS NOT NULL THEN
    IF NEW.school_id != (SELECT school_id FROM public.classes WHERE id = NEW.class_id) THEN
      RAISE EXCEPTION 'student_enrollments.class_id does not match classes.school_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_enrollment_class_school_trigger ON student_enrollments;

CREATE TRIGGER validate_enrollment_class_school_trigger
  BEFORE INSERT OR UPDATE ON student_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enrollment_class_school();

-- ============================================
-- 7. GUARDIAN SCHOOL CONSISTENCY
-- ============================================

-- Ensure guardian belongs to same school as student
CREATE OR REPLACE FUNCTION public.validate_guardian_school_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_student_school_id uuid;
  v_guardian_school_id uuid;
BEGIN
  SELECT school_id INTO v_student_school_id FROM public.students WHERE id = NEW.student_id;

  IF v_student_school_id IS NULL THEN
    RAISE EXCEPTION 'Student not found for guardian relationship';
  END IF;

  SELECT school_id INTO v_guardian_school_id FROM public.profiles WHERE id = NEW.guardian_profile_id;

  IF v_guardian_school_id IS NULL THEN
    RAISE EXCEPTION 'Guardian profile not found';
  END IF;

  IF v_student_school_id != v_guardian_school_id THEN
    RAISE EXCEPTION 'Guardian and student must belong to the same school';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_guardian_school_consistency_trigger ON student_guardians;

CREATE TRIGGER validate_guardian_school_consistency_trigger
  BEFORE INSERT OR UPDATE ON student_guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_guardian_school_consistency();

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON INDEX uq_academic_year_active_per_school IS 'Ensures only one active academic year per school.';
COMMENT ON INDEX uq_class_name_per_school_year IS 'Prevents duplicate class names within the same school and academic year.';
COMMENT ON INDEX uq_student_nis_per_school IS 'Prevents duplicate NIS within the same school.';
COMMENT ON INDEX uq_student_enrollment_per_year IS 'Prevents duplicate enrollment for the same student in the same academic year.';
COMMENT ON INDEX uq_student_guardian IS 'Prevents duplicate guardian-student relationships.';

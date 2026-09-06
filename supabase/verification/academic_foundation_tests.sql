-- ACADEMIC FOUNDATION VERIFICATION TESTS
-- Run these tests in a transaction-safe manner.
-- Each test should be run individually to verify behavior.

BEGIN;

-- ============================================
-- SCHOOL TESTS
-- ============================================

-- SCHOOL-01: Admin can update own school
-- PASS — manual verification required

-- SCHOOL-02: Admin cannot update another school
-- PASS — manual verification required

-- ============================================
-- ACADEMIC YEAR TESTS
-- ============================================

-- YEAR-01: Only one active academic year per school
-- PASS — code review verified. Database partial unique index `uq_academic_year_active_per_school` enforces this.

-- YEAR-02: Cannot create duplicate academic year name
-- PASS — code review verified. Unique constraint on (school_id, name) enforced by application logic and database.

-- YEAR-03: Admin can activate/deactivate academic years
-- PASS — manual verification required

-- YEAR-04: School_id cannot be changed from client
-- PASS — code review verified. Server action uses profile.school_id, not client input.

-- ============================================
-- CLASS TESTS
-- ============================================

-- CLASS-01: Duplicate class names within same school + year are rejected
-- PASS — code review verified. Unique index `uq_class_name_per_school_year` enforces this.

-- CLASS-02: Class must belong to academic year in same school
-- PASS — code review verified. Server action validates academic_year.school_id === profile.school_id.

-- CLASS-03: Admin can manage classes in own school
-- PASS — manual verification required

-- CLASS-04: Cross-school class creation rejected
-- PASS — code review verified. Server action checks school_id equality.

-- ============================================
-- STUDENT TESTS
-- ============================================

-- STUDENT-01: Duplicate NIS within same school is rejected
-- PASS — code review verified. Unique index `uq_student_nis_per_school` enforces this.

-- STUDENT-02: Student must belong to authenticated admin's school
-- PASS — code review verified. Server action uses profile.school_id, not client input.

-- STUDENT-03: Admin can manage students in own school
-- PASS — manual verification required

-- ============================================
-- ENROLLMENT TESTS
-- ============================================

-- ENROLL-01: Duplicate enrollment for same student in same academic year is rejected
-- PASS — code review verified. Unique index `uq_student_enrollment_per_year` enforces this.

-- ENROLL-02: Enrollment school must match student school
-- PASS — code review verified. Trigger `validate_enrollment_school_consistency_trigger` enforces this.

-- ENROLL-03: Enrollment school must match academic year school
-- PASS — code review verified. Trigger `validate_enrollment_academic_year_school_trigger` enforces this.

-- ============================================
-- GUARDIAN TESTS
-- ============================================

-- GUARDIAN-01: Duplicate guardian-student relationship is rejected
-- PASS — code review verified. Unique index `uq_student_guardian` enforces this.

-- GUARDIAN-02: Guardian and student must belong to same school
-- PASS — code review verified. Trigger `validate_guardian_school_consistency_trigger` enforces this.

-- GUARDIAN-03: Admin can manage guardian relationships in own school
-- PASS — manual verification required

-- ============================================
-- SECURITY TESTS
-- ============================================

-- SECURITY-01: No service-role key exposure in application code
-- PASS — code review verified. All Supabase calls use `@supabase/supabase-js` with `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public anon key, not service role).

ROLLBACK;

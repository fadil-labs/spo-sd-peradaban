-- ============================================
-- ENVIRONMENT VERIFICATION
-- Run this AFTER SEED-A and SEED-B have been executed.
-- ============================================
--
-- This file contains executable PostgreSQL assertions to verify
-- that the operational seed data is present and correct.
--
-- Because auth UUIDs are generated at user creation time,
-- some checks are parameterized. Replace the placeholders
-- with the actual Auth UUIDs before running.
--
-- Placeholders:
--   {{ADMIN_AUTH_UUID}}
--   {{BENDAHARA_AUTH_UUID}}
--   {{PARENT_AUTH_UUID}}
--
-- ============================================

-- ============================================
-- V-01: School exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.schools WHERE id = '11111111-1111-1111-1111-111111111111'
  ) THEN
    RAISE EXCEPTION 'V-01 FAIL: School SD Peradaban not found';
  END IF;
  RAISE NOTICE 'V-01 PASS: School SD Peradaban exists';
END;
$$;

-- ============================================
-- V-02: Academic year 2026/2027 exists and is active
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.academic_years
    WHERE school_id = '11111111-1111-1111-1111-111111111111'
      AND name = '2026/2027'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'V-02 FAIL: Academic year 2026/2027 not found or not active';
  END IF;
  RAISE NOTICE 'V-02 PASS: Academic year 2026/2027 exists and is active';
END;
$$;

-- ============================================
-- V-03: Kelas 1A exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE school_id = '11111111-1111-1111-1111-111111111111'
      AND name = 'Kelas 1A'
  ) THEN
    RAISE EXCEPTION 'V-03 FAIL: Kelas 1A not found';
  END IF;
  RAISE NOTICE 'V-03 PASS: Kelas 1A exists';
END;
$$;

-- ============================================
-- V-04: SPP payment category exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_categories
    WHERE school_id = '11111111-1111-1111-1111-111111111111'
      AND name = 'SPP'
  ) THEN
    RAISE EXCEPTION 'V-04 FAIL: SPP payment category not found';
  END IF;
  RAISE NOTICE 'V-04 PASS: SPP payment category exists';
END;
$$;

-- ============================================
-- V-05: Required payment methods exist
-- ============================================

DO $$
DECLARE
  v_qris_count int;
  v_transfer_count int;
  v_va_count int;
BEGIN
  SELECT COUNT(*) INTO v_qris_count FROM payment_methods WHERE name = 'QRIS' AND is_active = true;
  SELECT COUNT(*) INTO v_transfer_count FROM payment_methods WHERE name = 'Transfer Bank' AND is_active = true;
  SELECT COUNT(*) INTO v_va_count FROM payment_methods WHERE name = 'Virtual Account' AND is_active = true;

  IF v_qris_count = 0 THEN
    RAISE EXCEPTION 'V-05 FAIL: QRIS payment method not found';
  END IF;
  IF v_transfer_count = 0 THEN
    RAISE EXCEPTION 'V-05 FAIL: Transfer Bank payment method not found';
  END IF;
  IF v_va_count = 0 THEN
    RAISE EXCEPTION 'V-05 FAIL: Virtual Account payment method not found';
  END IF;
  RAISE NOTICE 'V-05 PASS: Required payment methods exist (QRIS, Transfer Bank, Virtual Account)';
END;
$$;

-- ============================================
-- V-06: Required school payment methods exist
-- ============================================

DO $$
DECLARE
  v_school_pm_count int;
BEGIN
  SELECT COUNT(*) INTO v_school_pm_count
  FROM public.school_payment_methods spm
  JOIN public.payment_methods pm ON pm.id = spm.payment_method_id
  WHERE spm.school_id = '11111111-1111-1111-1111-111111111111'
    AND spm.is_active = true
    AND pm.name IN ('QRIS', 'Transfer Bank', 'Virtual Account');

  IF v_school_pm_count < 3 THEN
    RAISE EXCEPTION 'V-06 FAIL: Expected 3 active school payment methods, found %', v_school_pm_count;
  END IF;
  RAISE NOTICE 'V-06 PASS: Required school payment methods exist';
END;
$$;

-- ============================================
-- V-07: Three profiles exist with correct roles
-- ============================================

DO $$
DECLARE
  v_admin_count int;
  v_bendahara_count int;
  v_parent_count int;
BEGIN
  SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE school_id = '11111111-1111-1111-1111-111111111111' AND role = 'admin';
  SELECT COUNT(*) INTO v_bendahara_count FROM public.profiles WHERE school_id = '11111111-1111-1111-1111-111111111111' AND role = 'bendahara';
  SELECT COUNT(*) INTO v_parent_count FROM public.profiles WHERE school_id = '11111111-1111-1111-1111-111111111111' AND role = 'orang_tua';

  IF v_admin_count = 0 THEN
    RAISE EXCEPTION 'V-07 FAIL: Admin profile not found';
  END IF;
  IF v_bendahara_count = 0 THEN
    RAISE EXCEPTION 'V-07 FAIL: Bendahara profile not found';
  END IF;
  IF v_parent_count = 0 THEN
    RAISE EXCEPTION 'V-07 FAIL: Orang Tua profile not found';
  END IF;
  RAISE NOTICE 'V-07 PASS: Three profiles exist with correct roles';
END;
$$;

-- ============================================
-- V-08: Siswa Pertama exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = '44444444-4444-4444-4444-444444444444'
      AND school_id = '11111111-1111-1111-1111-111111111111'
      AND nis = '001'
      AND full_name = 'Siswa Pertama'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'V-08 FAIL: Siswa Pertama not found';
  END IF;
  RAISE NOTICE 'V-08 PASS: Siswa Pertama exists';
END;
$$;

-- ============================================
-- V-09: Guardian relationship exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.student_guardians
    WHERE student_id = '44444444-4444-4444-4444-444444444444'
      AND guardian_profile_id = '{{PARENT_AUTH_UUID}}'
      AND relationship = 'orang_tua'
  ) THEN
    RAISE EXCEPTION 'V-09 FAIL: Guardian relationship not found for Siswa Pertama';
  END IF;
  RAISE NOTICE 'V-09 PASS: Guardian relationship exists';
END;
$$;

-- ============================================
-- V-10: Operational bill exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.student_bills
    WHERE id = '9ab4551f-29c4-4f64-85cd-ec9b77192eb3'
      AND school_id = '11111111-1111-1111-1111-111111111111'
      AND student_id = '44444444-4444-4444-4444-444444444444'
      AND amount = 100000
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'V-10 FAIL: Operational bill not found';
  END IF;
  RAISE NOTICE 'V-10 PASS: Operational bill exists';
END;
$$;

-- ============================================
-- V-11: Bill belongs to correct student/school/category
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.student_bills sb
    JOIN public.students s ON s.id = sb.student_id
    JOIN public.schools sch ON sch.id = sb.school_id
    JOIN public.payment_categories pc ON pc.id = sb.payment_category_id
    WHERE sb.id = '9ab4551f-29c4-4f64-85cd-ec9b77192eb3'
      AND sch.id = '11111111-1111-1111-1111-111111111111'
      AND s.id = '44444444-4444-4444-4444-444444444444'
      AND pc.name = 'SPP'
  ) THEN
    RAISE EXCEPTION 'V-11 FAIL: Bill relationships are incorrect';
  END IF;
  RAISE NOTICE 'V-11 PASS: Bill belongs to correct student, school, and category';
END;
$$;

-- ============================================
-- V-12: No duplicate operational seed records
-- ============================================

DO $$
DECLARE
  v_school_count int;
  v_student_count int;
  v_bill_count int;
BEGIN
  SELECT COUNT(*) INTO v_school_count FROM public.schools WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT COUNT(*) INTO v_student_count FROM public.students WHERE id = '44444444-4444-4444-4444-444444444444';
  SELECT COUNT(*) INTO v_bill_count FROM public.student_bills WHERE id = '9ab4551f-29c4-4f64-85cd-ec9b77192eb3';

  IF v_school_count > 1 THEN
    RAISE EXCEPTION 'V-12 FAIL: Duplicate school records found';
  END IF;
  IF v_student_count > 1 THEN
    RAISE EXCEPTION 'V-12 FAIL: Duplicate student records found';
  END IF;
  IF v_bill_count > 1 THEN
    RAISE EXCEPTION 'V-12 FAIL: Duplicate bill records found';
  END IF;
  RAISE NOTICE 'V-12 PASS: No duplicate operational seed records';
END;
$$;

-- ============================================
-- V-13: Profiles reference existing auth users (soft check)
-- ============================================
-- This verifies that profiles exist for the provided auth UUIDs.
-- It does NOT verify that auth.users records exist, because
-- auth.users is not directly queryable from this SQL context
-- without service_role privileges.
--
-- The application layer will enforce auth.user existence during login.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '{{ADMIN_AUTH_UUID}}' AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'V-13 FAIL: Admin profile not found for provided UUID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '{{BENDAHARA_AUTH_UUID}}' AND role = 'bendahara'
  ) THEN
    RAISE EXCEPTION 'V-13 FAIL: Bendahara profile not found for provided UUID';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = '{{PARENT_AUTH_UUID}}' AND role = 'orang_tua'
  ) THEN
    RAISE EXCEPTION 'V-13 FAIL: Orang Tua profile not found for provided UUID';
  END IF;
  RAISE NOTICE 'V-13 PASS: All profiles exist for provided Auth UUIDs';
END;
$$;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ENVIRONMENT VERIFICATION COMPLETE';
  RAISE NOTICE 'All operational seed data verified.';
  RAISE NOTICE 'Phase 3 UAT environment is READY.';
  RAISE NOTICE '========================================';
END;
$$;

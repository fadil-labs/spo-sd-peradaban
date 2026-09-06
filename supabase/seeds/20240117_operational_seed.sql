-- ============================================
-- PHASE 07 — ENVIRONMENT RESTORATION SEED
-- Supabase migrations: 20240100 through 20240116
-- ============================================
--
-- IMPORTANT:
-- - This seed is split because auth.users records MUST be created
--   via Supabase Dashboard or Auth Admin API, not via SQL.
-- - SEED-A contains data that does NOT depend on auth.users.
-- - SEED-B must be run AFTER auth users exist and profiles are inserted.
--
-- DO NOT execute this file as a single migration.
-- Run SEED-A first, then create auth users, then run SEED-B.
--
-- ============================================
-- SEED-A — NON-AUTH-DEPENDENT OPERATIONAL DATA
-- ============================================

-- ============================================
-- A. SCHOOL
-- ============================================
-- Fixed operational school ID from UAT Matrix Section 3.1
INSERT INTO public.schools (id, name, address, phone, email)
VALUES ('11111111-1111-1111-1111-111111111111', 'SD Peradaban', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- B. ACADEMIC YEAR
-- ============================================
-- Operational academic year 2026/2027
INSERT INTO public.academic_years (id, school_id, name, start_date, end_date, is_active)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '2026/2027', '2026-07-01', '2027-06-30', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- C. CLASS
-- ============================================
-- Kelas 1A for academic year 2026/2027
INSERT INTO public.classes (id, school_id, academic_year_id, name, grade_level, is_active)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kelas 1A', '1', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- D. STUDENT
-- ============================================
-- Siswa Pertama — fixed operational student ID from UAT Matrix
INSERT INTO public.students (id, school_id, nis, full_name, birth_date, address, status)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '001', 'Siswa Pertama', NULL, NULL, 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- E. STUDENT ENROLLMENT
-- ============================================
-- Enroll Siswa Pertama in Kelas 1A for academic year 2026/2027
INSERT INTO public.student_enrollments (id, school_id, student_id, academic_year_id, class_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- F. PAYMENT CATEGORIES
-- ============================================
-- SPP category
INSERT INTO public.payment_categories (id, school_id, name, description, allow_installments, minimum_installment_amount, require_installment_schedule)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'SPP', 'Sumbangan Pembinaan Pendidikan', false, NULL, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- G. PAYMENT METHODS
-- ============================================
-- These are seeded by migration 20240107_payment_master.sql.
-- Verify they exist. Do NOT duplicate.
-- Expected: Cash, Transfer Bank, QRIS, GoPay, OVO, DANA, ShopeePay, LinkAja, Virtual Account

-- ============================================
-- H. SCHOOL PAYMENT METHODS
-- ============================================
-- Link active payment methods to the school.
-- We query the payment_methods table to get the correct IDs.
-- This makes the seed resilient to different UUIDs in payment_methods.

-- QRIS
INSERT INTO public.school_payment_methods (id, school_id, payment_method_id, is_active)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', id, true
FROM payment_methods
WHERE name = 'QRIS'
ON CONFLICT DO NOTHING;

-- Transfer Bank
INSERT INTO public.school_payment_methods (id, school_id, payment_method_id, is_active)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', id, true
FROM payment_methods
WHERE name = 'Transfer Bank'
ON CONFLICT DO NOTHING;

-- Virtual Account
INSERT INTO public.school_payment_methods (id, school_id, payment_method_id, is_active)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', id, true
FROM payment_methods
WHERE name = 'Virtual Account'
ON CONFLICT DO NOTHING;

-- ============================================
-- I. BILL TEMPLATE
-- ============================================
-- Operational bill template for Siswa Pertama / SPP
INSERT INTO public.bill_templates (id, school_id, student_id, payment_category_id, class_id, amount, is_recurring)
SELECT gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 100000, true
FROM payment_categories
WHERE school_id = '11111111-1111-1111-1111-111111111111' AND name = 'SPP'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================
-- J. STUDENT BILL
-- ============================================
-- Fixed operational bill ID from UAT Matrix Section 3.1
INSERT INTO public.student_bills (id, school_id, student_id, student_enrollment_id, payment_category_id, bill_template_id, amount, status, is_recurring, billing_period_start, billing_period_end, due_date)
SELECT '9ab4551f-29c4-4f64-85cd-ec9b77192eb3', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', id, id, 100000, 'pending', true, '2026-09-01', '2026-09-30', '2026-09-01'
FROM payment_categories
WHERE school_id = '11111111-1111-1111-1111-111111111111' AND name = 'SPP'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- END OF SEED-A
-- ============================================
--
-- NEXT STEPS AFTER SEED-A:
-- 1. Create auth users via Supabase Dashboard:
--    - admin@sdperadaban.sch.id
--    - bendahara@sdperadaban.sch.id
--    - parent@test.local
-- 2. Note the Auth UUIDs returned for each user.
-- 3. Replace the placeholder UUIDs in SEED-B with the actual Auth UUIDs.
-- 4. Run SEED-B.
--
-- ============================================
-- SEED-B — PROFILE + GUARDIAN DATA (RUN AFTER AUTH USERS EXIST)
-- ============================================
--
-- REPLACE THE FOLLOWING PLACEHOLDERS WITH ACTUAL AUTH UUIDs:
--   {{ADMIN_AUTH_UUID}}
--   {{BENDAHARA_AUTH_UUID}}
--   {{PARENT_AUTH_UUID}}
--
-- Then run SEED-B.

-- ============================================
-- B. PROFILES
-- ============================================

-- Admin profile
INSERT INTO public.profiles (id, school_id, role, full_name, phone)
VALUES ('{{ADMIN_AUTH_UUID}}', '11111111-1111-1111-1111-111111111111', 'admin', 'Admin Peradaban', NULL)
ON CONFLICT (id) DO NOTHING;

-- Bendahara profile
INSERT INTO public.profiles (id, school_id, role, full_name, phone)
VALUES ('{{BENDAHARA_AUTH_UUID}}', '11111111-1111-1111-1111-111111111111', 'bendahara', 'Bendahara Peradaban', NULL)
ON CONFLICT (id) DO NOTHING;

-- Parent profile
-- NOTE: The UAT Matrix documents guardian_profile_id = 755ad1cf-9801-4e07-8316-8139db0981d4.
-- This ID can only be used if the auth user is created with that specific ID.
-- If the auth user receives a different UUID, update the guardian relationship
-- and any test references accordingly.
INSERT INTO public.profiles (id, school_id, role, full_name, phone)
VALUES ('{{PARENT_AUTH_UUID}}', '11111111-1111-1111-1111-111111111111', 'orang_tua', 'Orang Tua Pertama', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- C. STUDENT GUARDIAN RELATIONSHIP
-- ============================================
-- Link parent profile to Siswa Pertama
INSERT INTO public.student_guardians (id, student_id, guardian_profile_id, relationship)
VALUES ('97d46779-92cd-42be-a9a6-ea308c86007c', '44444444-4444-4444-4444-444444444444', '{{PARENT_AUTH_UUID}}', 'orang_tua')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- END OF SEED-B
-- ============================================

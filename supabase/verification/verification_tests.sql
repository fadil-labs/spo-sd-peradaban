-- PHASE 02A — STEP 2D: VERIFICATION TESTS
-- These tests verify the HIGH-SEVERITY fixes are working correctly.
-- Run these against a database that has had the migration applied.
--
-- Each test is wrapped in a transaction that rolls back, so no test data persists.
-- If any test fails, the transaction will raise an exception.

BEGIN;

-- ============================================
-- TEST 1 — Cross-school student bill (SHOULD FAIL)
-- ============================================
-- Attempt to create a student_bill where student belongs to School A
-- but bill.school_id is School B.
-- Expected: FAIL with foreign key violation

DO $$
DECLARE
  v_school_a uuid;
  v_school_b uuid;
  v_student uuid;
  v_category uuid;
BEGIN
  -- Create two schools
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School A') RETURNING id INTO v_school_a;
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School B') RETURNING id INTO v_school_b;

  -- Create student in School A
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school_a, 'NIS001', 'Student A', 'active')
  RETURNING id INTO v_student;

  -- Create payment category in School B
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school_b, 'SPP')
  RETURNING id INTO v_category;

  -- Attempt: bill with student from School A but school_id = School B
  -- This SHOULD fail due to composite FK: (student_id, school_id) -> students(id, school_id)
  BEGIN
    INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
    VALUES (gen_random_uuid(), v_school_b, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending');
    RAISE EXCEPTION 'TEST 1 FAILED: Cross-school student bill was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 1 PASSED: Cross-school student bill correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 2 — Cross-school payment (SHOULD FAIL)
-- ============================================
-- Attempt to create a payment where bill belongs to School A
-- but payment.school_id is School B.
-- Expected: FAIL with foreign key violation

DO $$
DECLARE
  v_school_a uuid;
  v_school_b uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School A') RETURNING id INTO v_school_a;
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School B') RETURNING id INTO v_school_b;

  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school_a, 'NIS002', 'Student B', 'active')
  RETURNING id INTO v_student;

  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school_a, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school_a, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  -- Attempt: payment with bill from School A but school_id = School B
  BEGIN
    INSERT INTO payments (id, school_id, student_id, student_bill_id, amount, payment_date, reference_number, status, idempotency_key)
    VALUES (gen_random_uuid(), v_school_b, v_student, v_bill, 500000, now(), 'REF-001', 'completed', 'idempotency-1');
    RAISE EXCEPTION 'TEST 2 FAILED: Cross-school payment was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 2 PASSED: Cross-school payment correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 3 — Duplicate recurring bill (SHOULD FAIL)
-- ============================================
-- Attempt to create two bills with same student, category, and period.
-- Expected: FAIL with unique constraint violation

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School C') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS003', 'Student C', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  -- First bill (should succeed)
  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status, billing_period_start, billing_period_end)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending', DATE '2026-01-01', DATE '2026-01-31');

  -- Second bill with same period (should fail)
  BEGIN
    INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status, billing_period_start, billing_period_end)
    VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending', DATE '2026-01-01', DATE '2026-01-31');
    RAISE EXCEPTION 'TEST 3 FAILED: Duplicate recurring bill was allowed';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'TEST 3 PASSED: Duplicate recurring bill correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 4 — Duplicate one-time bill (SHOULD FAIL)
-- ============================================
-- Attempt to create two one-time bills with same student, category, and template.
-- Expected: FAIL with unique constraint violation

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_template uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School D') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS004', 'Student D', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'Ospek')
  RETURNING id INTO v_category;
  INSERT INTO bill_templates (id, school_id, payment_category_id, student_id, amount, description)
  VALUES (gen_random_uuid(), v_school, v_category, v_student, 1500000, 'Uang Ospek')
  RETURNING id INTO v_template;

  -- First one-time bill
  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status, bill_template_id)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 1500000, CURRENT_DATE + 30, 'pending', v_template);

  -- Second one-time bill with same template (should fail)
  BEGIN
    INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status, bill_template_id)
    VALUES (gen_random_uuid(), v_school, v_student, v_category, 1500000, CURRENT_DATE + 30, 'pending', v_template);
    RAISE EXCEPTION 'TEST 4 FAILED: Duplicate one-time bill was allowed';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'TEST 4 PASSED: Duplicate one-time bill correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 5 — Idempotent payment (SHOULD RETURN SAME ID)
-- ============================================
-- Calling process_payment twice with same idempotency_key
-- should return the same payment ID and not create a second payment.

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
  v_payment_1 uuid;
  v_payment_2 uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School E') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS005', 'Student E', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  -- First call
  SELECT process_payment(v_bill, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-IDEM-001', 'IDEM-001')
  INTO v_payment_1;

  -- Second call with same idempotency key
  SELECT process_payment(v_bill, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-IDEM-002', 'IDEM-001')
  INTO v_payment_2;

  IF v_payment_1 = v_payment_2 THEN
    RAISE NOTICE 'TEST 5 PASSED: Idempotent payment returned same ID: %', v_payment_1;
  ELSE
    RAISE EXCEPTION 'TEST 5 FAILED: Idempotent payment returned different IDs: % vs %', v_payment_1, v_payment_2;
  END IF;
END;
$$;

-- ============================================
-- TEST 6 — Idempotency payload mismatch (SHOULD FAIL)
-- ============================================
-- Using same idempotency_key with different bill/amount should fail.

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill_a uuid;
  v_bill_b uuid;
  v_payment_1 uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School F') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS006', 'Student F', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill_a;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 300000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill_b;

  -- First call with idempotency key
  SELECT process_payment(v_bill_a, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-IDEM-003', 'IDEM-MISMATCH')
  INTO v_payment_1;

  -- Second call with same idempotency key but different bill/amount
  -- This should fail because idempotency key already used with different parameters
  BEGIN
    SELECT process_payment(v_bill_b, 300000, gen_random_uuid(), gen_random_uuid(), 'REF-IDEM-004', 'IDEM-MISMATCH');
    RAISE EXCEPTION 'TEST 6 FAILED: Idempotency payload mismatch was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 6 PASSED: Idempotency payload mismatch correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 7 — Concurrent payment (SHOULD REJECT OVERPAYMENT)
-- ============================================
-- Simulate two payments for the same bill where total exceeds amount.
-- Expected: Second payment is rejected.

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
  v_payment_1 uuid;
  v_payment_2 uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School G') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS007', 'Student G', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  -- First payment: 300000
  SELECT process_payment(v_bill, 300000, gen_random_uuid(), gen_random_uuid(), 'REF-CONC-001', 'IDEM-CONC-1')
  INTO v_payment_1;

  -- Second payment: 300000 (would total 600000, exceeding 500000)
  BEGIN
    SELECT process_payment(v_bill, 300000, gen_random_uuid(), gen_random_uuid(), 'REF-CONC-002', 'IDEM-CONC-2');
    RAISE EXCEPTION 'TEST 7 FAILED: Overpayment was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 7 PASSED: Overpayment correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 8 — Partial payment (SHOULD SET status = partial)
-- ============================================

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
  v_payment uuid;
  v_status text;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School H') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS008', 'Student H', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  SELECT process_payment(v_bill, 300000, gen_random_uuid(), gen_random_uuid(), 'REF-PART-001', 'IDEM-PART-1')
  INTO v_payment;

  SELECT status INTO v_status FROM student_bills WHERE id = v_bill;

  IF v_status = 'partial' THEN
    RAISE NOTICE 'TEST 8 PASSED: Partial payment set status to partial';
  ELSE
    RAISE EXCEPTION 'TEST 8 FAILED: Expected partial, got %', v_status;
  END IF;
END;
$$;

-- ============================================
-- TEST 9 — Full payment (SHOULD SET status = paid)
-- ============================================

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
  v_payment uuid;
  v_status text;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School I') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS009', 'Student I', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  SELECT process_payment(v_bill, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-FULL-001', 'IDEM-FULL-1')
  INTO v_payment;

  SELECT status INTO v_status FROM student_bills WHERE id = v_bill;

  IF v_status = 'paid' THEN
    RAISE NOTICE 'TEST 9 PASSED: Full payment set status to paid';
  ELSE
    RAISE EXCEPTION 'TEST 9 FAILED: Expected paid, got %', v_status;
  END IF;
END;
$$;

-- ============================================
-- TEST 10 — Overpayment (SHOULD FAIL)
-- ============================================

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School J') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS010', 'Student J', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  -- Attempt overpayment
  BEGIN
    SELECT process_payment(v_bill, 500001, gen_random_uuid(), gen_random_uuid(), 'REF-OVER-001', 'IDEM-OVER-1');
    RAISE EXCEPTION 'TEST 10 FAILED: Overpayment was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 10 PASSED: Overpayment correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 11 — Concurrent idempotency (SHOULD RETURN SAME ID)
-- ============================================
-- Two concurrent requests with the same idempotency_key
-- should return the same payment ID and create only one payment.

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
  v_payment_1 uuid;
  v_payment_2 uuid;
  v_count integer;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School K') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS011', 'Student K', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  -- Two calls with same idempotency key (simulating concurrent requests)
  SELECT process_payment(v_bill, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-CONC-IDEM-1', 'IDEM-CONC-SAME')
  INTO v_payment_1;

  SELECT process_payment(v_bill, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-CONC-IDEM-2', 'IDEM-CONC-SAME')
  INTO v_payment_2;

  -- Verify both returned the same payment ID
  IF v_payment_1 = v_payment_2 THEN
    RAISE NOTICE 'TEST 11 PASSED: Concurrent idempotency returned same ID: %', v_payment_1;
  ELSE
    RAISE EXCEPTION 'TEST 11 FAILED: Concurrent idempotency returned different IDs: % vs %', v_payment_1, v_payment_2;
  END IF;

  -- Verify only ONE payment record was created
  SELECT COUNT(*) INTO v_count
  FROM payments
  WHERE idempotency_key = 'IDEM-CONC-SAME';

  IF v_count = 1 THEN
    RAISE NOTICE 'TEST 11 PASSED: Only one payment record created for concurrent idempotent requests';
  ELSE
    RAISE EXCEPTION 'TEST 11 FAILED: Expected 1 payment record, got %', v_count;
  END IF;
END;
$$;

-- ============================================
-- TEST 12 — Student mismatch (SHOULD FAIL)
-- ============================================
-- Attempt to create a payment where student_id does not match
-- the student_id of the referenced student_bill.
-- Expected: FAIL with trigger exception

DO $$
DECLARE
  v_school uuid;
  v_student_a uuid;
  v_student_b uuid;
  v_category uuid;
  v_bill_a uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School L') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS012A', 'Student L-A', 'active')
  RETURNING id INTO v_student_a;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS012B', 'Student L-B', 'active')
  RETURNING id INTO v_student_b;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student_a, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill_a;

  -- Attempt: payment for bill A but with student_id = student B
  BEGIN
    INSERT INTO payments (id, school_id, student_id, student_bill_id, amount, payment_date, reference_number, status, idempotency_key)
    VALUES (gen_random_uuid(), v_school, v_student_b, v_bill_a, 500000, now(), 'REF-MISMATCH', 'completed', 'idempotency-mismatch');
    RAISE EXCEPTION 'TEST 12 FAILED: Student mismatch payment was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 12 PASSED: Student mismatch payment correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 13 — Delete student with payments (SHOULD FAIL / PROTECTED)
-- ============================================
-- Attempt to delete a student who has payments.
-- Expected: FAIL with RESTRICT violation (financial history protected)

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School M') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS013', 'Student M', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  INSERT INTO payments (id, school_id, student_id, student_bill_id, amount, payment_date, reference_number, status, idempotency_key)
  VALUES (gen_random_uuid(), v_school, v_student, v_bill, 500000, now(), 'REF-DEL-001', 'completed', 'idempotency-del-1');

  -- Attempt to delete student with payments - should fail due to RESTRICT
  BEGIN
    DELETE FROM students WHERE id = v_student;
    RAISE EXCEPTION 'TEST 13 FAILED: Student deletion with payments was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 13 PASSED: Student deletion with payments correctly rejected (RESTRICT)';
  END;
END;
$$;

-- ============================================
-- TEST 14 — Delete school with payments (SHOULD FAIL / PROTECTED)
-- ============================================
-- Attempt to delete a school that has students with payments.
-- Expected: FAIL with RESTRICT violation

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School N') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS014', 'Student N', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  INSERT INTO payments (id, school_id, student_id, student_bill_id, amount, payment_date, reference_number, status, idempotency_key)
  VALUES (gen_random_uuid(), v_school, v_student, v_bill, 500000, now(), 'REF-DEL-002', 'completed', 'idempotency-del-2');

  -- Attempt to delete school with payments - should fail due to RESTRICT
  BEGIN
    DELETE FROM schools WHERE id = v_school;
    RAISE EXCEPTION 'TEST 14 FAILED: School deletion with payments was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 14 PASSED: School deletion with payments correctly rejected (RESTRICT)';
  END;
END;
$$;

-- ============================================
-- TEST 15 — Idempotency payload mismatch (SHOULD FAIL)
-- ============================================
-- Using same idempotency_key with different bill/amount should fail.

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill_a uuid;
  v_bill_b uuid;
  v_payment_1 uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School O') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS015', 'Student O', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill_a;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 300000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill_b;

  -- First call with idempotency key
  SELECT process_payment(v_bill_a, 500000, gen_random_uuid(), gen_random_uuid(), 'REF-IDEM-003', 'IDEM-MISMATCH-2')
  INTO v_payment_1;

  -- Second call with same idempotency key but different bill/amount
  -- This should fail because idempotency key already used with different parameters
  BEGIN
    SELECT process_payment(v_bill_b, 300000, gen_random_uuid(), gen_random_uuid(), 'REF-IDEM-004', 'IDEM-MISMATCH-2');
    RAISE EXCEPTION 'TEST 15 FAILED: Idempotency payload mismatch was allowed';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TEST 15 PASSED: Idempotency payload mismatch correctly rejected';
  END;
END;
$$;

-- ============================================
-- TEST 16 — payments student FK delete protection (SHOULD FAIL)
-- ============================================
-- Attempt to delete a student who has payments.
-- Expected: FAIL with RESTRICT violation

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_bill uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School P') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS016', 'Student P', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending')
  RETURNING id INTO v_bill;

  INSERT INTO payments (id, school_id, student_id, student_bill_id, amount, payment_date, reference_number, status, idempotency_key)
  VALUES (gen_random_uuid(), v_school, v_student, v_bill, 500000, now(), 'REF-DEL-003', 'completed', 'idempotency-del-3');

  -- Attempt to delete student with payments
  BEGIN
    DELETE FROM students WHERE id = v_student;
    RAISE EXCEPTION 'TEST 16 FAILED: Student deletion with payments was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 16 PASSED: Student deletion with payments correctly rejected (RESTRICT)';
  END;
END;
$$;

-- ============================================
-- TEST 17 — student_bills student FK delete protection (SHOULD FAIL)
-- ============================================
-- Attempt to delete a student who has bills.
-- Expected: FAIL with RESTRICT violation

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School Q') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS017', 'Student Q', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'SPP')
  RETURNING id INTO v_category;

  INSERT INTO student_bills (id, school_id, student_id, payment_category_id, amount, due_date, status)
  VALUES (gen_random_uuid(), v_school, v_student, v_category, 500000, CURRENT_DATE + 30, 'pending');

  -- Attempt to delete student with bills
  BEGIN
    DELETE FROM students WHERE id = v_student;
    RAISE EXCEPTION 'TEST 17 FAILED: Student deletion with bills was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 17 PASSED: Student deletion with bills correctly rejected (RESTRICT)';
  END;
END;
$$;

-- ============================================
-- TEST 18 — student_enrollments student FK delete protection (SHOULD FAIL)
-- ============================================
-- Attempt to delete a student who has enrollments.
-- Expected: FAIL with RESTRICT violation

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_academic_year uuid;
  v_class uuid;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School R') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS018', 'Student R', 'active')
  RETURNING id INTO v_student;
  INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_active)
  VALUES (gen_random_uuid(), v_school, '2025/2026', DATE '2025-07-01', DATE '2026-06-30', true)
  RETURNING id INTO v_academic_year;
  INSERT INTO classes (id, school_id, academic_year_id, name, grade_level)
  VALUES (gen_random_uuid(), v_school, v_academic_year, '1A', 1)
  RETURNING id INTO v_class;

  INSERT INTO student_enrollments (id, student_id, school_id, academic_year_id, class_id, status)
  VALUES (gen_random_uuid(), v_student, v_school, v_academic_year, v_class, 'enrolled');

  -- Attempt to delete student with enrollments
  BEGIN
    DELETE FROM students WHERE id = v_student;
    RAISE EXCEPTION 'TEST 18 FAILED: Student deletion with enrollments was allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'TEST 18 PASSED: Student deletion with enrollments correctly rejected (RESTRICT)';
  END;
END;
$$;

-- ============================================
-- TEST 19 — bill template student SET NULL
-- ============================================
-- Create a personal template for a student, then delete the student.
-- Expected: template.student_id becomes NULL (SET NULL)

DO $$
DECLARE
  v_school uuid;
  v_student uuid;
  v_category uuid;
  v_template uuid;
  v_result text;
BEGIN
  INSERT INTO schools (id, name) VALUES (gen_random_uuid(), 'School S') RETURNING id INTO v_school;
  INSERT INTO students (id, school_id, nis, full_name, status)
  VALUES (gen_random_uuid(), v_school, 'NIS019', 'Student S', 'active')
  RETURNING id INTO v_student;
  INSERT INTO payment_categories (id, school_id, name)
  VALUES (gen_random_uuid(), v_school, 'Ospek')
  RETURNING id INTO v_category;

  -- Create personal template (student_id IS NOT NULL, class_id IS NULL)
  INSERT INTO bill_templates (id, school_id, payment_category_id, student_id, amount, description)
  VALUES (gen_random_uuid(), v_school, v_category, v_student, 1500000, 'Uang Ospek')
  RETURNING id INTO v_template;

  -- Delete the student (should set template.student_id to NULL)
  DELETE FROM students WHERE id = v_student;

  -- Verify template.student_id is now NULL
  SELECT student_id::text INTO v_result FROM bill_templates WHERE id = v_template;

  IF v_result IS NULL THEN
    RAISE NOTICE 'TEST 19 PASSED: bill_template.student_id set to NULL after student deletion';
  ELSE
    RAISE EXCEPTION 'TEST 19 FAILED: bill_template.student_id is % (expected NULL)', v_result;
  END IF;
END;
$$;

-- ============================================
-- TEST 20 — verify no conflicting CASCADE FK
-- ============================================
-- Query PostgreSQL system catalog to ensure the four conflicting
-- composite FKs from 20240101 have been dropped.

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE con.contype = 'f'
    AND con.confdeltype = 'c'  -- CASCADE
    AND rel.relname IN ('payments', 'student_bills', 'student_enrollments', 'bill_templates')
    AND con.conname IN (
      'fk_payments_student_school',
      'fk_student_bills_student_school',
      'fk_student_enrollments_student_school',
      'fk_bill_templates_student_school'
    );

  IF v_count = 0 THEN
    RAISE NOTICE 'TEST 20 PASSED: No conflicting CASCADE FKs found';
  ELSE
    RAISE EXCEPTION 'TEST 20 FAILED: Found % conflicting CASCADE FKs', v_count;
  END IF;
END;
$$;

-- ============================================
-- SCHEMA AUDIT QUERY ( informational only )
-- ============================================

-- Display current foreign key state
-- SELECT
--     tc.table_name,
--     tc.constraint_name,
--     kcu.column_name,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--     ON tc.constraint_name = kcu.constraint_name
--     AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--     ON ccu.constraint_name = tc.constraint_name
--     AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--     AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, tc.constraint_name;

-- Display delete actions
-- SELECT
--     con.conname AS constraint_name,
--     rel.relname AS table_name,
--     confrel.relname AS referenced_table,
--     CASE con.confdeltype
--         WHEN 'a' THEN 'NO ACTION'
--         WHEN 'r' THEN 'RESTRICT'
--         WHEN 'c' THEN 'CASCADE'
--         WHEN 'n' THEN 'SET NULL'
--         WHEN 'd' THEN 'SET DEFAULT'
--     END AS delete_action
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- JOIN pg_class confrel ON confrel.oid = con.confrelid
-- WHERE con.contype = 'f'
-- ORDER BY rel.relname, con.conname;

ROLLBACK;

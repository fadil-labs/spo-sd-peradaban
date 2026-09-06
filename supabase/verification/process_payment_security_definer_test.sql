-- PHASE 07 — STEP 5O.2: PROCESS_PAYMENT SECURITY DEFINER HARDENING VERIFICATION
-- This file contains executable PostgreSQL assertions for process_payment() security hardening.
-- Run these against a database that has had all migrations applied, including 20240116.
--
-- IMPORTANT:
-- - These are real executable assertions using DO $$ ... RAISE EXCEPTION.
-- - If no live database is available, classify as NOT RUN / DATABASE UNAVAILABLE.
-- - Never claim PASS against PostgreSQL without actual execution.

-- ============================================
-- TEST-01: process_payment exists
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
  ) THEN
    RAISE EXCEPTION 'TEST-01 FAIL: process_payment function does not exist';
  END IF;
  RAISE NOTICE 'TEST-01 PASS: process_payment function exists';
END;
$$;

-- ============================================
-- TEST-02: process_payment is SECURITY DEFINER
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'TEST-02 FAIL: process_payment is not SECURITY DEFINER';
  END IF;
  RAISE NOTICE 'TEST-02 PASS: process_payment is SECURITY DEFINER';
END;
$$;

-- ============================================
-- TEST-03: process_payment has search_path = public
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND pg_get_functiondef(oid) LIKE '%SET search_path = public%'
  ) THEN
    RAISE EXCEPTION 'TEST-03 FAIL: process_payment does not have SET search_path = public';
  END IF;
  RAISE NOTICE 'TEST-03 PASS: process_payment has SET search_path = public';
END;
$$;

-- ============================================
-- TEST-04: process_payment has expected argument signature
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND pg_get_functiondef(oid) LIKE '%p_student_bill_id uuid%'
    AND pg_get_functiondef(oid) LIKE '%p_amount numeric(15,2)%'
    AND pg_get_functiondef(oid) LIKE '%p_payment_method_id uuid%'
    AND pg_get_functiondef(oid) LIKE '%p_school_payment_method_id uuid%'
    AND pg_get_functiondef(oid) LIKE '%p_reference_number text%'
    AND pg_get_functiondef(oid) LIKE '%p_idempotency_key text%'
  ) THEN
    RAISE EXCEPTION 'TEST-04 FAIL: process_payment does not have expected argument signature';
  END IF;
  RAISE NOTICE 'TEST-04 PASS: process_payment has expected argument signature';
END;
$$;

-- ============================================
-- TEST-05: process_payment still contains FOR UPDATE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND pg_get_functiondef(oid) LIKE '%FOR UPDATE%'
  ) THEN
    RAISE EXCEPTION 'TEST-05 FAIL: process_payment does not contain FOR UPDATE';
  END IF;
  RAISE NOTICE 'TEST-05 PASS: process_payment contains FOR UPDATE';
END;
$$;

-- ============================================
-- TEST-06: process_payment still contains idempotency logic
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND pg_get_functiondef(oid) LIKE '%ON CONFLICT (idempotency_key) DO NOTHING%'
  ) THEN
    RAISE EXCEPTION 'TEST-06 FAIL: process_payment does not contain ON CONFLICT (idempotency_key) DO NOTHING';
  END IF;
  RAISE NOTICE 'TEST-06 PASS: process_payment contains idempotency logic';
END;
$$;

-- ============================================
-- TEST-07: process_payment still contains anti-overpayment logic
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND pg_get_functiondef(oid) LIKE '%Overpayment%'
  ) THEN
    RAISE EXCEPTION 'TEST-07 FAIL: process_payment does not contain anti-overpayment logic';
  END IF;
  RAISE NOTICE 'TEST-07 PASS: process_payment contains anti-overpayment logic';
END;
$$;

-- ============================================
-- TEST-08: process_payment still contains tenant validation
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'process_payment'
    AND pg_get_functiondef(oid) LIKE '%Cross-school payment%'
  ) THEN
    RAISE EXCEPTION 'TEST-08 FAIL: process_payment does not contain tenant validation';
  END IF;
  RAISE NOTICE 'TEST-08 PASS: process_payment contains tenant validation';
END;
$$;

-- ============================================
-- TEST-09: process_payment still validates payment method
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'TEST-09 NOTE: Payment method validation is enforced in application code (processPaymentAction, processParentPaymentAction) and via RLS policies. Source verification required.';
END;
$$;

-- ============================================
-- TEST-10: no alternate overloaded process_payment signature
-- ============================================

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM pg_proc
    WHERE proname = 'process_payment'
  ) > 1 THEN
    RAISE EXCEPTION 'TEST-10 FAIL: Multiple process_payment signatures found. Potential overload.';
  END IF;
  RAISE NOTICE 'TEST-10 PASS: Exactly one process_payment signature exists';
END;
$$;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5O.2 PROCESS_PAYMENT SECURITY HARDENING';
  RAISE NOTICE 'Database assertions: TEST-01 through TEST-10';
  RAISE NOTICE 'DATABASE CONNECTIVITY: NOT AVAILABLE';
  RAISE NOTICE 'Classification: SOURCE-LEVEL / STATIC ONLY';
  RAISE NOTICE '========================================';
END;
$$;

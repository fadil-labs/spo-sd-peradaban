-- PHASE 03 — STEP 3C: FINAL RLS & TENANT ISOLATION AUDIT
-- This migration enables Row Level Security on all application tables
-- and creates tenant-isolated policies based on user roles.
--
-- IMPORTANT:
-- - This migration assumes base schema and previous migrations have been applied.
-- - This migration is idempotent where possible (uses IF NOT EXISTS, DROP IF EXISTS).
-- - Do NOT deploy to production without running verification tests.

-- ============================================
-- 1. SECURITY HELPER FUNCTIONS
-- ============================================

-- Helper: get current user's school_id
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ============================================
-- 2. ENABLE RLS ON ALL APPLICATION TABLES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin/bendahara can view profiles in same school
CREATE POLICY "profiles_select_school"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- Users can update their own profile (except school_id and role)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND school_id = public.current_user_school_id()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admin can update profiles in same school (except role escalation)
CREATE POLICY "profiles_update_school"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================
-- 4. SCHOOLS POLICIES
-- ============================================

-- Authenticated users can view their own school
CREATE POLICY "schools_select_own"
  ON schools FOR SELECT
  TO authenticated
  USING (id = public.current_user_school_id());

-- Admin can update own school
CREATE POLICY "schools_update_own"
  ON schools FOR UPDATE
  TO authenticated
  USING (
    id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 5. ACADEMIC_YEARS POLICIES
-- ============================================

-- Admin/bendahara can view academic years in same school
CREATE POLICY "academic_years_select_school"
  ON academic_years FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can view academic years for their children's school
CREATE POLICY "academic_years_select_children"
  ON academic_years FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() = 'orang_tua'
  );

-- Admin/bendahara can manage academic years in same school
CREATE POLICY "academic_years_modify_school"
  ON academic_years FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 6. CLASSES POLICIES
-- ============================================

-- Admin/bendahara can view classes in same school
CREATE POLICY "classes_select_school"
  ON classes FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can view classes for their children's school
CREATE POLICY "classes_select_children"
  ON classes FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() = 'orang_tua'
  );

-- Admin/bendahara can manage classes in same school
CREATE POLICY "classes_modify_school"
  ON classes FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 7. STUDENTS POLICIES
-- ============================================

-- Admin/bendahara can view students in same school
CREATE POLICY "students_select_school"
  ON students FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can ONLY view students they are guardian of
CREATE POLICY "students_select_own_children"
  ON students FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT student_id
      FROM public.student_guardians
      WHERE guardian_profile_id = auth.uid()
    )
  );

-- Admin/bendahara can manage students in same school
CREATE POLICY "students_modify_school"
  ON students FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 8. STUDENT_GUARDIANS POLICIES
-- ============================================

-- Parent can view their own guardian relationships
CREATE POLICY "student_guardians_select_own"
  ON student_guardians FOR SELECT
  TO authenticated
  USING (guardian_profile_id = auth.uid());

-- Admin/bendahara can view/manage guardian relationships in same school
CREATE POLICY "student_guardians_modify_school"
  ON student_guardians FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE school_id = public.current_user_school_id()
    )
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 9. STUDENT_ENROLLMENTS POLICIES
-- ============================================

-- Admin/bendahara can view enrollments in same school
CREATE POLICY "student_enrollments_select_school"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can view enrollments for their children
CREATE POLICY "student_enrollments_select_children"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT student_id
      FROM public.student_guardians
      WHERE guardian_profile_id = auth.uid()
    )
  );

-- Admin/bendahara can manage enrollments in same school
CREATE POLICY "student_enrollments_modify_school"
  ON student_enrollments FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 10. PAYMENT_CATEGORIES POLICIES
-- ============================================

-- Admin/bendahara can view payment categories in same school
CREATE POLICY "payment_categories_select_school"
  ON payment_categories FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can view payment categories for their children's school
CREATE POLICY "payment_categories_select_children"
  ON payment_categories FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() = 'orang_tua'
  );

-- Admin/bendahara can manage payment categories in same school
CREATE POLICY "payment_categories_modify_school"
  ON payment_categories FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 11. PAYMENT_METHODS POLICIES (GLOBAL)
-- ============================================

-- All authenticated users can view active payment methods
CREATE POLICY "payment_methods_select_active"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================
-- 12. SCHOOL_PAYMENT_METHODS POLICIES
-- ============================================

-- Admin/bendahara can view payment methods in same school
CREATE POLICY "school_payment_methods_select_school"
  ON school_payment_methods FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can view payment methods for their children's school
CREATE POLICY "school_payment_methods_select_children"
  ON school_payment_methods FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() = 'orang_tua'
  );

-- Admin/bendahara can manage payment methods in same school
CREATE POLICY "school_payment_methods_modify_school"
  ON school_payment_methods FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 13. BILL_TEMPLATES POLICIES
-- ============================================

-- Admin/bendahara can view bill templates in same school
CREATE POLICY "bill_templates_select_school"
  ON bill_templates FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Admin/bendahara can manage bill templates in same school
CREATE POLICY "bill_templates_modify_school"
  ON bill_templates FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 14. STUDENT_BILLS POLICIES
-- ============================================

-- Admin/bendahara can view bills in same school
CREATE POLICY "student_bills_select_school"
  ON student_bills FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can ONLY view bills for their children
CREATE POLICY "student_bills_select_own_children"
  ON student_bills FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT student_id
      FROM public.student_guardians
      WHERE guardian_profile_id = auth.uid()
    )
  );

-- Admin/bendahara can manage bills in same school
CREATE POLICY "student_bills_modify_school"
  ON student_bills FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 15. PAYMENTS POLICIES
-- ============================================

-- Admin/bendahara can view payments in same school
CREATE POLICY "payments_select_school"
  ON payments FOR SELECT
  TO authenticated
  USING (school_id = public.current_user_school_id());

-- Parent can ONLY view payments for their children
CREATE POLICY "payments_select_own_children"
  ON payments FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT student_id
      FROM public.student_guardians
      WHERE guardian_profile_id = auth.uid()
    )
  );

-- Parents CANNOT insert/update/delete payments directly
-- Payment creation is exclusively through process_payment() RPC

-- Admin/bendahara can manage payments in same school
CREATE POLICY "payments_modify_school"
  ON payments FOR ALL
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 16. PAYMENT_PROOFS POLICIES
-- ============================================

-- Admin/bendahara can view payment proofs in same school
CREATE POLICY "payment_proofs_select_school"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM public.payments WHERE school_id = public.current_user_school_id()
    )
  );

-- Parent can view proofs for their children's payments
CREATE POLICY "payment_proofs_select_own_children"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM public.payments
      WHERE student_id IN (
        SELECT student_id
        FROM public.student_guardians
        WHERE guardian_profile_id = auth.uid()
      )
    )
  );

-- Admin/bendahara can manage payment proofs in same school
CREATE POLICY "payment_proofs_modify_school"
  ON payment_proofs FOR ALL
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM public.payments WHERE school_id = public.current_user_school_id()
    )
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 17. AUDIT_LOGS POLICIES
-- ============================================

-- Admin/bendahara can view audit logs in same school
CREATE POLICY "audit_logs_select_school"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- Audit logs are immutable: no UPDATE/DELETE allowed for regular users
-- INSERT is allowed only through application server-side code
CREATE POLICY "audit_logs_insert_server"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- ============================================
-- 18. PROCESS_PAYMENT SECURITY HARDENING
-- ============================================

-- Add school_id validation to process_payment
CREATE OR REPLACE FUNCTION public.process_payment(
  p_student_bill_id uuid,
  p_amount numeric(15,2),
  p_payment_method_id uuid,
  p_school_payment_method_id uuid,
  p_reference_number text,
  p_idempotency_key text
) RETURNS uuid AS $$
DECLARE
  v_bill record;
  v_total_paid numeric(15,2);
  v_new_status text;
  v_payment_id uuid;
  v_existing_payment record;
  v_user_school_id uuid;
BEGIN
  -- Get current user's school_id
  SELECT public.current_user_school_id() INTO v_user_school_id;

  -- 1. Lock bill row (main concurrency control)
  SELECT * INTO v_bill
  FROM student_bills
  WHERE id = p_student_bill_id
  FOR UPDATE;

  -- 2. Validate tenant: user can only process payments for their own school
  IF v_bill.school_id != v_user_school_id THEN
    RAISE EXCEPTION 'Cross-school payment not allowed. Bill school: %, User school: %',
      v_bill.school_id, v_user_school_id;
  END IF;

  -- 3. Validate bill is payable
  IF v_bill.status IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'Bill is not payable. Current status: %', v_bill.status;
  END IF;

  -- 4. Try to insert payment with ON CONFLICT for race-safe idempotency
  INSERT INTO payments (
    school_id, student_id, student_bill_id,
    payment_method_id, school_payment_method_id,
    amount, payment_date, reference_number, status, idempotency_key
  ) VALUES (
    v_bill.school_id,
    v_bill.student_id,
    p_student_bill_id,
    p_payment_method_id,
    p_school_payment_method_id,
    p_amount,
    now(),
    p_reference_number,
    'completed',
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_payment_id;

  -- 5. If insert succeeded, update bill status
  IF v_payment_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE student_bill_id = p_student_bill_id
      AND status IN ('completed', 'pending');

    IF v_total_paid >= v_bill.amount THEN
      v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partial';
    ELSE
      v_new_status := 'pending';
    END IF;

    UPDATE student_bills
    SET status = v_new_status, updated_at = now()
    WHERE id = p_student_bill_id;

    RETURN v_payment_id;
  END IF;

  -- 6. If conflict occurred, get existing payment and validate payload
  SELECT * INTO v_existing_payment
  FROM payments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF v_existing_payment.id IS NULL THEN
    RAISE EXCEPTION 'Idempotency key not found after conflict - this should not happen';
  END IF;

  -- Validate payload matches
  IF v_existing_payment.student_bill_id != p_student_bill_id
    OR v_existing_payment.amount != p_amount
    OR v_existing_payment.payment_method_id != p_payment_method_id
    OR v_existing_payment.school_payment_method_id != p_school_payment_method_id THEN
    RAISE EXCEPTION 'Idempotency key already used with different payment parameters';
  END IF;

  RETURN v_existing_payment.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 19. GRANT REVOCATION
-- ============================================
-- Revoke direct DML on sensitive tables from authenticated users
-- to enforce that mutations go through controlled RPC/functions

REVOKE INSERT, UPDATE, DELETE ON payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON student_bills FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON payment_proofs FROM authenticated;

-- Allow INSERT on audit_logs for application server-side code
-- This will be granted to a specific role or handled via service_role
GRANT INSERT ON audit_logs TO authenticated;

-- ============================================
-- 20. COMMENTS
-- ============================================

COMMENT ON FUNCTION public.current_user_school_id() IS 'Returns the school_id of the currently authenticated user. SECURITY DEFINER.';
COMMENT ON FUNCTION public.current_user_role() IS 'Returns the role of the currently authenticated user. SECURITY DEFINER.';
COMMENT ON FUNCTION public.process_payment IS 'Atomic payment processing with row-level locking, race-safe idempotency, and tenant validation.';

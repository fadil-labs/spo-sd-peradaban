-- Fix payment_proofs RLS to allow parents to upload proofs for their children's payments
-- This migration adds a new policy that allows orang_tua to INSERT payment proofs

-- First, drop the overly restrictive policy if it exists
DROP POLICY IF EXISTS "payment_proofs_modify_school" ON payment_proofs;

-- Create separate policies for different roles

-- Admin/bendahara can view all payment proofs in their school
CREATE POLICY "payment_proofs_select_school"
  ON payment_proofs FOR SELECT
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM public.payments WHERE school_id = public.current_user_school_id()
    )
    AND public.current_user_role() IN ('admin', 'bendahara')
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

-- Admin/bendahara can manage (INSERT/UPDATE/DELETE) payment proofs in same school
CREATE POLICY "payment_proofs_admin_modify_school"
  ON payment_proofs FOR ALL
  TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM public.payments WHERE school_id = public.current_user_school_id()
    )
    AND public.current_user_role() IN ('admin', 'bendahara')
  );

-- Parent can INSERT payment proofs for their children's payments
CREATE POLICY "payment_proofs_parent_insert_own_children"
  ON payment_proofs FOR INSERT
  TO authenticated
  WITH CHECK (
    payment_id IN (
      SELECT id FROM public.payments
      WHERE student_id IN (
        SELECT student_id
        FROM public.student_guardians
        WHERE guardian_profile_id = auth.uid()
      )
    )
    AND uploaded_by = auth.uid()
  );

-- Grant necessary DML privileges to authenticated role for payment_proofs
GRANT INSERT, UPDATE ON payment_proofs TO authenticated;

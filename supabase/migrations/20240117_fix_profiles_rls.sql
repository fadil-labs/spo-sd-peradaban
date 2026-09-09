-- Fix RLS policy bug that prevents admin from updating guardian profiles
-- The WITH CHECK clause was checking that the profile role equals the admin's role,
-- which prevented admins from updating guardians with different roles.

DROP POLICY IF EXISTS "profiles_update_school" ON public.profiles;

CREATE POLICY "profiles_update_school"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    school_id = public.current_user_school_id()
    AND public.current_user_role() IN ('admin', 'bendahara')
  )
  WITH CHECK (
    school_id = public.current_user_school_id()
  );

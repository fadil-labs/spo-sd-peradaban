-- Add user management fields to profiles table
-- Run this migration if not already applied

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_school_role ON public.profiles(school_id, role);

-- ============================================
-- FIX RLS: student_guardians_select_own
-- ============================================
-- Issue: Orang tua tidak bisa mengakses tagihan meskipun
--        guardian_profile_id = auth.uid() seharusnya cocok.
-- Fix  : Jadikan policy lebih eksplisit dan tambahkan
--        pemeriksaan langsung ke tabel profiles untuk
--        menghindari perbedaan konteks auth.uid().

-- 1. Drop policy lama jika ada
DROP POLICY IF EXISTS "student_guardians_select_own" ON public.student_guardians;

-- 2. Buat policy baru yang lebih robust
CREATE POLICY "student_guardians_select_own"
  ON public.student_guardians
  FOR SELECT
  TO authenticated
  USING (
    guardian_profile_id = auth.uid()
    OR guardian_profile_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 3. Pastikan RLS aktif
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

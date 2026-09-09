-- ============================================
-- DAPODIK STUDENT FIELDS EXPANSION
-- ============================================
-- Adds Dapodik-specific fields to students table
-- and enables auto guardian linking during import

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nisn text,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('L', 'P')),
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS birth_place text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS rt_rw text,
  ADD COLUMN IF NOT EXISTS kelurahan text,
  ADD COLUMN IF NOT EXISTS kecamatan text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS student_phone text,
  ADD COLUMN IF NOT EXISTS student_email text,
  ADD COLUMN IF NOT EXISTS child_order integer,
  ADD COLUMN IF NOT EXISTS father_name text,
  ADD COLUMN IF NOT EXISTS father_occupation text,
  ADD COLUMN IF NOT EXISTS mother_name text,
  ADD COLUMN IF NOT EXISTS mother_occupation text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS dapodik_metadata jsonb DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_nisn_per_school
  ON public.students (school_id, nisn)
  WHERE nisn IS NOT NULL AND nisn <> '';

CREATE INDEX IF NOT EXISTS idx_students_nisn
  ON public.students (nisn);

COMMENT ON COLUMN public.students.nisn IS 'Nomor Induk Siswa Nasional';
COMMENT ON COLUMN public.students.gender IS 'Jenis kelamin: L = Laki-laki, P = Perempuan';
COMMENT ON COLUMN public.students.religion IS 'Agama';
COMMENT ON COLUMN public.students.birth_place IS 'Tempat lahir';
COMMENT ON COLUMN public.students.address_street IS 'Alamat jalan';
COMMENT ON COLUMN public.students.rt_rw IS 'RT/RW';
COMMENT ON COLUMN public.students.kelurahan IS 'Kelurahan';
COMMENT ON COLUMN public.students.kecamatan IS 'Kecamatan';
COMMENT ON COLUMN public.students.city IS 'Kabupaten/Kota';
COMMENT ON COLUMN public.students.postal_code IS 'Kode pos';
COMMENT ON COLUMN public.students.student_phone IS 'No telepon siswa';
COMMENT ON COLUMN public.students.student_email IS 'Email siswa';
COMMENT ON COLUMN public.students.child_order IS 'Anak ke berapa';
COMMENT ON COLUMN public.students.father_name IS 'Nama ayah';
COMMENT ON COLUMN public.students.father_occupation IS 'Pekerjaan ayah';
COMMENT ON COLUMN public.students.mother_name IS 'Nama ibu';
COMMENT ON COLUMN public.students.mother_occupation IS 'Pekerjaan ibu';
COMMENT ON COLUMN public.students.guardian_phone IS 'No HP orang tua/wali';
COMMENT ON COLUMN public.students.dapodik_metadata IS 'Metadata tambahan dari Dapodik';

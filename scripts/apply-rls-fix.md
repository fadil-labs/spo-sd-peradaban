# Cara Menerapkan Fix RLS Policy

## Metode 1: Via Supabase Dashboard (Recommended)

1. Buka **Supabase Dashboard**: https://supabase.com/dashboard/project/azugckptrmgxsilbiffb/editor
2. Klik tab **SQL Editor**
3. Paste SQL berikut:

```sql
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
```

4. Klik **Run** untuk eksekusi
5. Verifikasi dengan query:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'student_guardians';
```

## Metode 2: Via Supabase CLI (jika lokal terhubung)

```bash
cd D:\spo-sd-peradaban
npx supabase db query --db-url "postgresql://postgres:[password]@[host]:5432/postgres" -f supabase/migrations/20260911210000_fix_student_guardians_rls.sql
```

## Setelah Fix

1. **Logout** dari aplikasi
2. **Clear cookies** browser untuk `localhost:3000`
3. **Login kembali** sebagai `2425001@sekolah.id`
4. Coba akses halaman tagihan lagi

## Verifikasi

Setelah migration diterapkan, query ini harus return data:
```sql
SELECT * FROM student_guardians 
WHERE guardian_profile_id = '723d4f55-791a-44be-b42f-a398c68635ce';
```

## Troubleshooting

Jika masih error "Anda tidak memiliki akses ke tagihan ini.":
1. Cek apakah migration sudah berjalan dengan sukses
2. Cek RLS policy dengan query di atas
3. Cek apakah user masih login dengan session yang benar
4. Coba logout dan login kembali

## Catatan

Migration file sudah dibuat di:
`D:\spo-sd-peradaban\supabase\migrations\20260911210000_fix_student_guardians_rls.sql`

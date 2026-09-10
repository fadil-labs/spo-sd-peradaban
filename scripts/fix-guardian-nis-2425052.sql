-- ============================================
-- FIX DATA GUARDIAN NIS 2425052
-- Expected: Fadil (Ayah) + Nofiati (Ibu)
-- ============================================

-- 1. Cek data siswa
SELECT '=== DATA SISWA ===' AS info;
SELECT id, nis, full_name FROM students WHERE nis = '2425052';

-- 2. Cek guardian saat ini
SELECT '=== GUARDIAN SAAT INI ===' AS info;
SELECT sg.id, sg.guardian_profile_id, sg.relationship, p.full_name, p.email, p.phone
FROM student_guardians sg
JOIN profiles p ON p.id = sg.guardian_profile_id
WHERE sg.student_id = (SELECT id FROM students WHERE nis = '2425052');

-- 3. Cek apakah Fadil sudah ada
SELECT '=== CEK APAKAH FADIL SUDAH ADA ===' AS info;
SELECT id, full_name, email, phone FROM profiles WHERE full_name ILIKE '%Fadil%' AND school_id = '11111111-1111-1111-1111-111111111111';

-- 4. Hapus relasi guardian yang salah (jika ada)
SELECT '=== HAPUS RELASI YANG SALAH ===' AS info;
DELETE FROM student_guardians 
WHERE student_id = (SELECT id FROM students WHERE nis = '2425052');

-- 5. Update Nofiati menjadi Ibu (jika belum)
SELECT '=== UPDATE NOFIATI ===' AS info;
UPDATE profiles 
SET role = 'orang_tua'
WHERE id = '8380a0ce-5943-434f-9579-b402221159ad';

-- 6. Insert Nofiati sebagai Ibu
SELECT '=== INSERT NOFIATI SEBAGAI IBU ===' AS info;
INSERT INTO student_guardians (guardian_profile_id, student_id, relationship)
VALUES ('8380a0ce-5943-434f-9579-b402221159ad', '893e03c7-e5a2-44d1-99aa-6e65519e6bc5', 'ibu')
ON CONFLICT DO NOTHING;

-- 7. Buat profile baru untuk Fadil (Ayah)
-- Catat ID yang dihasilkan untuk langkah selanjutnya
SELECT '=== BUAT PROFIL FADIL ===' AS info;
INSERT INTO profiles (id, school_id, role, full_name, phone, email, username, must_change_password)
VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'orang_tua',
  'Fadil',
  '81927157103',
  'fadilbinmadisa@gmail.com',
  'nis_2425052_ayah',
  true
)
ON CONFLICT (id) DO NOTHING
RETURNING id AS fadil_profile_id;

-- 8. Ambil ID Fadil yang baru dibuat (GANTI DENGAN ID YANG SESUAI DARI LANGKAH 7)
-- SELECT id FROM profiles WHERE full_name = 'Fadil' AND phone = '81927157103';

-- 9. Insert Fadil sebagai Ayah (GANTI <fadil_id> DENGAN ID YANG SESUAI)
-- SELECT '=== INSERT FADIL SEBAGAI AYAH ===' AS info;
-- INSERT INTO student_guardians (guardian_profile_id, student_id, relationship)
-- VALUES ('<fadil_id>', '893e03c7-e5a2-44d1-99aa-6e65519e6bc5', 'ayah')
-- ON CONFLICT DO NOTHING;

-- 10. Verifikasi akhir
SELECT '=== VERIFIKASI AKHIR ===' AS info;
SELECT sg.id, sg.guardian_profile_id, sg.relationship, p.full_name, p.email, p.phone
FROM student_guardians sg
JOIN profiles p ON p.id = sg.guardian_profile_id
WHERE sg.student_id = '893e03c7-e5a2-44d1-99aa-6e65519e6bc5';

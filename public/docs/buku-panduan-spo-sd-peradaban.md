# 📚 Buku Panduan Aplikasi SPO SD Peradaban

## Sistem Pembayaran Online - Sekolah Dasar Peradaban

**Versi 1.0 - 2026**

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
   - Apa itu SPO SD Peradaban?
   - Fitur Utama
   - Manfaat Penggunaan
   - Peran Pengguna
2. [Memulai](#2-memulai)
   - Mengakses Aplikasi
   - Login ke Sistem
   - Reset Password
   - Logout
3. [Dashboard Admin](#3-dashboard-admin)
   - Ringkasan Dashboard
   - Manajemen Siswa
   - Manajemen Tagihan
   - Verifikasi Bukti Pembayaran
   - Laporan Keuangan
   - Audit Log
4. [Dashboard Bendahara](#4-dashboard-bendahara)
   - Ringkasan Dashboard
   - Verifikasi Bukti Pembayaran
   - Pembayaran Manual
   - Manajemen Metode Pembayaran
5. [Dashboard Orang Tua](#5-dashboard-orang-tua)
   - Ringkasan Dashboard
   - Melihat Tagihan
   - Membuat Pembayaran
   - Mengunggah Bukti Pembayaran
   - Melihat Riwayat Pembayaran
   - Mengunduh Kuitansi
6. [Metode Pembayaran](#6-metode-pembayaran)
   - Jenis Metode Pembayaran
   - Proses Pembayaran QRIS
   - Proses Pembayaran Transfer Bank
7. [Cicilan Tagihan](#7-cicilan-tagihan)
   - Apa itu Cicilan Tagihan?
   - Mengaktifkan Cicilan (Admin)
   - Melihat Progres Cicilan (Orang Tua)
   - Membayar Cicilan
8. [Troubleshooting](#8-troubleshooting)
   - Masalah Login
   - Masalah Pembayaran
   - Masalah Upload Bukti
   - Masalah Lainnya
9. [FAQ](#9-faq)
   - Pertanyaan Umum
   - Kontak Support

---

## 1. Pendahuluan

### 1.1 Apa itu SPO SD Peradaban?

SPO SD Peradaban adalah **Sistem Pembayaran Online** untuk Sekolah Dasar Peradaban. Aplikasi ini memudahkan pengelolaan pembayaran sekolah, mulai dari pembuatan tagihan, penerimaan pembayaran, verifikasi bukti pembayaran, hingga pelaporan keuangan.

### 1.2 Fitur Utama

| Fitur | Keterangan |
|-------|------------|
| Manajemen Tagihan | Membuat dan mengelola tagihan siswa |
| Pembayaran Online | Pembayaran melalui berbagai metode |
| Bukti Pembayaran | Upload dan verifikasi bukti transfer |
| Cicilan Tagihan | Pembayaran bertahap dengan tracking cicilan |
| Laporan Keuangan | Laporan otomatis untuk admin dan bendahara |
| Notifikasi | Notifikasi real-time untuk semua pengguna |
| Audit Trail | Pencatatan semua aktivitas keuangan |

### 1.3 Manfaat Penggunaan

- **Admin:** Kelola seluruh operasi pembayaran sekolah
- **Bendahara:** Proses dan verifikasi pembayaran dengan mudah
- **Orang Tua:** Bayar tagihan sekolah secara online kapan saja

### 1.4 Peran Pengguna

| Peran | Hak Akses |
|-------|-----------|
| 🔵 Admin | Kelola seluruh sistem, siswa, tagihan, laporan |
| 🟢 Bendahara | Verifikasi pembayaran, kelola metode pembayaran |
| 🟡 Orang Tua | Bayar tagihan, upload bukti, lihat riwayat |

---

## 2. Memulai

### 2.1 Mengakses Aplikasi

Buka browser dan akses alamat:

**URL:** https://spo.krakataumedia.com

**Browser yang Didukung:** Chrome, Firefox, Edge, Safari (versi terbaru)

### 2.2 Login ke Sistem

1. Buka aplikasi di browser
2. Masukkan email dan password yang diberikan oleh admin
3. Klik tombol **"Masuk"**
4. Anda akan diarahkan ke dashboard sesuai peran Anda

> **Catatan:** Halaman login menampilkan form email dan password. Pastikan Anda menggunakan kredensial yang diberikan oleh admin sekolah.

### 2.3 Reset Password

Jika lupa password:

1. Klik link **"Lupa Password?"** di halaman login
2. Masukkan email yang terdaftar
3. Cek email untuk link reset password
4. Ikuti instruksi di email untuk membuat password baru

> ⚠️ **Penting:** Hubungi admin sekolah jika tidak menerima email reset password.

### 2.4 Logout

Untuk keluar dari sistem:

1. Klik menu profil di pojok kanan atas
2. Pilih **"Keluar"**
3. Anda akan diarahkan kembali ke halaman login

---

## 3. Dashboard Admin

> 🔵 **Hanya untuk Admin**

### 3.1 Ringkasan Dashboard

Setelah login sebagai Admin, Anda akan melihat dashboard dengan informasi:

- Total siswa aktif
- Total tagihan bulan ini
- Pembayaran yang berhasil
- Pembayaran yang menunggu verifikasi

### 3.2 Manajemen Siswa

#### Tambah Siswa Baru

1. Klik menu **"Siswa"** di sidebar
2. Klik tombol **"Tambah Siswa"**
3. Isi form data siswa:
   - NIS (Nomor Induk Siswa)
   - Nama lengkap
   - Tanggal lahir
   - Alamat
   - Status (aktif/non-aktif)
4. Klik **"Simpan"**

#### Edit Data Siswa

1. Buka menu **"Siswa"**
2. Cari siswa yang ingin diedit
3. Klik ikon **edit** pada baris siswa
4. Ubah data yang diperlukan
5. Klik **"Simpan Perubahan"**

#### Hapus Siswa

> ⚠️ **Peringatan:** Siswa yang sudah memiliki transaksi pembayaran tidak dapat dihapus. Gunakan opsi "Non-aktifkan" sebagai gantinya.

### 3.3 Manajemen Tagihan

#### Membuat Tagihan Baru

1. Klik menu **"Tagihan Siswa"**
2. Klik **"Buat Tagihan"**
3. Pilih siswa dari dropdown
4. Pilih kategori pembayaran (SPP, Daftar Ulang, dll)
5. Masukkan jumlah tagihan
6. Atur tanggal jatuh tempo
7. Klik **"Buat Tagihan"**

#### Mengatur Cicilan Tagihan

1. Buka detail tagihan siswa
2. Klik tab **"Cicilan"**
3. Atur jumlah cicilan (misal: 3x)
4. Tentukan tanggal jatuh tempo setiap cicilan
5. Klik **"Simpan Rencana Cicilan"**

### 3.4 Verifikasi Bukti Pembayaran

1. Klik menu **"Bukti Pembayaran"**
2. Lihat daftar bukti yang menunggu verifikasi
3. Klik **"Detail"** untuk melihat bukti
4. Periksa bukti pembayaran:
   - Apakah nominal sesuai tagihan?
   - Apakah tanggal transfer sesuai?
   - Apakah bukti jelas dan terbaca?
5. Klik **"Setuju"** atau **"Tolak"**
6. Jika menolak, isi alasan penolakan

> ℹ️ **Info:** Setiap verifikasi dicatat dalam audit trail untuk keamanan.

### 3.5 Laporan Keuangan

1. Klik menu **"Laporan Keuangan"**
2. Pilih periode laporan (bulan/tahun)
3. Lihat ringkasan:
   - Total pembayaran masuk
   - Pembayaran per metode
   - Tagihan belum dibayar
4. Klik **"Export"** untuk mengunduh laporan Excel/PDF

### 3.6 Audit Log

Admin dapat melihat semua aktivitas sistem:

1. Klik menu **"Audit Log"**
2. Filter berdasarkan:
   - Tanggal
   - Jenis aksi
   - Pengguna yang melakukan aksi
3. Lihat detail setiap aktivitas

---

## 4. Dashboard Bendahara

> 🟢 **Hanya untuk Bendahara**

### 4.1 Ringkasan Dashboard

Dashboard bendahara menampilkan:

- Pembayaran yang menunggu verifikasi
- Total pembayaran hari ini
- Total pembayaran bulan ini
- Metode pembayaran yang aktif

### 4.2 Verifikasi Bukti Pembayaran

Fitur utama bendahara adalah memverifikasi bukti pembayaran yang diupload oleh orang tua:

1. Buka menu **"Bukti Pembayaran"**
2. Lihat daftar bukti dengan status **"Menunggu Verifikasi"**
3. Klik **"Lihat Bukti"** untuk memperbesar gambar
4. Periksa kelengkapan bukti:
   - Nama pengirim sesuai dengan orang tua siswa?
   - Nominal transfer sesuai tagihan?
   - Tanggal transfer jelas?
   - Bukti tidak di-edit atau dimanipulasi?
5. Jika bukti valid, klik **"Setuju"**
6. Jika bukti tidak valid, klik **"Tolak"** dan isi alasan penolakan

> 📝 **Catatan:** Setelah disetujui, status pembayaran otomatis berubah menjadi "Berhasil" dan orang tua akan menerima notifikasi.

### 4.3 Pembayaran Manual

Untuk pembayaran tunai/transfer langsung:

1. Klik menu **"Pembayaran"**
2. Klik **"Input Pembayaran Manual"**
3. Pilih siswa dan tagihan
4. Masukkan jumlah pembayaran
5. Pilih metode pembayaran
6. Klik **"Simpan"**

### 4.4 Manajemen Metode Pembayaran

1. Klik menu **"Metode Pembayaran"**
2. Aktifkan/nonaktifkan metode pembayaran yang tersedia
3. Klik **"Simpan"**

---

## 5. Dashboard Orang Tua

> 🟡 **Hanya untuk Orang Tua**

### 5.1 Ringkasan Dashboard

Setelah login, orang tua akan melihat:

- Daftar anak yang terdaftar
- Tagihan aktif yang perlu dibayar
- Status pembayaran terakhir
- Notifikasi penting

### 5.2 Melihat Tagihan

1. Klik menu **"Tagihan"** di sidebar
2. Lihat daftar tagihan untuk setiap anak
3. Klik tagihan untuk melihat detail:
   - Jumlah tagihan
   - Tanggal jatuh tempo
   - Status pembayaran
   - Riwayat pembayaran

### 5.3 Membuat Pembayaran

#### Pembayaran QRIS

1. Buka detail tagihan yang ingin dibayar
2. Klik **"Bayar Sekarang"**
3. Pilih metode pembayaran **QRIS**
4. Masukkan jumlah yang ingin dibayar
5. Klik **"Buat Pembayaran"**
6. Scan QR code yang muncul dengan aplikasi pembayaran
7. Selesaikan pembayaran di aplikasi Anda

#### Pembayaran Transfer Bank

1. Pilih metode **"Transfer Bank"**
2. Transfer ke nomor rekening yang ditampilkan
3. Simpan bukti transfer (screenshot/foto)
4. Upload bukti transfer ke sistem
5. Tunggu verifikasi dari admin/bendahara

#### Pembayaran Cicilan

Jika tagihan memiliki rencana cicilan:

1. Lihat bagian "Rencana Cicilan" di detail tagihan
2. Lihat cicilan keberapa yang harus dibayar
3. Bayar jumlah sesuai dengan cicilan tersebut
4. Ulangi sampai semua cicilan lunas

> 💡 **Tips:** Anda bisa melihat progres cicilan di halaman detail tagihan. Cicilan yang sudah dibayar akan ditandai "Lunas".

### 5.4 Mengunggah Bukti Pembayaran

Untuk pembayaran transfer bank atau manual:

1. Setelah transfer, kembali ke halaman tagihan
2. Klik **"Unggah Bukti Pembayaran"**
3. Pilih file bukti transfer (format JPG, PNG, PDF)
4. Klik **"Upload"**
5. Tunggu verifikasi dari admin/bendahara (1x24 jam)

**Persyaratan bukti pembayaran:**

- Foto/screenshot transfer yang jelas
- Nama pengirim harus sesuai dengan nama orang tua
- Tanggal transfer terlihat jelas
- Nominal transfer sesuai tagihan

### 5.5 Melihat Riwayat Pembayaran

1. Klik menu **"Pembayaran"**
2. Lihat daftar semua pembayaran yang pernah dilakukan
3. Setiap pembayaran menampilkan:
   - Tanggal pembayaran
   - Metode pembayaran
   - Jumlah
   - Status (Berhasil/Gagal/Menunggu)

### 5.6 Mengunduh Kuitansi

1. Buka menu **"Pembayaran"**
2. Cari pembayaran yang sudah berhasil
3. Klik ikon **"Cetak/Download"**
4. Kuitansi akan terbuka di tab baru untuk dicetak atau disimpan sebagai PDF

---

## 6. Metode Pembayaran

### 6.1 Jenis Metode Pembayaran

| Metode | Deskripsi | Proses Verifikasi |
|--------|-----------|------------------|
| **QRIS** | Pembayaran scan QR code | Otomatis (real-time) |
| **Transfer Bank** | Transfer ke rekening sekolah | Manual (admin/bendahara) |
| **Virtual Account** | Pembayaran via VA | Otomatis (real-time) |
| **Cash** | Pembayaran tunai di sekolah | Manual (admin/bendahara) |

### 6.2 Proses Pembayaran QRIS

1. Pilih tagihan yang ingin dibayar
2. Klik **"Bayar dengan QRIS"**
3. Scan QR code dengan aplikasi pembayaran (GoPay, OVO, DANA, dll)
4. Masukkan PIN atau konfirmasi pembayaran
5. Tunggu konfirmasi (beberapa detik)
6. Status pembayaran otomatis berubah menjadi "Berhasil"

### 6.3 Proses Pembayaran Transfer Bank

1. Pilih tagihan yang ingin dibayar
2. Pilih metode **"Transfer Bank"**
3. Transfer ke nomor rekening yang ditampilkan
4. Simpan bukti transfer (screenshot atau foto)
5. Upload bukti transfer di aplikasi
6. Tunggu verifikasi admin/bendahara (maksimal 1x24 jam)
7. Anda akan menerima notifikasi ketika pembayaran diverifikasi

> ⚠️ **Penting:** Pastikan nominal transfer sesuai dengan tagihan. Jika ada kekurangan atau kelebihan, verifikasi mungkin ditolak.

---

## 7. Cicilan Tagihan

### 7.1 Apa itu Cicilan Tagihan?

Cicilan tagihan memungkinkan orang tua membayar tagihan sekolah secara bertahap dalam beberapa kali pembayaran, bukan sekaligus.

### 7.2 Mengaktifkan Cicilan (Admin)

1. Buka detail tagihan siswa
2. Klik tab **"Cicilan"**
3. Atur jumlah cicilan (misal: 3x atau 4x)
4. Tentukan tanggal jatuh tempo setiap cicilan
5. Klik **"Simpan Rencana Cicilan"**

### 7.3 Melihat Progres Cicilan (Orang Tua)

1. Buka detail tagihan
2. Lihat bagian **"Rencana Cicilan"**
3. Anda akan melihat:
   - Total cicilan yang harus dibayar
   - Cicilan keberapa yang aktif
   - Cicilan mana yang sudah lunas
   - Sisa tagihan yang belum dibayar

### 7.4 Membayar Cicilan

1. Buka detail tagihan
2. Lihat cicilan yang aktif (ditandai dengan warna berbeda)
3. Klik **"Bayar Cicilan"**
4. Pilih metode pembayaran
5. Selesaikan pembayaran
6. Cicilan akan otomatis ditandai "Lunas"

> ℹ️ **Info:** Sistem akan otomatis menghitung jumlah cicilan berdasarkan total tagihan dibagi jumlah cicilan.

---

## 8. Troubleshooting

### 8.1 Masalah Login

| Masalah | Solusi |
|---------|--------|
| Tidak bisa login | Periksa email dan password. Jika lupa, klik "Lupa Password" |
| Akun terkunci | Hubungi admin untuk membuka kunci akun |
| Halaman login berulang | Clear cache browser atau coba browser lain |

### 8.2 Masalah Pembayaran

| Masalah | Solusi |
|---------|--------|
| Pembayaran QRIS gagal | Coba scan QR code lagi atau pilih metode pembayaran lain |
| Bukti pembayaran ditolak | Periksa alasan penolakan dan upload bukti baru yang sesuai |
| Status pembayaran tidak berubah | Tunggu beberapa menit atau refresh halaman |
| Tidak ada metode pembayaran | Hubungi admin untuk mengaktifkan metode pembayaran |

### 8.3 Masalah Upload Bukti

| Masalah | Solusi |
|---------|--------|
| Upload gagal | Periksa ukuran file (maks 5MB) dan format (JPG, PNG, PDF) |
| Bukti blur/tidak jelas | Ambil foto baru dengan pencahayaan yang baik |
| Tidak bisa memilih file | Periksa izin browser untuk mengakses file |

### 8.4 Masalah Lainnya

| Masalah | Solusi |
|---------|--------|
| Halaman tidak loading | Refresh halaman (F5) atau clear cache browser |
| Data tidak muncul | Periksa koneksi internet dan refresh halaman |
| Tidak menerima notifikasi | Periksa folder spam di email atau hubungi admin |

> ⚠️ **Masalah belum teratasi?** Hubungi admin sekolah atau kirim email ke support@sdperadaban.sch.id

---

## 9. FAQ

### 9.1 Pertanyaan Umum

**Q: Bagaimana cara mendaftar sebagai orang tua?**

A: Hubungi admin sekolah untuk mendaftarkan anak Anda. Admin akan membuat akun dan memberikan login credentials.

**Q: Apakah pembayaran online aman?**

A: Ya, sistem menggunakan enkripsi SSL dan terintegrasi dengan payment gateway yang terpercaya. Semua transaksi dicatat dalam audit trail.

**Q: Berapa lama verifikasi bukti pembayaran?**

A: Maksimal 1x24 jam kerja. Admin/bendahara akan memverifikasi dan mengirim notifikasi.

**Q: Apakah saya bisa bayar cicilan lebih dari satu sekaligus?**

A: Yes, Anda bisa membayar lebih dari satu cicilan dalam satu transaksi. Sistem akan otomatis menandai cicilan yang sesuai.

**Q: Bagaimana jika saya transfer dengan nominal yang salah?**

A: Hubungi admin sekolah segera untuk konfirmasi. Verifikasi mungkin ditolak jika nominal tidak sesuai.

**Q: Apakah ada biaya tambahan untuk menggunakan aplikasi?**

A: Tidak, aplikasi ini disediakan gratis oleh sekolah. Hanya biaya admin bank yang mungkin berlaku untuk metode pembayaran tertentu.

**Q: Bisakah saya melihat kuitansi pembayaran lama?**

A: Ya, buka menu "Pembayaran" dan klik pada pembayaran yang ingin dilihat kuitansinya.

**Q: Bagaimana cara mengubah data profil?**

A: Klik menu "Profil" dan pilih "Edit Profil". Ubah data yang diperlukan dan klik "Simpan".

**Q: Apakah aplikasi bisa diakses di HP?**

A: Ya, aplikasi responsif dan bisa diakses di smartphone, tablet, maupun komputer.

**Q: Bagaimana jika ada masalah dengan aplikasi?**

A: Hubungi admin sekolah atau kirim email ke support@sdperadaban.sch.id dengan screenshot masalah yang terjadi.

### 9.2 Kontak Support

| Kontak | Informasi |
|--------|----------|
| Email | support@sdperadaban.sch.id |
| Telepon | (021) 1234-5678 |
| Jam Operasional | Senin - Jumat, 08:00 - 15:00 WIB |
| Alamat | Sekolah Dasar Peradaban |

---

## Penutup

Buku panduan ini dibuat untuk membantu seluruh pengguna Sistem Pembayaran Online (SPO) SD Peradaban dalam menggunakan aplikasi dengan efektif dan efisien.

### Kesimpulan

Aplikasi SPO SD Peradaban memudahkan:

- **Admin** dalam mengelola seluruh sistem pembayaran
- **Bendahara** dalam memverifikasi dan memproses pembayaran
- **Orang Tua** dalam membayar tagihan sekolah secara online

### Tips Penggunaan

- Selalu periksa tagihan secara berkala
- Upload bukti pembayaran segera setelah transfer
- Simpan kuitansi pembayaran untuk arsip
- Gunakan notifikasi untuk tracking pembayaran
- Hubungi admin jika ada kendala

### Pengembangan Selanjutnya

Fitur yang akan ditambahkan di masa depan:

- Aplikasi mobile (Android/iOS)
- Notifikasi WhatsApp
- Integrasi dengan payment gateway lain
- Laporan keuangan yang lebih detail
- Dukungan multi-bahasa

---

<div style="text-align: center; margin-top: 50px; padding: 20px; background: #f0f0f0; border-radius: 8px;">
  <p><strong>Terima kasih telah menggunakan SPO SD Peradaban!</strong></p>
  <p style="margin-top: 10px;">© 2026 SD Peradaban. All rights reserved.</p>
</div>

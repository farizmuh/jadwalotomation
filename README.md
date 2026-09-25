# Sistem Jadwal Pelajaran Otomatis & Anti-Bentrok - SMKS Islam Donomulyo

Website aplikasi penyusunan jadwal pelajaran otomatis (auto-scheduler) dan editor interaktif berbasis **Nuxt 3**, **Nuxt UI (Tailwind CSS)**, **Prisma ORM**, dan **MySQL**.

---

## 🚀 Fitur Unggulan
1. **Matriks Master (Replika Sesuai Foto)**:
   - Tampilan jadwal Senin - Jumat lengkap dengan jam ke, waktu, dan seluruh 10 kelas (X BDP/TKJ/MP, XI BDP/TKJ/MP, XII BDP/T1/T2/MP).
   - Penandaan jam Upacara/Apel, Istirahat, dan Sholat Jumat / Keputrian.
   - Panel Guru Piket harian di bawah setiap hari.
   - Panel Pembina Ekstrakurikuler di sisi kanan.
   - Tabel Kode Guru (1 s/d 29) lengkap dengan gelar akademik.
   - Lembar tanda tangan resmi Kepala Sekolah dan Wakakur (ruang tanda tangan & stempel manual).
2. **Mesin Anti-Tabrakan (Anti-Collision Engine)**:
   - Memastikan tidak ada guru yang mengajar di lebih dari satu kelas pada hari dan jam yang sama.
   - Peringatan instan real-time jika terjadi bentrok saat admin mengedit jadwal.
   - Panel inspeksi tabrakan dengan indikator status bentrok.
3. **Auto-Generate Jadwal Cerdas**:
   - Men-generate seluruh jadwal secara otomatis bebas tabrakan (0 bentrok) dengan pemerataan beban mengajar antar guru.
4. **Editor Sel Interaktif**:
   - Klik pada sel manapun untuk mengganti guru dan sub-kode mapel (`9a`, `16c`, `25b`, dll.).
   - Menampilkan status ketersediaan guru (apakah sedang mengajar di kelas lain pada jam tersebut).
5. **Multi-View Filter**:
   - **Tampilan Master**: Seluruh jadwal sekolah dalam satu matriks besar.
   - **Tampilan per Guru**: Jadwal personal khusus tiap guru (lengkap dengan penghitung total jam mengajar per minggu).
   - **Tampilan per Kelas**: Jadwal khusus untuk masing-masing kelas siap tempel di dinding.
6. **Ekspor & Cetak**:
   - **Ekspor Excel (.xlsx)**: File spreadsheet dengan layout rapi dan format sel.
   - **Cetak / PDF**: Mode cetak lanskap ramah kertas langsung dari browser.
7. **Pengaturan & Master Data**:
   - Kelola Guru & Kode Guru.
   - Kelola Kelas & Jurusan.
   - **Kelola Hari (Tambah & Hapus Hari)**: Tambah hari baru (misal: SABTU) atau hapus hari yang tidak aktif.
   - **Kelola Jam Pelajaran & Istirahat (Tambah, Edit & Hapus)**: Edit nomor Jam Ke, Waktu Mulai, Waktu Selesai, Tipe Slot, dan Keterangan/Label.
   - Kelola Guru Piket harian & Pembina Ekskul.
   - Kelola Profil Sekolah & Tanda Tangan.

---

## 🛠️ Menjalankan Aplikasi

Aplikasi saat ini telah aktif di:
👉 **http://localhost:3000**

### Perintah Penting (Terminal):
- **Menjalankan Dev Server**:
  ```bash
  npm run dev
  ```
- **Melihat & Mengedit Database via GUI (Prisma Studio)**:
  ```bash
  npm run db:studio
  ```
- **Mereset / Mengisi Ulang Data Asli dari Template Foto**:
  ```bash
  npm run db:seed
  ```
- **Sinkronisasi Skema Database**:
  ```bash
  npm run db:push
  ```

---

## 🗄️ Konfigurasi Database (MySQL)
- **Host**: `127.0.0.1:3306` (Laragon / XAMPP)
- **Database**: `jadwal_sekolah`
- **User**: `root`
- **Password**: *(kosong)*

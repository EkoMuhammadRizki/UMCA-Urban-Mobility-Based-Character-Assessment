# UMCA — Urban Mobility-Based Character Assessment

**UMCA** adalah sistem absensi digital dan asesmen karakter kedisiplinan siswa berbasis kartu/tag NFC (Near Field Communication) yang dirancang khusus untuk sistem absensi Sekolah Dasar (SD) di Jakarta. 

Aplikasi ini mempermudah guru dan sekolah dalam memantau kehadiran siswa secara *real-time* guna mengevaluasi perilaku serta mobilitas karakter siswa sehari-hari.

---

## 🚀 Fitur Utama

- **Absensi Berbasis NFC**: Integrasi nirkabel dengan pemindai NFC untuk pencatatan kehadiran yang instan dan akurat.
- **Dashboard Guru**: Halaman ringkasan statistik kehadiran siswa harian dengan diagram visual yang interaktif.
- **Rekap Kehadiran**: Tabel kehadiran bulanan yang lengkap dengan filter tanggal dan status kehadiran, serta fitur ekspor ke Excel.
- **Data & Profil Siswa**: Kelola data siswa, detail identifikasi kartu NFC, dan catatan karakter kedisiplinan per individu.
- **Sistem Keamanan & Login**: Halaman autentikasi guru yang aman dengan sistem konfirmasi logout terintegrasi (SweetAlert2).

---

## 🛠️ Tech Stack

- **Core Framework**: [Next.js](https://nextjs.org/) (React 19 & Turbopack)
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Dialog & UI Popups**: SweetAlert2 & Shadcn/ui Components
- **Data Exporting**: SheetJS (XLSX)

---

## 💻 Memulai Pengembangan

### Prasyarat
Pastikan Anda sudah menginstal Node.js (versi terbaru direkomendasikan) di komputer Anda.

### Instalasi Dependensi
Jalankan perintah berikut pada direktori project untuk memasang semua modul pendukung:
```bash
npm install
```

### Menjalankan Server Pengembangan
Jalankan server lokal untuk melihat aplikasi secara langsung:
```bash
npm run dev
```

Buka browser Anda dan akses halaman [http://localhost:3000](http://localhost:3000).

---

## 📂 Struktur Project

```text
├── public/
│   ├── logo/
│   │   └── Logo UMCA.png      # Logo resmi aplikasi
├── src/
│   ├── app/                   # Rute & Page Next.js (App Router)
│   │   ├── login/             # Halaman login guru
│   │   └── guru/              # Halaman dashboard, siswa, dan rekap
│   ├── components/            # Komponen UI & Layout yang dapat digunakan kembali
│   └── lib/                   # Fungsi helper, utilitas ekspor, dan data tiruan (mock data)
```

---
© 2026 UMCA Jakarta. All rights reserved.

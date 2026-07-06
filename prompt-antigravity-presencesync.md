# Prompt Antigravity — PresenceSync / UMCA Dashboard (Next.js)

Copy-paste seluruh isi di bawah ini ke Antigravity sebagai prompt awal project.

---

## 1. Context

Saya sedang membangun **PresenceSync**, sebuah web app pendukung riset **UrbanMobility Character Assessment (UMCA)** — instrumen asesmen digital karakter kedisiplinan & peduli lingkungan siswa SD berbasis NFC reader di halte sekolah (bukan device pribadi siswa). Setiap siswa punya NFC tag di tas; saat tap di reader halte, timestamp tercatat dan dibandingkan dengan jam masuk sekolah untuk menentukan status **Tepat Waktu** atau **Telat**.

Bangun dashboard **role Guru** sebagai prioritas utama pengembangan saat ini (role Admin/Orang Tua bisa berupa stub/placeholder untuk sekarang).

Desain visual **wajib** mengikuti panduan warna & komponen di `design-system-trustfleet.md` (sudah saya sediakan terpisah) — gaya fintech dashboard, sidebar navy gelap, card putih dengan aksen biru.

---

## 2. Tech Stack (wajib)

- **Framework**: Next.js 14+ (App Router, Server Components dimana relevan)
- **Bahasa**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui (untuk table, dialog, calendar, button, badge)
- **Charting**: Recharts (untuk grafik ketepatan waktu)
- **Kalender / date picker**: `react-day-picker` (dibungkus shadcn `Calendar`) — mode pilih bulan, bukan tanggal tunggal
- **Export Excel**: `xlsx` (SheetJS) — generate `.xlsx` di client atau via API route
- **Date utility**: `date-fns` (untuk deteksi weekday, format tanggal, generate range bulan)
- **Auth**: NextAuth.js (credentials atau email login), role-based (`GURU`, `ADMIN`, `ORANG_TUA`)
- **ORM/DB**: Prisma + PostgreSQL (atau Firebase Firestore jika ingin selaras dengan proposal — sebutkan pilihan final di awal generate)
- **State fetching**: React Query (`@tanstack/react-query`) untuk data kehadiran

---

## 3. Data Model (Prisma schema, sesuaikan bila pakai Firebase)

```prisma
model Siswa {
  id            String   @id @default(cuid())
  nama          String
  kelas         String
  nfcTagId      String   @unique
  sekolahId     String
  kehadiran     Kehadiran[]
}

model Kehadiran {
  id            String   @id @default(cuid())
  siswaId       String
  siswa         Siswa    @relation(fields: [siswaId], references: [id])
  tanggal       DateTime // hanya tanggal (weekday)
  jamTap        DateTime // timestamp lengkap saat tap NFC
  status        StatusKehadiran // TEPAT_WAKTU | TELAT | ABSEN
  modaTransport String?  // untuk indikator peduli lingkungan (opsional di scope ini)
  haltId        String?
}

enum StatusKehadiran {
  TEPAT_WAKTU
  TELAT
  ABSEN
}

model Guru {
  id        String @id @default(cuid())
  nama      String
  email     String @unique
  sekolahId String
}
```

Aturan bisnis penting:
- Jam masuk sekolah = konfigurasi per sekolah (default `07:00`), toleransi telat = konfigurasi (default 0 menit / bisa diatur admin).
- Hanya Senin–Jumat yang dihitung sebagai hari sekolah. Sabtu & Minggu **tidak muncul** di tabel rekap maupun grafik, dan tidak dihitung dalam persentase kehadiran.

---

## 4. Halaman & Fitur Wajib (Role Guru)

### 4.1 `/guru/dashboard` — Ringkasan
- Card ringkasan: Total Siswa Terpantau, Rata-rata Ketepatan Waktu (%), Jumlah Siswa Sering Telat, Hari Sekolah Bulan Ini
- Grafik donat/ring: distribusi status (Tepat Waktu vs Telat vs Absen) bulan berjalan
- Tabel "Aktivitas Terbaru": 5-10 tap NFC terakhir dengan nama siswa, jam, status

### 4.2 `/guru/rekap-kehadiran` — Fitur Utama (sesuai arahan dosen)
Wajib ada komponen berikut:

1. **Tombol/Trigger Kalender (pemilih bulan)**
   - Klik tombol → buka popover/dialog kalender
   - Kalender dalam mode **pilih bulan & tahun** (bukan tanggal harian) — gunakan month-picker (grid 12 bulan + navigasi tahun), bukan full date calendar
   - Setelah pilih bulan → data rekap otomatis refetch

2. **Tabel Rekap Kehadiran**
   - Kolom hari = hanya kolom weekday (Senin s.d Jumat) dalam bulan terpilih; generate otomatis dari `date-fns` (`eachDayOfInterval` lalu filter `getDay() !== 0 && getDay() !== 6`)
   - Baris = daftar siswa
   - Sel = badge status (hijau = Tepat Waktu, kuning/oranye = Telat, abu = Absen), tampilkan jam tap saat hover/tooltip
   - Kolom ringkasan di ujung kanan: % Tepat Waktu per siswa bulan itu
   - Sticky header (nama hari + tanggal) & sticky kolom nama siswa saat scroll horizontal

3. **Tombol Export Excel**
   - Generate file `.xlsx` menggunakan `xlsx` (SheetJS)
   - Struktur sheet: baris pertama nama sekolah + bulan/tahun, header kolom sesuai weekday di bulan itu, data status per siswa, kolom ringkasan %
   - Nama file: `Rekap-Kehadiran-{NamaKelas}-{Bulan}-{Tahun}.xlsx`
   - Tampilkan toast/loading state saat generate

4. **Grafik Ketepatan Waktu**
   - Gunakan Recharts — pilih salah satu (atau keduanya via tab):
     a. **Bar chart per hari** (agregat kelas): sumbu X = tanggal weekday di bulan itu, sumbu Y = jumlah siswa, 2 series (Tepat Waktu = hijau, Telat = kuning/merah)
     b. **Scatter/line per siswa** (opsional detail): sumbu X = tanggal, sumbu Y = jam tap (misal 06:30–08:00), garis horizontal putus-putus menandai jam masuk sekolah — titik di atas garis = telat
   - Tambahkan filter dropdown "Semua Kelas / Kelas tertentu" dan "Semua Siswa / Siswa tertentu"

### 4.3 `/guru/siswa/[id]` — Detail Siswa
- Profil siswa + tren ketepatan waktu 3 bulan terakhir (line chart)
- Riwayat tap NFC harian

---

## 5. Non-Functional Requirements

- Layout: sidebar kiri fixed (navy gelap), topbar (nama sekolah + notifikasi + profil guru), content area terang — ikuti `design-system-trustfleet.md`
- Responsive: minimal optimal di desktop/tablet (dashboard guru asumsinya dipakai di laptop/tablet sekolah)
- Loading & empty state wajib ada di setiap tabel/grafik (skeleton loader)
- Aksesibilitas dasar: kontras warna badge status harus tetap terbaca (jangan hanya mengandalkan warna, sertakan label teks)
- Gunakan dummy/mock data generator (weekday-aware) untuk keperluan development sebelum backend NFC reader tersedia

---

## 6. Output yang Diharapkan dari Antigravity

1. Struktur folder Next.js App Router lengkap (`app/guru/...`)
2. Komponen reusable: `MonthPicker`, `AttendanceTable`, `AttendanceChart`, `ExportExcelButton`, `StatusBadge`
3. Util functions: `getWeekdaysInMonth(month, year)`, `calculateAttendanceStatus(jamTap, jamMasuk, toleransi)`, `exportAttendanceToExcel(data)`
4. Mock data seed untuk 1 kelas (±25 siswa) selama 1 bulan penuh, hanya weekday
5. Terapkan palet warna & gaya card sesuai `design-system-trustfleet.md`

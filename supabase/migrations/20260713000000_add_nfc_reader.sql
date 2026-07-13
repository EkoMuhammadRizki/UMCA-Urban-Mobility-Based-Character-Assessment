-- ==========================================
-- SKEMA LENGKAP INITIALIZATION & MIGRASI UMCA
-- Jalankan seluruh script ini di SQL Editor Supabase Anda
-- ==========================================

-- 1. Membuat Tabel Sekolah
create table if not exists "Sekolah" (
  "id" text primary key,
  "nama" text not null,
  "jamMasuk" text default '07:00' not null, -- format HH:mm
  "toleransiMenit" integer default 0 not null,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null
);

-- 2. Membuat Tabel Siswa
create table if not exists "Siswa" (
  "id" text primary key,
  "nama" text not null,
  "kelas" text not null,
  "nfcTagId" text unique not null,
  "sekolahId" text not null references "Sekolah"("id") on delete restrict on update cascade,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null
);

-- 3. Membuat Tabel NfcReader (Registrasi Alat Tap Fisik)
create table if not exists "NfcReader" (
  "id" text primary key,
  "deviceId" text unique not null,       -- identifier unik middleware, misal "READER-HALTE-01"
  "sekolahId" text not null references "Sekolah"("id") on delete restrict on update cascade,
  "titikTap" text not null check ("titikTap" in ('HALTE', 'GERBANG_SEKOLAH')),
  "lokasiLabel" text,                    -- contoh: "Halte Depan SDN 01"
  "secretKey" text not null,             -- untuk autentikasi request dari middleware ke API
  "isActive" boolean not null default true,
  "lastSeenAt" timestamp with time zone,
  "createdAt" timestamp with time zone default now() not null
);

-- 4. Membuat Tabel Kehadiran
create table if not exists "Kehadiran" (
  "id" text primary key,
  "siswaId" text not null references "Siswa"("id") on delete cascade on update cascade,
  "tanggal" date not null,
  "jamTap" timestamp with time zone,
  "status" text not null check ("status" in ('TEPAT_WAKTU', 'TELAT', 'ABSEN')),
  "modaTransport" text,
  "haltId" text,
  "titikTap" text check ("titikTap" in ('HALTE', 'GERBANG_SEKOLAH')),
  "nfcReaderId" text references "NfcReader"("id") on delete set null,
  "createdAt" timestamp with time zone default now() not null,
  constraint "Kehadiran_siswaId_tanggal_key" unique ("siswaId", "tanggal")
);

-- 5. Membuat Tabel FaktorEmisi
create table if not exists "FaktorEmisi" (
  "id" text primary key,
  "modaTransport" text unique not null,
  "skorEcoPoin" integer not null,
  "estimasiKgCO2" double precision not null,
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null
);

-- 6. Membuat Tabel Guru
create table if not exists "Guru" (
  "id" text primary key,
  "nama" text not null,
  "email" text unique not null,
  "password" text,
  "sekolahId" text not null references "Sekolah"("id") on delete restrict on update cascade,
  "role" text default 'GURU' not null check ("role" in ('GURU', 'ADMIN', 'ORANG_TUA')),
  "createdAt" timestamp with time zone default now() not null,
  "updatedAt" timestamp with time zone default now() not null
);

-- Indeks Keamanan dan Performa
create index if not exists "Siswa_sekolahId_idx" on "Siswa"("sekolahId");
create index if not exists "Siswa_kelas_idx" on "Siswa"("kelas");
create index if not exists "Kehadiran_siswaId_idx" on "Kehadiran"("siswaId");
create index if not exists "Kehadiran_tanggal_idx" on "Kehadiran"("tanggal");
create index if not exists "Kehadiran_nfcReaderId_idx" on "Kehadiran"("nfcReaderId");
create index if not exists "NfcReader_sekolahId_idx" on "NfcReader"("sekolahId");
create index if not exists "Guru_sekolahId_idx" on "Guru"("sekolahId");

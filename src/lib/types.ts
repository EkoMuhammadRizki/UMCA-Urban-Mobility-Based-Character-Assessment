// PresenceSync — Core type definitions

export enum StatusKehadiran {
  TEPAT_WAKTU = "TEPAT_WAKTU",
  TELAT = "TELAT",
  ABSEN = "ABSEN",
}

export interface Siswa {
  id: string;
  nama: string;
  kelas: string;
  nfcTagId: string;
  sekolahId: string;
}

export interface Kehadiran {
  id: string;
  siswaId: string;
  siswa?: Siswa;
  tanggal: string; // ISO date string (date only, weekday)
  jamTap: string | null; // ISO datetime string (full timestamp) or null if absent
  status: StatusKehadiran;
  modaTransport?: string | null;
  haltId?: string | null;
}

export interface Guru {
  id: string;
  nama: string;
  email: string;
  sekolahId: string;
  role: "GURU";
}

export interface Sekolah {
  id: string;
  nama: string;
  jamMasuk: string; // "07:00" format
  toleransiMenit: number;
}

export interface DashboardSummary {
  totalSiswa: number;
  rataKetepatanWaktu: number; // percentage 0-100
  jumlahSeringTelat: number;
  hariSekolahBulanIni: number;
  distribusiStatus: {
    tepatWaktu: number;
    telat: number;
    absen: number;
  };
}

export interface RekapKehadiranRow {
  siswa: Siswa;
  kehadiran: Record<string, Kehadiran>; // key = ISO date string "YYYY-MM-DD"
  persentaseTepatWaktu: number;
}

export interface AktivitasTerbaru {
  id: string;
  siswa: Siswa;
  jamTap: string;
  status: StatusKehadiran;
  tanggal: string;
}

export interface SiswaDetail extends Siswa {
  kehadiran: Kehadiran[];
  trenBulanan: TrenBulanan[];
}

export interface TrenBulanan {
  bulan: string; // "2026-07"
  label: string; // "Jul 2026"
  persentaseTepatWaktu: number;
  totalHariSekolah: number;
  tepatWaktu: number;
  telat: number;
  absen: number;
}

export interface ChartDataHarian {
  tanggal: string;
  label: string; // "Sen 1"
  tepatWaktu: number;
  telat: number;
  absen: number;
}

export interface ChartDataScatter {
  tanggal: string;
  label: string;
  siswaId: string;
  namaSiswa: string;
  jamTapMenit: number; // minutes since midnight, for Y axis
  jamTapLabel: string; // "06:45"
  status: StatusKehadiran;
}

// Mock data generator for PresenceSync
// Generates realistic weekday-aware attendance data for development

import {
  StatusKehadiran,
  type Siswa,
  type Kehadiran,
  type Guru,
  type Sekolah,
  type DashboardSummary,
  type RekapKehadiranRow,
  type AktivitasTerbaru,
  type SiswaDetail,
  type TrenBulanan,
  type ChartDataHarian,
  type ChartDataScatter,
} from "@/lib/types";
import { getWeekdaysInMonth, toISODateString, formatMonthYear, formatDayHeader, getMinutesSinceMidnight, formatTime } from "@/lib/utils/date-utils";
import { calculatePercentage, calculateDistribusi, getFrequentlyLateCount } from "@/lib/utils/attendance-utils";

// ─── Seeded Random ────────────────────────────────────────────
// Simple seeded pseudo-random for consistent data across renders
let seed = 42;
function seededRandom(): number {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function resetSeed(s: number = 42) {
  seed = s;
}

// ─── School Config ────────────────────────────────────────────
export const SEKOLAH: Sekolah = {
  id: "sekolah-001",
  nama: "SDN 1 Kota Semarang",
  jamMasuk: "07:00",
  toleransiMenit: 0,
};

// ─── Teacher ──────────────────────────────────────────────────
export const GURU_DATA: Guru = {
  id: "guru-001",
  nama: "Bu Ratna Dewi",
  email: "ratna.dewi@presencesync.dev",
  sekolahId: SEKOLAH.id,
  role: "GURU",
};

// ─── Students (25 students, class 4A) ─────────────────────────
const NAMA_SISWA = [
  "Ahmad Rasyid", "Aisyah Putri", "Bagas Prasetyo", "Citra Maharani",
  "Dian Saputra", "Eka Wulandari", "Fajar Nugroho", "Gita Pramesti",
  "Hendra Wijaya", "Indah Permata", "Joko Susanto", "Kartika Sari",
  "Lukman Hakim", "Maya Anggraeni", "Naufal Azhari", "Olivia Rahma",
  "Putra Perdana", "Qonita Zahra", "Rizky Maulana", "Siti Nurhaliza",
  "Teguh Wibowo", "Umi Kalsum", "Vino Adhitya", "Winda Kusuma",
  "Yusuf Firmansyah",
];

export const SISWA_LIST: Siswa[] = NAMA_SISWA.map((nama, index) => ({
  id: `siswa-${String(index + 1).padStart(3, "0")}`,
  nama,
  kelas: "4A",
  nfcTagId: `NFC-${String(index + 1).padStart(4, "0")}`,
  sekolahId: SEKOLAH.id,
}));

// ─── Generate Attendance for a Month ──────────────────────────
function generateTapTime(date: Date, studentSeed: number): { jamTap: string | null; status: StatusKehadiran } {
  const rand = seededRandom();

  // ~5% chance of being absent
  if (rand < 0.05) {
    return { jamTap: null, status: StatusKehadiran.ABSEN };
  }

  // ~15% chance of being late
  const isLate = rand < 0.20; // 5% absent + 15% late = 20% cumulative

  let hour: number;
  let minute: number;

  if (isLate) {
    // Late: 07:01 - 07:35
    hour = 7;
    minute = 1 + Math.floor(seededRandom() * 34);
  } else {
    // On time: 06:15 - 06:59
    hour = 6;
    minute = 15 + Math.floor(seededRandom() * 45);
  }

  const tapDate = new Date(date);
  tapDate.setHours(hour, minute, Math.floor(seededRandom() * 60), 0);

  return {
    jamTap: tapDate.toISOString(),
    status: isLate ? StatusKehadiran.TELAT : StatusKehadiran.TEPAT_WAKTU,
  };
}

export function generateKehadiran(
  month: number,
  year: number,
  siswaList: Siswa[] = SISWA_LIST
): Kehadiran[] {
  resetSeed(month * 1000 + year + 42);

  const weekdays = getWeekdaysInMonth(month, year);
  const records: Kehadiran[] = [];

  siswaList.forEach((siswa, siswaIdx) => {
    weekdays.forEach((day, dayIdx) => {
      const { jamTap, status } = generateTapTime(day, siswaIdx);
      const dateStr = toISODateString(day);

      records.push({
        id: `kh-${siswa.id}-${dateStr}`,
        siswaId: siswa.id,
        siswa,
        tanggal: dateStr,
        jamTap,
        status,
        modaTransport: null,
        haltId: "halt-001",
      });
    });
  });

  return records;
}

// ─── Rekap Kehadiran (table data) ─────────────────────────────
export function getRekapKehadiran(
  month: number,
  year: number,
  kelas?: string
): RekapKehadiranRow[] {
  const siswaFiltered = kelas
    ? SISWA_LIST.filter((s) => s.kelas === kelas)
    : SISWA_LIST;

  const allRecords = generateKehadiran(month, year, siswaFiltered);

  return siswaFiltered.map((siswa) => {
    const records = allRecords.filter((r) => r.siswaId === siswa.id);
    const kehadiranMap: Record<string, Kehadiran> = {};
    records.forEach((r) => {
      kehadiranMap[r.tanggal] = r;
    });

    return {
      siswa,
      kehadiran: kehadiranMap,
      persentaseTepatWaktu: calculatePercentage(records),
    };
  });
}

// ─── Dashboard Summary ────────────────────────────────────────
export function getDashboardSummary(month: number, year: number): DashboardSummary {
  const allRecords = generateKehadiran(month, year);
  const distribusi = calculateDistribusi(allRecords);
  const weekdayCount = getWeekdaysInMonth(month, year).length;

  return {
    totalSiswa: SISWA_LIST.length,
    rataKetepatanWaktu: calculatePercentage(allRecords),
    jumlahSeringTelat: getFrequentlyLateCount(allRecords, 3),
    hariSekolahBulanIni: weekdayCount,
    distribusiStatus: distribusi,
  };
}

// ─── Recent Activity ──────────────────────────────────────────
export function getRecentActivity(count: number = 10): AktivitasTerbaru[] {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const allRecords = generateKehadiran(month, year);

  // Filter records that have a tap time and sort by tap time descending
  return allRecords
    .filter((r) => r.jamTap !== null)
    .sort((a, b) => new Date(b.jamTap!).getTime() - new Date(a.jamTap!).getTime())
    .slice(0, count)
    .map((r) => ({
      id: r.id,
      siswa: r.siswa!,
      jamTap: r.jamTap!,
      status: r.status,
      tanggal: r.tanggal,
    }));
}

// ─── Chart Data ───────────────────────────────────────────────
export function getChartDataHarian(
  month: number,
  year: number,
  kelas?: string
): ChartDataHarian[] {
  const weekdays = getWeekdaysInMonth(month, year);
  const siswaFiltered = kelas
    ? SISWA_LIST.filter((s) => s.kelas === kelas)
    : SISWA_LIST;
  const allRecords = generateKehadiran(month, year, siswaFiltered);

  return weekdays.map((day) => {
    const dateStr = toISODateString(day);
    const dayRecords = allRecords.filter((r) => r.tanggal === dateStr);
    const dist = calculateDistribusi(dayRecords);

    return {
      tanggal: dateStr,
      label: formatDayHeader(day),
      tepatWaktu: dist.tepatWaktu,
      telat: dist.telat,
      absen: dist.absen,
    };
  });
}

export function getChartDataScatter(
  month: number,
  year: number,
  siswaId?: string
): ChartDataScatter[] {
  const allRecords = generateKehadiran(month, year);

  return allRecords
    .filter((r) => r.jamTap !== null)
    .filter((r) => !siswaId || r.siswaId === siswaId)
    .map((r) => ({
      tanggal: r.tanggal,
      label: formatDayHeader(new Date(r.tanggal)),
      siswaId: r.siswaId,
      namaSiswa: r.siswa?.nama || "",
      jamTapMenit: getMinutesSinceMidnight(r.jamTap!),
      jamTapLabel: formatTime(r.jamTap!),
      status: r.status,
    }));
}

// ─── Siswa Detail ─────────────────────────────────────────────
export function getSiswaDetail(siswaId: string): SiswaDetail | null {
  const siswa = SISWA_LIST.find((s) => s.id === siswaId);
  if (!siswa) return null;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Collect all attendance records for this student (current month + 2 months back)
  const allKehadiran: Kehadiran[] = [];
  const trenBulanan: TrenBulanan[] = [];

  for (let i = 2; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m < 0) {
      m += 12;
      y -= 1;
    }

    const monthRecords = generateKehadiran(m, y, [siswa]).filter(
      (r) => r.siswaId === siswaId
    );
    allKehadiran.push(...monthRecords);

    const weekdayCount = getWeekdaysInMonth(m, y).length;
    const dist = calculateDistribusi(monthRecords);

    trenBulanan.push({
      bulan: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: formatMonthYear(m, y),
      persentaseTepatWaktu: calculatePercentage(monthRecords),
      totalHariSekolah: weekdayCount,
      tepatWaktu: dist.tepatWaktu,
      telat: dist.telat,
      absen: dist.absen,
    });
  }

  return {
    ...siswa,
    kehadiran: allKehadiran,
    trenBulanan,
  };
}

// Mock data generator for PresenceSync
// Generates realistic weekday-aware attendance data for development

import {
  StatusKehadiran,
  TitikTap,
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
import { isWeekend } from "date-fns";
import { calculatePercentage, calculateDistribusi, getFrequentlyLateCount } from "@/lib/utils/attendance-utils";
import { supabase } from "./supabase";

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

export const DEFAULT_MOCK_SISWA: Siswa[] = NAMA_SISWA.map((nama, idx) => ({
  id: `siswa-${String(idx + 1).padStart(3, "0")}`,
  nama,
  kelas: "4A",
  nfcTagId: idx === 0 ? "8159FF7B" : `NFC-4A-${String(idx + 1).padStart(3, "0")}`,
  sekolahId: "sekolah-001",
}));

export let SISWA_LIST: Siswa[] = DEFAULT_MOCK_SISWA;

let isSynced = false;

export async function syncDatabaseWithMock() {
  if (isSynced) return;
  try {
    const { data: dbSiswa, error } = await supabase.from("Siswa").select("*");
    if (error) {
      // Hanya fallback ke mock saat DB tidak bisa diakses (error koneksi/konfigurasi)
      console.warn("Could not fetch students from Supabase (using mock data fallback):", error.message || JSON.stringify(error));
      SISWA_LIST = DEFAULT_MOCK_SISWA;
      isSynced = true;
      return;
    }
    // DB berhasil diakses — pakai data DB apa adanya (bisa kosong [])
    SISWA_LIST = (dbSiswa ?? []).map(s => ({
      id: s.id,
      nama: s.nama,
      kelas: s.kelas,
      nfcTagId: s.nfcTagId ? s.nfcTagId.trim() : "",
      sekolahId: s.sekolahId
    }));
    isSynced = true;
  } catch (err: any) {
    console.warn("Failed to sync Supabase Siswa (using mock data fallback):", err?.message || err);
    SISWA_LIST = DEFAULT_MOCK_SISWA;
    isSynced = true;
  }
}

export async function getSiswaList(): Promise<Siswa[]> {
  // Selalu fetch langsung dari DB — jangan pakai cache module-level
  // agar perubahan (tambah/hapus) langsung terrefleksi
  try {
    const { data: dbSiswa, error } = await supabase
      .from("Siswa")
      .select("*")
      .order("kelas", { ascending: true })
      .order("nama", { ascending: true });

    if (error) {
      console.warn("getSiswaList: DB error, fallback ke SISWA_LIST:", error.message);
      return SISWA_LIST;
    }

    SISWA_LIST = (dbSiswa ?? []).map(s => ({
      id: s.id,
      nama: s.nama,
      kelas: s.kelas,
      nfcTagId: s.nfcTagId ? s.nfcTagId.trim() : "",
      sekolahId: s.sekolahId,
    }));
    isSynced = true;
    return SISWA_LIST;
  } catch (err: any) {
    console.warn("getSiswaList catch:", err?.message);
    return SISWA_LIST;
  }
}

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

      let titikTap: TitikTap | null = null;
      let modaTransport: string | null = null;
      let haltId: string | null = null;

      if (status !== StatusKehadiran.ABSEN) {
        const randTap = seededRandom();
        if (randTap < 0.60) {
          titikTap = TitikTap.HALTE;
          haltId = `halt-${String(1 + Math.floor(seededRandom() * 3)).padStart(3, "0")}`; // halt-001, halt-002, halt-003
          
          const randModa = seededRandom();
          if (randModa < 0.50) {
            modaTransport = "Bus Sekolah";
          } else if (randModa < 0.80) {
            modaTransport = "Transjakarta";
          } else {
            modaTransport = "Jalan Kaki";
          }
        } else {
          titikTap = TitikTap.GERBANG_SEKOLAH;
          
          const randModa = seededRandom();
          if (randModa < 0.50) {
            modaTransport = "Motor";
          } else if (randModa < 0.80) {
            modaTransport = "Mobil Pribadi";
          } else {
            modaTransport = "Jalan Kaki";
          }
        }
      }

      records.push({
        id: `kh-${siswa.id}-${dateStr}`,
        siswaId: siswa.id,
        siswa,
        tanggal: dateStr,
        jamTap,
        status,
        modaTransport,
        haltId,
        titikTap,
      });
    });
  });

  return records;
}

// Helper untuk mengambil data Kehadiran nyata dari Supabase
async function fetchRealKehadiran(): Promise<Kehadiran[] | null> {
  try {
    const { data: dbKehadiran, error } = await supabase
      .from("Kehadiran")
      .select("*");

    if (error) {
      console.warn("Could not fetch Kehadiran from Supabase (using mock data fallback):", error.message || JSON.stringify(error));
      return null;
    }

    if (dbKehadiran && dbKehadiran.length > 0) {
      return dbKehadiran.map(r => ({
        id: r.id,
        siswaId: r.siswaId,
        tanggal: r.tanggal,
        jamTap: r.jamTap,
        status: r.status as StatusKehadiran,
        modaTransport: r.modaTransport,
        haltId: r.haltId,
        titikTap: r.titikTap as TitikTap,
        siswa: SISWA_LIST.find(s => s.id === r.siswaId)
      }));
    }
  } catch (e: any) {
    console.warn("fetchRealKehadiran catch block (using mock data fallback):", e?.message || e);
  }
  return null;
}

// Export all attendance records (from DB or fallback mock) for research Excel export
export async function getAllKehadiranData(): Promise<Kehadiran[]> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();
  if (realRecords && realRecords.length > 0) {
    return realRecords;
  }
  const now = new Date();
  return generateKehadiran(now.getMonth(), now.getFullYear(), SISWA_LIST);
}

// ─── Rekap Kehadiran (table data) ─────────────────────────────
export async function getRekapKehadiran(
  month: number,
  year: number,
  kelas?: string
): Promise<RekapKehadiranRow[]> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();
  const siswaFiltered = kelas
    ? SISWA_LIST.filter((s) => s.kelas === kelas)
    : SISWA_LIST;

  if (realRecords && realRecords.length > 0) {
    return siswaFiltered.map((siswa) => {
      const studentRecords = realRecords.filter((r) => r.siswaId === siswa.id);
      const kehadiranMap: Record<string, Kehadiran> = {};
      studentRecords.forEach((r) => {
        kehadiranMap[r.tanggal] = r;
      });

      return {
        siswa,
        kehadiran: kehadiranMap,
        persentaseTepatWaktu: calculatePercentage(studentRecords),
      };
    });
  }

  // Jika tidak ada data di DB, return baris kosong (tanpa mock)
  return siswaFiltered.map((siswa) => ({
    siswa,
    kehadiran: {},
    persentaseTepatWaktu: 0,
  }));
}

// ─── Dashboard Summary ────────────────────────────────────────
export async function getDashboardSummary(month: number, year: number): Promise<DashboardSummary> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();
  const weekdayCount = getWeekdaysInMonth(month, year).length;

  if (realRecords && realRecords.length > 0) {
    const distribusi = calculateDistribusi(realRecords);
    return {
      totalSiswa: SISWA_LIST.length,
      rataKetepatanWaktu: calculatePercentage(realRecords),
      jumlahSeringTelat: getFrequentlyLateCount(realRecords, 3),
      hariSekolahBulanIni: weekdayCount,
      distribusiStatus: distribusi,
    };
  }

  // Kosongkan dashboard (0%) jika database kosong
  return {
    totalSiswa: SISWA_LIST.length,
    rataKetepatanWaktu: 0,
    jumlahSeringTelat: 0,
    hariSekolahBulanIni: weekdayCount,
    distribusiStatus: { tepatWaktu: 0, telat: 0, absen: 0 },
  };
}

// ─── Recent Activity ──────────────────────────────────────────
export async function getRecentActivity(count: number = 10): Promise<AktivitasTerbaru[]> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();

  if (realRecords && realRecords.length > 0) {
    return realRecords
      .filter((r) => r.jamTap !== null)
      .sort((a, b) => new Date(b.jamTap!).getTime() - new Date(a.jamTap!).getTime())
      .slice(0, count)
      .map((r) => ({
        id: r.id,
        siswa: r.siswa || {
          id: r.siswaId,
          nama: "Siswa Tidak Dikenal",
          kelas: "—",
          nfcTagId: "—",
          sekolahId: "—"
        },
        jamTap: r.jamTap!,
        status: r.status,
        tanggal: r.tanggal,
        titikTap: r.titikTap,
        modaTransport: r.modaTransport,
      }));
  }

  return [];
}

// ─── Chart Data ───────────────────────────────────────────────
export async function getChartDataHarian(
  month: number,
  year: number,
  kelas?: string
): Promise<ChartDataHarian[]> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();
  const weekdays = getWeekdaysInMonth(month, year);

  if (realRecords && realRecords.length > 0) {
    const recordsFiltered = kelas
      ? realRecords.filter((r) => r.siswa?.kelas === kelas)
      : realRecords;

    return weekdays.map((day) => {
      const dateStr = toISODateString(day);
      const dayRecords = recordsFiltered.filter((r) => r.tanggal === dateStr);
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

  // Kembalikan chart kosong
  return weekdays.map((day) => ({
    tanggal: toISODateString(day),
    label: formatDayHeader(day),
    tepatWaktu: 0,
    telat: 0,
    absen: 0,
  }));
}

export async function getChartDataScatter(
  month: number,
  year: number,
  siswaId?: string
): Promise<ChartDataScatter[]> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();

  if (realRecords && realRecords.length > 0) {
    return realRecords
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

  return [];
}

// ─── Siswa Detail ─────────────────────────────────────────────
export async function getSiswaDetail(siswaId: string): Promise<SiswaDetail | null> {
  await syncDatabaseWithMock();
  const siswa = SISWA_LIST.find((s) => s.id === siswaId);
  if (!siswa) return null;

  const realRecords = await fetchRealKehadiran();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const allKehadiran: Kehadiran[] = [];
  const trenBulanan: TrenBulanan[] = [];

  if (realRecords && realRecords.length > 0) {
    const studentRecords = realRecords.filter((r) => r.siswaId === siswaId);
    
    for (let i = 2; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      
      const monthStr = `${y}-${String(m + 1).padStart(2, "0")}`;
      const monthRecords = studentRecords.filter((r) => r.tanggal.startsWith(monthStr));
      allKehadiran.push(...monthRecords);

      const weekdayCount = getWeekdaysInMonth(m, y).length;
      const dist = calculateDistribusi(monthRecords);

      trenBulanan.push({
        bulan: monthStr,
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

  // Jika tidak ada data absen riil
  for (let i = 2; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    if (m < 0) {
      m += 12;
      y -= 1;
    }

    trenBulanan.push({
      bulan: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: formatMonthYear(m, y),
      persentaseTepatWaktu: 0,
      totalHariSekolah: getWeekdaysInMonth(m, y).length,
      tepatWaktu: 0,
      telat: 0,
      absen: 0,
    });
  }

  return {
    ...siswa,
    kehadiran: [],
    trenBulanan,
  };
}

export interface EcoDashboardData {
  hariIni: {
    totalTaps: number;
    halteTaps: number;
    gerbangTaps: number;
    haltePercentage: number;
    gerbangPercentage: number;
  };
  sebaranMingguan: {
    tanggal: string;
    label: string;
    halte: number;
    gerbang: number;
  }[];
  leaderboard: {
    siswaId: string;
    nama: string;
    kelas: string;
    haltePersentase: number; // 0-100, persen tap halte dari total tap
    totalTaps: number;
    kategori: "RENDAH_EMISI" | "POTENSI_TINGGI_EMISI";
  }[];
}

// 5 hari sekolah terakhir dihitung mundur dari hari ini (menembus batas bulan)
function getLast5SchoolDays(): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  while (days.length < 5) {
    const day = new Date(cursor);
    if (!isWeekend(day)) days.unshift(day);
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

export async function getEcoDashboardSummary(month: number, year: number): Promise<EcoDashboardData> {
  await syncDatabaseWithMock();
  const realRecords = await fetchRealKehadiran();
  const weekdays = getWeekdaysInMonth(month, year);

  if (realRecords && realRecords.length > 0) {
    const recordsWithTap = realRecords.filter((r) => r.jamTap !== null);
    const lastTapDate = recordsWithTap.length > 0
      ? recordsWithTap.sort((a, b) => new Date(b.jamTap!).getTime() - new Date(a.jamTap!).getTime())[0].tanggal
      : toISODateString(weekdays[weekdays.length - 1]);

    const todayRecords = realRecords.filter((r) => r.tanggal === lastTapDate && r.status !== StatusKehadiran.ABSEN);
    const totalTaps = todayRecords.length;
    const halteTaps = todayRecords.filter((r) => r.titikTap === TitikTap.HALTE).length;
    const gerbangTaps = todayRecords.filter((r) => r.titikTap === TitikTap.GERBANG_SEKOLAH).length;

    const haltePercentage = totalTaps > 0 ? Math.round((halteTaps / totalTaps) * 100) : 0;
    const gerbangPercentage = totalTaps > 0 ? Math.round((gerbangTaps / totalTaps) * 100) : 0;

    const last5Days = getLast5SchoolDays();
    const sebaranMingguan = last5Days.map((day) => {
      const dateStr = toISODateString(day);
      const dayRecords = realRecords.filter((r) => r.tanggal === dateStr && r.status !== StatusKehadiran.ABSEN);

      return {
        tanggal: dateStr,
        label: formatDayHeader(day),
        halte: dayRecords.filter((r) => r.titikTap === TitikTap.HALTE).length,
        gerbang: dayRecords.filter((r) => r.titikTap === TitikTap.GERBANG_SEKOLAH).length,
      };
    });

    // ── Leaderboard: per-siswa berdasarkan % tap halte ──────────
    // Ambil semua siswa yang punya minimal 1 tap (bukan ABSEN)
    const tappedRecords = realRecords.filter(
      (r) => r.status !== StatusKehadiran.ABSEN && r.jamTap !== null
    );

    // Kelompokkan per siswa
    const perSiswaMap = new Map<string, { halteTaps: number; totalTaps: number }>();
    tappedRecords.forEach((r) => {
      const curr = perSiswaMap.get(r.siswaId) ?? { halteTaps: 0, totalTaps: 0 };
      curr.totalTaps += 1;
      if (r.titikTap === TitikTap.HALTE) curr.halteTaps += 1;
      perSiswaMap.set(r.siswaId, curr);
    });

    // Susun leaderboard: hitung persentase, join dengan SISWA_LIST untuk nama & kelas
    const leaderboard = Array.from(perSiswaMap.entries())
      .map(([siswaId, stat]) => {
        const siswaInfo = SISWA_LIST.find((s) => s.id === siswaId);
        const haltePersentase =
          stat.totalTaps > 0
            ? Math.round((stat.halteTaps / stat.totalTaps) * 100)
            : 0;
        return {
          siswaId,
          nama: siswaInfo?.nama ?? siswaId,
          kelas: siswaInfo?.kelas ?? "—",
          haltePersentase,
          totalTaps: stat.totalTaps,
          kategori: (haltePersentase >= 50 ? "RENDAH_EMISI" : "POTENSI_TINGGI_EMISI") as
            | "RENDAH_EMISI"
            | "POTENSI_TINGGI_EMISI",
        };
      })
      // Urutkan: persentase halte tertinggi → totalTaps terbanyak sebagai tiebreaker
      .sort((a, b) =>
        b.haltePersentase !== a.haltePersentase
          ? b.haltePersentase - a.haltePersentase
          : b.totalTaps - a.totalTaps
      )
      .slice(0, 5);

    return {
      hariIni: {
        totalTaps,
        halteTaps,
        gerbangTaps,
        haltePercentage,
        gerbangPercentage,
      },
      sebaranMingguan,
      leaderboard,
    };
  }

  // Eco-Summary kosong
  return {
    hariIni: {
      totalTaps: 0,
      halteTaps: 0,
      gerbangTaps: 0,
      haltePercentage: 0,
      gerbangPercentage: 0,
    },
    sebaranMingguan: getLast5SchoolDays().map((day) => ({
      tanggal: toISODateString(day),
      label: formatDayHeader(day),
      halte: 0,
      gerbang: 0,
    })),
    leaderboard: [],
  };
}

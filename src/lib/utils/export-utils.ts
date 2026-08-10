// Excel export utility for PresenceSync
// Uses SheetJS (xlsx) to generate .xlsx files client-side

import * as XLSX from "xlsx";
import type { RekapKehadiranRow, Kehadiran } from "@/lib/types";
import { StatusKehadiran, TitikTap } from "@/lib/types";
import {
  formatDayHeader,
  formatMonthYear,
  toISODateString,
  formatTime,
  getMinutesSinceMidnight,
  minutesToTimeString,
} from "@/lib/utils/date-utils";
import { getStatusLabel } from "@/lib/utils/attendance-utils";
import { tentukanEcoPoin, getBobotTap } from "@/lib/eco-assessment";
import { getAllKehadiranData } from "@/lib/mock-data";

/**
 * Export attendance recap data to a research-grade Excel (.xlsx) file.
 */
export function exportAttendanceToExcel(
  data: RekapKehadiranRow[],
  weekdays: Date[],
  month: number,
  year: number,
  kelas: string,
  namaSekolah: string = "SDI-Al-Irsyadiah"
): void {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  // Title block
  rows.push([`${namaSekolah} — Rekap Kehadiran & Evaluasi Karakter ${formatMonthYear(month, year)}`]);
  rows.push([`Kelas: ${kelas}`]);
  rows.push([]);

  // Header row
  const headers = [
    "No",
    "Nama Siswa",
    ...weekdays.map((day) => formatDayHeader(day)),
    "Tap Halte (Bobot 3)",
    "Tap Gerbang (Bobot 1)",
    "Total Bobot Tap",
    "Rata-rata Bobot Tap",
    "% Tap Halte",
    "Rata-rata Jam Tap",
    "Titik Tap Dominan",
    "Kategori Eco Assessment",
    "% Tepat Waktu",
  ];
  rows.push(headers);

  // Data rows
  data.forEach((row, idx) => {
    const dataRow: (string | number)[] = [idx + 1, row.siswa.nama];

    let halteCount = 0;
    let gerbangCount = 0;
    let totalEcoScore = 0;
    let validEcoCount = 0;
    let sumMinutes = 0;

    weekdays.forEach((day) => {
      const dateKey = toISODateString(day);
      const kehadiran = row.kehadiran[dateKey];
      if (kehadiran) {
        let label = getStatusLabel(kehadiran.status);
        if (kehadiran.status !== StatusKehadiran.ABSEN && kehadiran.jamTap) {
          const b = getBobotTap(kehadiran.titikTap);
          label += ` (${formatTime(kehadiran.jamTap)}${b > 0 ? ` - Bobot ${b}` : ""})`;
          sumMinutes += getMinutesSinceMidnight(kehadiran.jamTap);
        }
        dataRow.push(label);

        if (kehadiran.status !== StatusKehadiran.ABSEN && kehadiran.titikTap) {
          if (kehadiran.titikTap === TitikTap.HALTE) halteCount++;
          if (kehadiran.titikTap === TitikTap.GERBANG_SEKOLAH) gerbangCount++;

          const eco = tentukanEcoPoin(kehadiran.titikTap, kehadiran.modaTransport);
          totalEcoScore += eco.skorEcoPoin;
          validEcoCount++;
        }
      } else {
        dataRow.push("-");
      }
    });

    const totalTaps = halteCount + gerbangCount;
    const totalBobot = halteCount * 3 + gerbangCount * 1;
    const avgBobot = totalTaps > 0 ? (totalBobot / totalTaps).toFixed(2) : "0";
    const pctHalte = totalTaps > 0 ? Math.round((halteCount / totalTaps) * 100) : 0;
    const avgJamTap = validEcoCount > 0 ? `${minutesToTimeString(Math.round(sumMinutes / validEcoCount))} WIB` : "—";

    const dominantTap =
      totalTaps === 0
        ? "—"
        : halteCount >= gerbangCount
        ? `Halte (${halteCount}x)`
        : `Gerbang (${gerbangCount}x)`;

    const averageEcoScore = validEcoCount > 0 ? Math.round(totalEcoScore / validEcoCount) : 0;
    let kategoriEmisi = "—";
    if (validEcoCount > 0) {
      if (pctHalte >= 50 || averageEcoScore >= 70) {
        kategoriEmisi = "Rendah Emisi";
      } else {
        kategoriEmisi = "Potensi Tinggi Emisi";
      }
    }

    dataRow.push(halteCount);
    dataRow.push(gerbangCount);
    dataRow.push(totalBobot);
    dataRow.push(avgBobot);
    dataRow.push(`${pctHalte}%`);
    dataRow.push(avgJamTap);
    dataRow.push(dominantTap);
    dataRow.push(kategoriEmisi);
    dataRow.push(`${row.persentaseTepatWaktu}%`);
    rows.push(dataRow);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 5 },  // No
    { wch: 28 }, // Nama
    ...weekdays.map(() => ({ wch: 24 })), // Daily columns
    { wch: 18 }, // Halte (Bobot 3)
    { wch: 18 }, // Gerbang (Bobot 1)
    { wch: 16 }, // Total Bobot
    { wch: 18 }, // Rata-rata Bobot
    { wch: 14 }, // % Halte
    { wch: 18 }, // Rata-rata Jam Tap
    { wch: 20 }, // Dominan
    { wch: 24 }, // Kategori
    { wch: 14 }, // % Tepat Waktu
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const fileName = `Rekap-Kehadiran-${kelas}-${monthNames[month]}-${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ─── Siswa Export / Import ────────────────────────────────────

export interface SiswaRow {
  id?: string;
  nama: string;
  nisn: string;
  kelas: string;
}

/**
 * Export dataset riset komprehensif ke file .xlsx (Multisheet untuk peneliti/Scopus)
 */
export async function exportSiswaToExcel(
  siswaList: SiswaRow[],
  namaSekolah: string = "UMCA"
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Ambil seluruh data presensi nyata / mock untuk statistik riset
  const allKehadiran = await getAllKehadiranData();
  const validTapRecords = allKehadiran.filter(
    (r) => r.status !== StatusKehadiran.ABSEN && r.jamTap !== null
  );

  // ─────────────────────────────────────────────────────────────
  // SHEET 1: Ringkasan Riset & Statistik
  // ─────────────────────────────────────────────────────────────
  const summaryRows: (string | number)[][] = [];

  const totalSiswa = siswaList.length;
  const totalTapEvents = validTapRecords.length;
  const totalHalteTaps = validTapRecords.filter((r) => r.titikTap === TitikTap.HALTE).length;
  const totalGerbangTaps = validTapRecords.filter((r) => r.titikTap === TitikTap.GERBANG_SEKOLAH).length;
  const totalBobotGlobal = totalHalteTaps * 3 + totalGerbangTaps * 1;
  const avgBobotGlobal = totalTapEvents > 0 ? (totalBobotGlobal / totalTapEvents).toFixed(2) : "0";

  const ratioHalte = totalTapEvents > 0 ? Math.round((totalHalteTaps / totalTapEvents) * 100) : 0;
  const ratioGerbang = totalTapEvents > 0 ? Math.round((totalGerbangTaps / totalTapEvents) * 100) : 0;

  let globalMinutesSum = 0;
  validTapRecords.forEach((r) => {
    globalMinutesSum += getMinutesSinceMidnight(r.jamTap!);
  });
  const avgGlobalMinutes = totalTapEvents > 0 ? Math.round(globalMinutesSum / totalTapEvents) : 0;
  const avgGlobalJamStr = totalTapEvents > 0 ? `${minutesToTimeString(avgGlobalMinutes)} WIB` : "—";

  const totalTepatWaktu = validTapRecords.filter((r) => r.status === StatusKehadiran.TEPAT_WAKTU).length;
  const totalTelat = validTapRecords.filter((r) => r.status === StatusKehadiran.TELAT).length;
  const pctTepatWaktuGlobal = totalTapEvents > 0 ? Math.round((totalTepatWaktu / totalTapEvents) * 100) : 0;

  summaryRows.push([`${namaSekolah} — DATASET RISET EVALUASI KARAKTER LINGKUNGAN (UMCA)`]);
  summaryRows.push([`Diekspor pada: ${new Date().toLocaleDateString("id-ID", { dateStyle: "full" })}`]);
  summaryRows.push([
    "Deskripsi: Dataset ini memuat presensi NFC, indikator bobot presensi (Halte=3, Gerbang=1), statistik sebaran lokasi tap, rata-rata jam kedatangan, dan asesmen emisi untuk analisis riset Scopus."
  ]);
  summaryRows.push([]);

  summaryRows.push(["Indikator Riset & Evaluasi", "Nilai / Statistik", "Keterangan & Satuan"]);
  summaryRows.push(["Total Siswa Sampel", totalSiswa, "Siswa Terdaftar"]);
  summaryRows.push(["Total Frekuensi Tap NFC Terekam", totalTapEvents, "Transaksi Event Tap"]);
  summaryRows.push(["Jumlah Tap Halte Sekolah (Bobot 3 - Rendah Emisi)", totalHalteTaps, `Tap Halte (${ratioHalte}% dari total tap)`]);
  summaryRows.push(["Jumlah Tap Gerbang Utama (Bobot 1 - Potensi Tinggi Emisi)", totalGerbangTaps, `Tap Gerbang (${ratioGerbang}% dari total tap)`]);
  summaryRows.push(["Total Akumulasi Bobot Tap Presensi", totalBobotGlobal, "Poin Bobot Presensi (Halte=3, Gerbang=1)"]);
  summaryRows.push(["Rata-rata Bobot per Tap Presensi", avgBobotGlobal, "Skala Bobot Presensi (1.0 - 3.0)"]);
  summaryRows.push(["Rasio Tap Halte (Eco-Mobility Index)", `${ratioHalte}%`, "Target Perilaku Ramah Lingkungan"]);
  summaryRows.push(["Rata-rata Waktu Kedatangan (Jam Tap Siswa)", avgGlobalJamStr, "WIB (Rata-rata Seluruh Presensi)"]);
  summaryRows.push(["Total Presensi Tepat Waktu (< 07:00)", totalTepatWaktu, `Presensi (${pctTepatWaktuGlobal}%)`]);
  summaryRows.push(["Total Presensi Telat (>= 07:00)", totalTelat, "Presensi"]);
  summaryRows.push(["Tingkat Ketepatan Waktu Presensi Keseluruhan", `${pctTepatWaktuGlobal}%`, "Ketepatan Waktu"]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 55 }, { wch: 25 }, { wch: 55 }];
  wsSummary["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Riset");

  // ─────────────────────────────────────────────────────────────
  // SHEET 2: Data Statistik Siswa (Per-Siswa Analytical Matrix)
  // ─────────────────────────────────────────────────────────────
  const studentRows: (string | number)[][] = [];

  const studentHeaders = [
    "No",
    "ID Siswa",
    "Nama Siswa",
    "NISN / NFC Tag",
    "Kelas",
    "Total Presensi (Tap)",
    "Tap Halte (Bobot 3)",
    "Tap Gerbang (Bobot 1)",
    "Total Bobot Tap",
    "Rata-rata Bobot Tap",
    "% Tap Halte (Eco Ratio)",
    "Rata-rata Skor Eco (0-100)",
    "Kategori Eco Assessment",
    "Predikat Character Eco",
    "Rata-rata Jam Tap",
    "Jam Tap Terawal",
    "Jam Tap Terakhir",
    "Total Tepat Waktu",
    "Total Telat",
    "% Ketepatan Waktu",
  ];
  studentRows.push(studentHeaders);

  siswaList.forEach((s, idx) => {
    const studentRecords = allKehadiran.filter(
      (r) =>
        (s.id && r.siswaId === s.id) ||
        (r.siswa?.nama && r.siswa.nama.toLowerCase() === s.nama.toLowerCase()) ||
        (r.siswa?.nfcTagId && r.siswa.nfcTagId === s.nisn)
    );

    const validStudentTaps = studentRecords.filter(
      (r) => r.status !== StatusKehadiran.ABSEN && r.jamTap !== null
    );

    const tapsCount = validStudentTaps.length;
    const halteCount = validStudentTaps.filter((r) => r.titikTap === TitikTap.HALTE).length;
    const gerbangCount = validStudentTaps.filter((r) => r.titikTap === TitikTap.GERBANG_SEKOLAH).length;
    const totalBobotStudent = halteCount * 3 + gerbangCount * 1;
    const avgBobotStudent = tapsCount > 0 ? Number((totalBobotStudent / tapsCount).toFixed(2)) : 0;
    const pctHalte = tapsCount > 0 ? Math.round((halteCount / tapsCount) * 100) : 0;

    let totalEcoPoin = 0;
    let minMinutes = Infinity;
    let maxMinutes = -Infinity;
    let sumMinutes = 0;
    let tepatCount = 0;
    let telatCount = 0;

    validStudentTaps.forEach((r) => {
      const eco = tentukanEcoPoin(r.titikTap, r.modaTransport);
      totalEcoPoin += eco.skorEcoPoin;

      const mins = getMinutesSinceMidnight(r.jamTap!);
      sumMinutes += mins;
      if (mins < minMinutes) minMinutes = mins;
      if (mins > maxMinutes) maxMinutes = mins;

      if (r.status === StatusKehadiran.TEPAT_WAKTU) tepatCount++;
      if (r.status === StatusKehadiran.TELAT) telatCount++;
    });

    const avgEcoScore = tapsCount > 0 ? Math.round(totalEcoPoin / tapsCount) : 0;

    let kategoriEco = "—";
    let predikatEco = "Belum Ada Presensi";
    if (tapsCount > 0) {
      if (pctHalte >= 50 || avgEcoScore >= 70) {
        kategoriEco = "RENDAH_EMISI";
        predikatEco = "Rendah Emisi (Sangat Peduli Lingkungan)";
      } else {
        kategoriEco = "POTENSI_TINGGI_EMISI";
        predikatEco = "Potensi Tinggi Emisi (Dominan Kendaraan Pribadi)";
      }
    }

    const avgTimeStr = tapsCount > 0 ? `${minutesToTimeString(Math.round(sumMinutes / tapsCount))} WIB` : "—";
    const minTimeStr = tapsCount > 0 && minMinutes !== Infinity ? `${minutesToTimeString(minMinutes)} WIB` : "—";
    const maxTimeStr = tapsCount > 0 && maxMinutes !== -Infinity ? `${minutesToTimeString(maxMinutes)} WIB` : "—";
    const pctTepat = tapsCount > 0 ? Math.round((tepatCount / tapsCount) * 100) : 0;

    studentRows.push([
      idx + 1,
      s.id || `SWS-${String(idx + 1).padStart(3, "0")}`,
      s.nama,
      s.nisn || "—",
      s.kelas,
      tapsCount,
      halteCount,
      gerbangCount,
      totalBobotStudent,
      avgBobotStudent,
      `${pctHalte}%`,
      avgEcoScore,
      kategoriEco,
      predikatEco,
      avgTimeStr,
      minTimeStr,
      maxTimeStr,
      tepatCount,
      telatCount,
      `${pctTepat}%`,
    ]);
  });

  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  wsStudents["!cols"] = [
    { wch: 5 },  // No
    { wch: 12 }, // ID
    { wch: 28 }, // Nama
    { wch: 16 }, // NISN
    { wch: 10 }, // Kelas
    { wch: 20 }, // Total Tap
    { wch: 22 }, // Tap Halte
    { wch: 24 }, // Tap Gerbang
    { wch: 18 }, // Total Bobot
    { wch: 20 }, // Rata-rata Bobot
    { wch: 20 }, // % Halte
    { wch: 22 }, // Skor Eco
    { wch: 24 }, // Kategori
    { wch: 42 }, // Predikat
    { wch: 18 }, // Rata-rata Jam
    { wch: 16 }, // Jam Terawal
    { wch: 16 }, // Jam Terakhir
    { wch: 18 }, // Total Tepat
    { wch: 14 }, // Total Telat
    { wch: 18 }, // % Tepat
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, "Data Statistik Siswa");

  // ─────────────────────────────────────────────────────────────
  // SHEET 3: Log Transaksi Tap Realtime (Raw Event Log)
  // ─────────────────────────────────────────────────────────────
  const logRows: (string | number)[][] = [];

  const logHeaders = [
    "No",
    "ID Transaksi",
    "Tanggal",
    "Hari",
    "Jam Tap",
    "ID Siswa",
    "Nama Siswa",
    "NISN / NFC Tag",
    "Kelas",
    "Kode Titik Tap",
    "Lokasi Tap Detail",
    "Bobot Tap",
    "Moda Transportasi",
    "Status Kehadiran",
    "Skor Eco Event",
  ];
  logRows.push(logHeaders);

  validTapRecords.forEach((r, idx) => {
    const studentInfo = siswaList.find(
      (s) =>
        (s.id && s.id === r.siswaId) ||
        s.nama.toLowerCase() === (r.siswa?.nama || "").toLowerCase()
    );

    const dateObj = new Date(r.tanggal);
    const dayName = formatDayHeader(dateObj).split(" ")[0];
    const jamTapStr = r.jamTap ? `${formatTime(r.jamTap)} WIB` : "—";

    const lokasiDetail =
      r.titikTap === TitikTap.HALTE
        ? "Halte Sekolah (Rendah Emisi)"
        : r.titikTap === TitikTap.GERBANG_SEKOLAH
        ? "Gerbang Utama (Potensi Tinggi Emisi)"
        : "—";

    const eco = tentukanEcoPoin(r.titikTap, r.modaTransport);
    const bobotTap = getBobotTap(r.titikTap);

    logRows.push([
      idx + 1,
      r.id,
      r.tanggal,
      dayName,
      jamTapStr,
      r.siswaId,
      r.siswa?.nama || studentInfo?.nama || "Siswa Tidak Dikenal",
      r.siswa?.nfcTagId || studentInfo?.nisn || "—",
      r.siswa?.kelas || studentInfo?.kelas || "—",
      r.titikTap || "—",
      lokasiDetail,
      bobotTap,
      r.modaTransport || "—",
      r.status,
      eco.skorEcoPoin,
    ]);
  });

  const wsLog = XLSX.utils.aoa_to_sheet(logRows);
  wsLog["!cols"] = [
    { wch: 5 },  // No
    { wch: 22 }, // ID Transaksi
    { wch: 14 }, // Tanggal
    { wch: 10 }, // Hari
    { wch: 14 }, // Jam Tap
    { wch: 12 }, // ID Siswa
    { wch: 28 }, // Nama
    { wch: 16 }, // NISN
    { wch: 10 }, // Kelas
    { wch: 18 }, // Kode Titik Tap
    { wch: 38 }, // Lokasi Detail
    { wch: 14 }, // Bobot Tap
    { wch: 20 }, // Moda Transportasi
    { wch: 16 }, // Status Kehadiran
    { wch: 16 }, // Skor Eco Event
  ];
  XLSX.utils.book_append_sheet(wb, wsLog, "Log Tap Realtime");

  const dateSuffix = toISODateString(new Date());
  XLSX.writeFile(wb, `Dataset-Riset-UMCA-${namaSekolah.replace(/\s+/g, "-")}-${dateSuffix}.xlsx`);
}

/**
 * Download template Excel kosong (hanya header)
 */
export function downloadTemplateSiswa(): void {
  const wb = XLSX.utils.book_new();
  const rows: string[][] = [
    ["Nama", "NISN/NIS", "Kelas"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.writeFile(wb, "Template-Import-Siswa.xlsx");
}

/**
 * Parse file Excel yang diupload menjadi array SiswaRow.
 * Kolom yang diharapkan: Nama | NISN/NIS | Kelas (case-insensitive, urutan bebas)
 * Baris tanpa nama atau kelas dilewati.
 */
export async function parseSiswaFromExcel(file: File): Promise<{
  data: SiswaRow[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const ab = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(ab, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) {
          resolve({ data: [], errors: ["File kosong atau tidak memiliki baris data."] });
          return;
        }

        // Deteksi baris header (baris pertama non-kosong)
        const headerRowIdx = raw.findIndex((r) => r.some((c) => String(c).trim() !== ""));
        if (headerRowIdx === -1) {
          resolve({ data: [], errors: ["Tidak ditemukan baris header."] });
          return;
        }

        const headers = raw[headerRowIdx].map((h) => String(h).toLowerCase().trim());

        // Cari index kolom secara fleksibel
        const namaIdx = headers.findIndex((h) => h.includes("nama"));
        const nisnIdx = headers.findIndex((h) => h.includes("nisn") || h.includes("nis") || h.includes("nomor"));
        const kelasIdx = headers.findIndex((h) => h.includes("kelas"));

        if (namaIdx === -1) {
          resolve({ data: [], errors: ['Kolom "Nama" tidak ditemukan di header.'] });
          return;
        }
        if (kelasIdx === -1) {
          resolve({ data: [], errors: ['Kolom "Kelas" tidak ditemukan di header.'] });
          return;
        }

        const data: SiswaRow[] = [];
        const errors: string[] = [];

        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const row = raw[i];
          const nama = String(row[namaIdx] ?? "").trim();
          const nisn = nisnIdx !== -1 ? String(row[nisnIdx] ?? "").trim() : "";
          const kelas = String(row[kelasIdx] ?? "").trim();

          if (!nama && !nisn && !kelas) continue; // baris kosong, lewati

          const rowNum = i + 1;
          if (!nama) {
            errors.push(`Baris ${rowNum}: Nama kosong.`);
            continue;
          }
          if (!kelas) {
            errors.push(`Baris ${rowNum}: Kelas kosong.`);
            continue;
          }
          // Validasi NIS max 20 karakter
          if (nisn && nisn.trim().length > 20) {
            errors.push(`Baris ${rowNum}: NISN/NIS "${nisn}" melebihi 20 karakter — dilewati.`);
            continue;
          }

          data.push({ nama, nisn: nisn.trim(), kelas });
        }

        resolve({ data, errors });
      } catch (err: any) {
        resolve({ data: [], errors: [`Gagal membaca file: ${err.message}`] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

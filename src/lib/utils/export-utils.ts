// Excel export utility for PresenceSync
// Uses SheetJS (xlsx) to generate .xlsx files client-side

import * as XLSX from "xlsx";
import type { RekapKehadiranRow } from "@/lib/types";
import { StatusKehadiran } from "@/lib/types";
import { formatDayHeader, formatMonthYear, toISODateString } from "@/lib/utils/date-utils";
import { getStatusLabel } from "@/lib/utils/attendance-utils";
import { tentukanEcoPoin } from "@/lib/eco-assessment";

/**
 * Export attendance recap data to an Excel (.xlsx) file.
 */
export function exportAttendanceToExcel(
  data: RekapKehadiranRow[],
  weekdays: Date[],
  month: number,
  year: number,
  kelas: string,
  namaSekolah: string = "SDI-Al-Irsyadiah"
): void {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Build data array
  const rows: (string | number)[][] = [];

  // Row 1: School name + period
  rows.push([`${namaSekolah} — Rekap Kehadiran ${formatMonthYear(month, year)}`]);
  rows.push([`Kelas: ${kelas}`]);
  rows.push([]); // Empty row

  // Header row
  const headers = ["No", "Nama Siswa"];
  weekdays.forEach((day) => {
    headers.push(formatDayHeader(day));
  });
  headers.push("Titik Tap (Dominan)");
  headers.push("Kategori Emisi (Estimasi)");
  headers.push("% Tepat Waktu");
  rows.push(headers);

  // Data rows
  data.forEach((row, idx) => {
    const dataRow: (string | number)[] = [idx + 1, row.siswa.nama];

    let halteCount = 0;
    let gerbangCount = 0;
    let totalEcoScore = 0;
    let validEcoCount = 0;

    weekdays.forEach((day) => {
      const dateKey = toISODateString(day);
      const kehadiran = row.kehadiran[dateKey];
      if (kehadiran) {
        dataRow.push(getStatusLabel(kehadiran.status));
        
        if (kehadiran.status !== StatusKehadiran.ABSEN && kehadiran.titikTap) {
          if (kehadiran.titikTap === "HALTE") halteCount++;
          if (kehadiran.titikTap === "GERBANG_SEKOLAH") gerbangCount++;
          
          const eco = tentukanEcoPoin(kehadiran.titikTap, kehadiran.modaTransport);
          totalEcoScore += eco.skorEcoPoin;
          validEcoCount++;
        }
      } else {
        dataRow.push("-");
      }
    });

    const dominantTap = halteCount === 0 && gerbangCount === 0
      ? "—"
      : halteCount >= gerbangCount
        ? `Halte (${halteCount}x)`
        : `Gerbang (${gerbangCount}x)`;

    const averageEcoScore = validEcoCount > 0 ? Math.round(totalEcoScore / validEcoCount) : 0;
    let kategoriEmisi = "—";
    if (validEcoCount > 0) {
      if (averageEcoScore >= 70) {
        kategoriEmisi = "Rendah Emisi";
      } else if (averageEcoScore >= 40) {
        kategoriEmisi = "Sedang";
      } else {
        kategoriEmisi = "Tinggi Emisi";
      }
    }

    dataRow.push(dominantTap);
    dataRow.push(kategoriEmisi);
    dataRow.push(`${row.persentaseTepatWaktu}%`);
    rows.push(dataRow);
  });

  // Create worksheet from data
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 4 },  // No
    { wch: 25 }, // Nama Siswa
    ...weekdays.map(() => ({ wch: 12 })), // Day columns
    { wch: 20 }, // Titik Tap
    { wch: 22 }, // Kategori Emisi
    { wch: 14 }, // % column
  ];
  ws["!cols"] = colWidths;

  // Merge cells for title row
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(headers.length - 1, 10) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Kehadiran");

  // Generate month name for filename
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  // Download file
  const fileName = `Rekap-Kehadiran-${kelas}-${monthNames[month]}-${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ─── Siswa Export / Import ────────────────────────────────────

export interface SiswaRow {
  nama: string;
  nisn: string;
  kelas: string;
}

/**
 * Export daftar siswa ke file .xlsx
 */
export function exportSiswaToExcel(siswaList: SiswaRow[], namaSekolah: string = "UMCA"): void {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [];
  rows.push([`${namaSekolah} — Data Siswa`]);
  rows.push([`Diekspor pada: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`]);
  rows.push([]);
  rows.push(["No", "Nama Siswa", "NISN/NIS", "Kelas"]);

  siswaList.forEach((s, i) => {
    rows.push([i + 1, s.nama, s.nisn || "—", s.kelas]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 10 }];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, `Data-Siswa-${namaSekolah.replace(/\s+/g, "-")}.xlsx`);
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

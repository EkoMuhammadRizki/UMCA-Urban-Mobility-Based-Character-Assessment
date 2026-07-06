// Excel export utility for PresenceSync
// Uses SheetJS (xlsx) to generate .xlsx files client-side

import * as XLSX from "xlsx";
import type { RekapKehadiranRow } from "@/lib/types";
import { StatusKehadiran } from "@/lib/types";
import { formatDayHeader, formatMonthYear } from "@/lib/utils/date-utils";
import { getStatusLabel } from "@/lib/utils/attendance-utils";

/**
 * Export attendance recap data to an Excel (.xlsx) file.
 */
export function exportAttendanceToExcel(
  data: RekapKehadiranRow[],
  weekdays: Date[],
  month: number,
  year: number,
  kelas: string,
  namaSekolah: string = "SDN 1 Kota Semarang"
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
  headers.push("% Tepat Waktu");
  rows.push(headers);

  // Data rows
  data.forEach((row, idx) => {
    const dataRow: (string | number)[] = [idx + 1, row.siswa.nama];

    weekdays.forEach((day) => {
      const dateKey = day.toISOString().split("T")[0];
      const kehadiran = row.kehadiran[dateKey];
      if (kehadiran) {
        dataRow.push(getStatusLabel(kehadiran.status));
      } else {
        dataRow.push("-");
      }
    });

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

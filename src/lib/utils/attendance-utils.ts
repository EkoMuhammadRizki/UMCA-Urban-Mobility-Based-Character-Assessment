// Attendance calculation utilities for PresenceSync

import { StatusKehadiran } from "@/lib/types";
import type { Kehadiran } from "@/lib/types";

/**
 * Calculate attendance status based on tap time vs school start time.
 * @param jamTap - The tap timestamp (Date or ISO string)
 * @param jamMasuk - School start time in "HH:mm" format (e.g. "07:00")
 * @param toleransiMenit - Tolerance in minutes (default 0)
 * @returns StatusKehadiran
 */
export function calculateAttendanceStatus(
  jamTap: Date | string | null,
  jamMasuk: string = "07:00",
  toleransiMenit: number = 0
): StatusKehadiran {
  if (!jamTap) return StatusKehadiran.ABSEN;

  const tap = typeof jamTap === "string" ? new Date(jamTap) : jamTap;
  const [hours, minutes] = jamMasuk.split(":").map(Number);

  // Create a comparison date with school start time on the same day
  const batasWaktu = new Date(tap);
  batasWaktu.setHours(hours, minutes + toleransiMenit, 0, 0);

  if (tap <= batasWaktu) {
    return StatusKehadiran.TEPAT_WAKTU;
  }
  return StatusKehadiran.TELAT;
}

/**
 * Calculate the percentage of on-time attendance from a list of records.
 */
export function calculatePercentage(records: Kehadiran[]): number {
  if (records.length === 0) return 0;

  const tepatWaktu = records.filter(
    (r) => r.status === StatusKehadiran.TEPAT_WAKTU
  ).length;

  return Math.round((tepatWaktu / records.length) * 100);
}

/**
 * Calculate attendance distribution (counts).
 */
export function calculateDistribusi(records: Kehadiran[]): {
  tepatWaktu: number;
  telat: number;
  absen: number;
} {
  return {
    tepatWaktu: records.filter((r) => r.status === StatusKehadiran.TEPAT_WAKTU).length,
    telat: records.filter((r) => r.status === StatusKehadiran.TELAT).length,
    absen: records.filter((r) => r.status === StatusKehadiran.ABSEN).length,
  };
}

/**
 * Get students who are frequently late (more than threshold days in a month).
 */
export function getFrequentlyLateCount(
  allRecords: Kehadiran[],
  threshold: number = 3
): number {
  const bySiswa = new Map<string, number>();

  allRecords.forEach((record) => {
    if (record.status === StatusKehadiran.TELAT) {
      bySiswa.set(record.siswaId, (bySiswa.get(record.siswaId) || 0) + 1);
    }
  });

  let count = 0;
  bySiswa.forEach((telatCount) => {
    if (telatCount >= threshold) count++;
  });

  return count;
}

/**
 * Get the status label in Indonesian.
 */
export function getStatusLabel(status: StatusKehadiran): string {
  switch (status) {
    case StatusKehadiran.TEPAT_WAKTU:
      return "Tepat Waktu";
    case StatusKehadiran.TELAT:
      return "Telat";
    case StatusKehadiran.ABSEN:
      return "Absen";
    default:
      return "Tidak Diketahui";
  }
}

/**
 * Get compact status label for table cells.
 */
export function getStatusLabelCompact(status: StatusKehadiran): string {
  switch (status) {
    case StatusKehadiran.TEPAT_WAKTU:
      return "TW";
    case StatusKehadiran.TELAT:
      return "T";
    case StatusKehadiran.ABSEN:
      return "A";
    default:
      return "-";
  }
}

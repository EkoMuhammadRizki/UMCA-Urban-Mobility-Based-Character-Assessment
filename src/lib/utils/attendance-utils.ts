// Attendance calculation utilities for PresenceSync

import { StatusKehadiran } from "@/lib/types";
import type { Kehadiran } from "@/lib/types";

/**
 * Calculate attendance status based on tap time vs threshold time.
 *
 * IMPORTANT — timezone safety:
 * Both `jamTap` and `thresholdTime` must refer to the **same local wall-clock day**.
 * We compare only HH:mm (minutes from midnight) to avoid UTC offset bugs when the
 * server runs in a different timezone than the school (e.g. server UTC vs school WIB).
 *
 * @param jamTap          - The tap timestamp (Date or ISO string).
 *                          If a Date, its local HH:mm is used.
 *                          If a string like "HH:mm" it is used directly.
 *                          If a full ISO string, it is parsed and local HH:mm is extracted.
 * @param thresholdTime   - Deadline in "HH:mm" format (e.g. "07:00"). Tap <= this → TEPAT_WAKTU.
 * @param toleransiMenit  - Extra minutes added to thresholdTime (default 0).
 * @returns StatusKehadiran
 */
export function calculateAttendanceStatus(
  jamTap: Date | string | null,
  thresholdTime: string = "07:00",
  toleransiMenit: number = 0
): StatusKehadiran {
  if (!jamTap) return StatusKehadiran.ABSEN;

  // --- extract tap minutes-from-midnight ---
  let tapMinutes: number;
  if (jamTap instanceof Date) {
    tapMinutes = jamTap.getHours() * 60 + jamTap.getMinutes();
  } else if (/^\d{2}:\d{2}$/.test(jamTap)) {
    // plain "HH:mm" string
    const [h, m] = jamTap.split(":").map(Number);
    tapMinutes = h * 60 + m;
  } else {
    // ISO string — parse then use local time
    const d = new Date(jamTap);
    if (isNaN(d.getTime())) return StatusKehadiran.ABSEN;
    tapMinutes = d.getHours() * 60 + d.getMinutes();
  }

  // --- extract threshold minutes-from-midnight ---
  const [thH, thM] = thresholdTime.split(":").map(Number);
  const deadlineMinutes = thH * 60 + thM + toleransiMenit;

  return tapMinutes <= deadlineMinutes
    ? StatusKehadiran.TEPAT_WAKTU
    : StatusKehadiran.TELAT;
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

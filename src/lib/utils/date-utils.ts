// Date utility functions for PresenceSync
// All functions are weekday-aware (Mon-Fri only)

import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  getDay,
  format,
  isWeekend,
  isSameDay,
  getDaysInMonth,
} from "date-fns";
import { id as localeID } from "date-fns/locale";

/**
 * Returns all weekday (Mon-Fri) dates in a given month/year.
 */
export function getWeekdaysInMonth(month: number, year: number): Date[] {
  const start = startOfMonth(new Date(year, month)); // month is 0-indexed
  const end = endOfMonth(start);

  const allDays = eachDayOfInterval({ start, end });
  return allDays.filter((day) => !isWeekend(day));
}

/**
 * Format a date to column header like "Sen 1", "Sel 2", etc.
 */
export function formatDayHeader(date: Date): string {
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const dayName = dayNames[getDay(date)];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
}

/**
 * Get the number of school days (weekdays) in a month.
 */
export function getSchoolDaysCount(month: number, year: number): number {
  return getWeekdaysInMonth(month, year).length;
}

/**
 * Check if a date is a weekday.
 */
export function isWeekday(date: Date): boolean {
  return !isWeekend(date);
}

/**
 * Format month name in Indonesian.
 */
export function formatMonthYear(month: number, year: number): string {
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${monthNames[month]} ${year}`;
}

/**
 * Format month name short in Indonesian.
 */
export function formatMonthShort(month: number): string {
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return monthNames[month];
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD).
 */
export function toISODateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format time from a Date or ISO string to "HH:mm".
 */
export function formatTime(dateOrString: Date | string): string {
  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  return format(date, "HH:mm");
}

/**
 * Format a full date in Indonesian like "Senin, 7 Juli 2026".
 */
export function formatFullDate(dateOrString: Date | string): string {
  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  return format(date, "EEEE, d MMMM yyyy", { locale: localeID });
}

/**
 * Get minutes since midnight from a Date.
 */
export function getMinutesSinceMidnight(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Format minutes since midnight to time string "HH:mm".
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Get all month names for the MonthPicker.
 */
export function getMonthNames(): string[] {
  return [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
}

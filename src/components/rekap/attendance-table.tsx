"use client";

import { useMemo } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { getWeekdaysInMonth, formatDayHeader, toISODateString, formatTime } from "@/lib/utils/date-utils";
import type { RekapKehadiranRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { tentukanEcoPoin } from "@/lib/eco-assessment";

interface AttendanceTableProps {
  data: RekapKehadiranRow[];
  month: number;
  year: number;
  isLoading?: boolean;
}

export function AttendanceTable({
  data,
  month,
  year,
  isLoading = false,
}: AttendanceTableProps) {
  const weekdays = useMemo(
    () => getWeekdaysInMonth(month, year),
    [month, year]
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-12 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl">📋</span>
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-1">
          Belum Ada Data
        </h3>
        <p className="text-sm text-text-secondary">
          Data kehadiran untuk bulan ini belum tersedia.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card shadow-sm">
      <div className="p-6 pb-4">
        <h3 className="text-base font-semibold text-text-primary">
          Tabel Rekap Kehadiran
        </h3>
        <p className="text-sm text-text-secondary">
          {data.length} siswa • {weekdays.length} hari sekolah
        </p>
      </div>

      <div className="overflow-x-auto attendance-table-scroll">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#FAFBFC] border-y border-border-subtle">
              {/* Sticky: No */}
              <th className="sticky left-0 z-20 bg-[#FAFBFC] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary w-12 border-r border-border-subtle">
                No
              </th>
              {/* Sticky: Nama Siswa */}
              <th className="sticky left-12 z-20 bg-[#FAFBFC] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary min-w-[180px] border-r border-border-subtle">
                Nama Siswa
              </th>
              {/* Day columns */}
              {weekdays.map((day) => (
                <th
                  key={toISODateString(day)}
                  className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-secondary min-w-[72px]"
                >
                  <div className="leading-tight">
                    <div>{formatDayHeader(day).split(" ")[0]}</div>
                    <div className="text-text-muted font-normal">
                      {day.getDate()}
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary min-w-[120px]">
                Titik Tap (Dominan)
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary min-w-[140px]">
                Kategori Emisi
              </th>
              {/* Summary column */}
              <th className="sticky right-0 z-20 bg-[#FAFBFC] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-secondary min-w-[90px] border-l border-border-subtle">
                % TW
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((row, idx) => {
              const kehadiranList = Object.values(row.kehadiran).filter((k) => k.status !== "ABSEN");

              let halteCount = 0;
              let gerbangCount = 0;
              let totalEcoScore = 0;
              let validEcoCount = 0;

              kehadiranList.forEach((k) => {
                if (k.titikTap) {
                  if (k.titikTap === "HALTE") halteCount++;
                  if (k.titikTap === "GERBANG_SEKOLAH") gerbangCount++;
                  
                  const eco = tentukanEcoPoin(k.titikTap, k.modaTransport);
                  totalEcoScore += eco.skorEcoPoin;
                  validEcoCount++;
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

              return (
                <tr
                  key={row.siswa.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  {/* No */}
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/80 px-4 py-2.5 text-sm text-text-secondary border-r border-border-subtle transition-colors">
                    {idx + 1}
                  </td>
                  {/* Nama Siswa */}
                  <td className="sticky left-12 z-10 bg-white group-hover:bg-slate-50/80 px-4 py-2.5 border-r border-border-subtle transition-colors">
                    <Link
                      href={`/guru/siswa/${row.siswa.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
                    >
                      {row.siswa.nama}
                    </Link>
                  </td>
                  {/* Day cells */}
                  {weekdays.map((day) => {
                    const dateStr = toISODateString(day);
                    const kehadiran = row.kehadiran[dateStr];

                    if (!kehadiran) {
                      return (
                        <td
                          key={dateStr}
                          className="px-2 py-2.5 text-center"
                        >
                          <span className="text-xs text-text-muted">-</span>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={dateStr}
                        className="px-1 py-2.5 text-center"
                      >
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">
                              <StatusBadge
                                status={kehadiran.status}
                                compact
                                showDot={false}
                              />
                          </TooltipTrigger>
                          <TooltipContent className="rounded-lg px-3 py-2 shadow-lg">
                            <div className="text-xs space-y-1 text-left">
                              <p className="font-semibold text-text-primary">
                                {kehadiran.jamTap
                                  ? `Tap: ${formatTime(kehadiran.jamTap)}`
                                  : "Tidak hadir"}
                              </p>
                              {kehadiran.jamTap && kehadiran.titikTap && (
                                <p className="text-text-secondary">
                                  Lokasi: {kehadiran.titikTap === "HALTE" ? "Halte (Bobot 3)" : "Gerbang Sekolah (Bobot 1)"}
                                </p>
                              )}
                              {kehadiran.jamTap && kehadiran.modaTransport && (
                                <p className="text-text-secondary">
                                  Moda: {kehadiran.modaTransport}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                  
                  {/* Dominan Titik Tap */}
                  <td className="px-4 py-2.5 text-center text-sm font-medium text-text-primary">
                    {dominantTap}
                  </td>
                  
                  {/* Kategori Emisi */}
                  <td className="px-4 py-2.5 text-center">
                    {kategoriEmisi !== "—" ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          kategoriEmisi === "Rendah Emisi"
                            ? "bg-status-green-bg text-status-green-text"
                            : kategoriEmisi === "Sedang"
                            ? "bg-status-amber-bg text-status-amber-text"
                            : "bg-status-red-bg text-status-red-text"
                        )}
                      >
                        {kategoriEmisi}
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>

                  {/* Summary % */}
                  <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50/80 px-4 py-2.5 text-center border-l border-border-subtle transition-colors">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        row.persentaseTepatWaktu >= 80
                          ? "text-status-green-text"
                          : row.persentaseTepatWaktu >= 60
                          ? "text-status-amber-text"
                          : "text-status-red-text"
                      )}
                    >
                      {row.persentaseTepatWaktu}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

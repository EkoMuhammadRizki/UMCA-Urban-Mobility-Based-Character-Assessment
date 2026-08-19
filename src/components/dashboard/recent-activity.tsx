"use client";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime, formatFullDate } from "@/lib/utils/date-utils";
import type { AktivitasTerbaru } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentActivityProps {
  activities: AktivitasTerbaru[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading = false }: RecentActivityProps) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Aktivitas Terbaru
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary">
            Tap NFC terakhir yang tercatat
          </p>
        </div>
        <a
          href="/guru/rekap-kehadiran"
          className="text-xs sm:text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors hover:underline"
        >
          Lihat Semua Data
        </a>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border-subtle p-3.5 bg-slate-50/50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60">
                <Skeleton className="h-5 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-secondary">
            Belum ada aktivitas tap tercatat hari ini.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-xl border border-border-subtle bg-white p-3.5 shadow-sm space-y-2.5 transition-colors hover:border-brand-200"
            >
              {/* Siswa & Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                    {activity.siswa.nama
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {activity.siswa.nama}
                    </p>
                    <p className="text-xs text-text-secondary">
                      Kelas {activity.siswa.kelas}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={activity.status} />
                </div>
              </div>

              {/* Titik Tap, Jam Tap, Tanggal */}
              <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs">
                <div>
                  {activity.titikTap === "HALTE" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                      Halte • Bobot 3
                    </span>
                  ) : activity.titikTap === "GERBANG_SEKOLAH" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                      Gerbang • Bobot 1
                    </span>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary font-medium tabular-nums">
                  <span>{formatTime(activity.jamTap)}</span>
                  <span className="text-slate-300">·</span>
                  <span>{formatFullDate(activity.tanggal)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Siswa
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Kelas
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Lokasi & Bobot
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Jam Tap
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Tanggal
              </th>
              <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {isLoading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-3 pr-4">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="py-3 pr-4">
                      <Skeleton className="h-5 w-10" />
                    </td>
                    <td className="py-3 pr-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="py-3 pr-4">
                      <Skeleton className="h-5 w-14" />
                    </td>
                    <td className="py-3 pr-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="py-3">
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </td>
                  </tr>
                ))
              : activities.map((activity) => (
                  <tr
                    key={activity.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                          {activity.siswa.nama
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-text-primary">
                          {activity.siswa.nama}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-text-secondary">
                      {activity.siswa.kelas}
                    </td>
                    <td className="py-3 pr-4 text-sm">
                      {activity.titikTap === "HALTE" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                          Halte • Bobot 3
                        </span>
                      ) : activity.titikTap === "GERBANG_SEKOLAH" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                          Gerbang • Bobot 1
                        </span>
                      ) : (
                        <span className="text-xs text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium text-text-primary tabular-nums">
                      {formatTime(activity.jamTap)}
                    </td>
                    <td className="py-3 pr-4 text-sm text-text-secondary">
                      {formatFullDate(activity.tanggal)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={activity.status} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

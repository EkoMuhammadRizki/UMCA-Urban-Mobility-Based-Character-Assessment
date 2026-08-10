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
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Aktivitas Terbaru
          </h3>
          <p className="text-sm text-text-secondary">
            Tap NFC terakhir yang tercatat
          </p>
        </div>
        <a
          href="/guru/rekap-kehadiran"
          className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors hover:underline"
        >
          Lihat Semua Data
        </a>
      </div>

      <div className="overflow-hidden">
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

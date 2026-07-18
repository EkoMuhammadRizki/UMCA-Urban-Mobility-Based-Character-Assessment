"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, CreditCard, School, TrendingUp, Leaf } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSiswaDetail } from "@/lib/mock-data";
import { formatTime, formatFullDate } from "@/lib/utils/date-utils";
import type { TrenBulanan } from "@/lib/types";
import { tentukanEcoPoin } from "@/lib/eco-assessment";
import { cn } from "@/lib/utils";

function TrendTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-lg border border-border-subtle">
      <p className="text-sm font-semibold text-text-primary">{label}</p>
      <p className="text-sm text-text-secondary">
        Ketepatan Waktu: <span className="font-bold text-brand-600">{payload[0].value}%</span>
      </p>
    </div>
  );
}

export default function SiswaDetailPage() {
  const params = useParams();
  const siswaId = params.id as string;

  const { data: siswa, isLoading } = useQuery({
    queryKey: ["siswa-detail", siswaId],
    queryFn: () => getSiswaDetail(siswaId),
    enabled: !!siswaId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[200px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl lg:col-span-2" />
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (!siswa) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <User className="h-10 w-10 text-text-muted" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">
          Siswa Tidak Ditemukan
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Data siswa dengan ID tersebut tidak tersedia.
        </p>
        <Link href="/guru/dashboard">
          <Button className="rounded-xl bg-brand-600 hover:bg-brand-700">
            Kembali ke Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Get current month records for the history table
  const now = new Date();
  const currentMonthRecords = siswa.kehadiran
    .filter((k) => {
      const d = new Date(k.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Latest trend data
  const latestTrend = siswa.trenBulanan[siswa.trenBulanan.length - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button + title */}
      <div className="flex items-center gap-4">
        <Link href="/guru/rekap-kehadiran">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border-subtle"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Detail Siswa
          </h1>
          <p className="text-sm text-text-secondary">
            Profil dan riwayat kehadiran
          </p>
        </div>
      </div>

      {/* Profile + Stats row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
              {siswa.nama
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-text-primary">{siswa.nama}</h2>

            <div className="mt-4 w-full space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                <School className="h-4 w-4 text-text-secondary" />
                <div className="text-left">
                  <p className="text-xs text-text-muted">Kelas</p>
                  <p className="text-sm font-semibold text-text-primary">{siswa.kelas}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                <CreditCard className="h-4 w-4 text-text-secondary" />
                <div className="text-left">
                  <p className="text-xs text-text-muted">NFC Tag ID</p>
                  <p className="text-sm font-semibold text-text-primary font-mono">{siswa.nfcTagId}</p>
                </div>
              </div>
              {(() => {
                const activeTaps = siswa.kehadiran.filter((k) => k.status !== "ABSEN" && k.titikTap);
                const halteCount = activeTaps.filter((k) => k.titikTap === "HALTE").length;
                const totalActive = activeTaps.length;
                const percentHalte = totalActive > 0 ? Math.round((halteCount / totalActive) * 100) : 0;
                
                return (
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                    <Leaf className="h-4 w-4 text-green-600" />
                    <div className="text-left">
                      <p className="text-xs text-text-muted">Eco-Awareness (Estimasi)</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {percentHalte}% Tap Halte
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 3-month trend chart */}
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                Tren Ketepatan Waktu
              </h3>
              <p className="text-sm text-text-secondary">3 bulan terakhir</p>
            </div>
            {latestTrend && (
              <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                <span className="text-sm font-semibold text-brand-600">
                  {latestTrend.persentaseTepatWaktu}%
                </span>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={siswa.trenBulanan} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<TrendTooltip />} />
              <Line
                type="monotone"
                dataKey="persentaseTepatWaktu"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 6, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 8, fill: "#2563EB" }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Stats below chart */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            {siswa.trenBulanan.map((t) => (
              <div key={t.bulan} className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-text-muted font-medium">{t.label}</p>
                <div className="mt-1 flex items-center justify-center gap-3 text-xs">
                  <span className="text-status-green-text font-semibold">TW: {t.tepatWaktu}</span>
                  <span className="text-status-amber-text font-semibold">T: {t.telat}</span>
                  <span className="text-status-gray-text font-semibold">A: {t.absen}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily History Table */}
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text-primary">
            Riwayat Kehadiran Bulan Ini
          </h3>
          <p className="text-sm text-text-secondary">
            {currentMonthRecords.length} hari tercatat
          </p>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Tanggal
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Hari
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Jam Tap
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Titik Tap
                </th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Estimasi Emisi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {currentMonthRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-text-secondary"
                  >
                    Belum ada data kehadiran bulan ini.
                  </td>
                </tr>
              ) : (
                currentMonthRecords.map((record) => {
                  const date = new Date(record.tanggal);
                  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                  
                  const hasTap = !!record.jamTap && !!record.titikTap;
                  const eco = hasTap ? tentukanEcoPoin(record.titikTap, record.modaTransport) : null;

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 text-sm text-text-primary">
                        {formatFullDate(record.tanggal)}
                      </td>
                      <td className="py-3 text-sm text-text-secondary">
                        {dayNames[date.getDay()]}
                      </td>
                      <td className="py-3 text-sm font-medium text-text-primary tabular-nums">
                        {record.jamTap ? formatTime(record.jamTap) : "—"}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3 text-sm text-text-primary">
                        {record.titikTap
                          ? record.titikTap === "HALTE"
                            ? "Halte"
                            : "Gerbang Sekolah"
                          : "—"}
                        {record.modaTransport ? ` (${record.modaTransport})` : ""}
                      </td>
                      <td className="py-3">
                        {eco ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              eco.kategori === "RENDAH_EMISI"
                                ? "bg-status-green-bg text-status-green-text"
                                : "bg-status-red-bg text-status-red-text"
                            )}
                          >
                            {eco.kategori === "RENDAH_EMISI"
                              ? "Rendah Emisi"
                              : "Tinggi Emisi"}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

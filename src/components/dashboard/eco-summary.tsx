"use client";

import { useQuery } from "@tanstack/react-query";
import { getEcoDashboardSummary } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Info, Award, Leaf, Zap } from "lucide-react";
import { getKategoriEmisiLabel, KategoriEmisi } from "@/lib/eco-assessment";

interface EcoSummaryProps {
  month: number;
  year: number;
}

function CustomEcoTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-lg border border-border-subtle">
      <p className="text-sm font-semibold text-text-primary mb-1">{label}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 rounded-full bg-[#15803D]" />
        <span className="text-text-secondary">Tap Halte (Rendah Emisi):</span>
        <span className="font-semibold text-text-primary">{payload[0].value} siswa</span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
        <span className="text-text-secondary">Tap Gerbang (Potensi Tinggi):</span>
        <span className="font-semibold text-text-primary">{payload[1].value} siswa</span>
      </div>
    </div>
  );
}

export function EcoSummary({ month, year }: EcoSummaryProps) {
  const { data: ecoData, isLoading } = useQuery({
    queryKey: ["eco-summary", month, year],
    queryFn: () => getEcoDashboardSummary(month, year),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Skeleton className="h-[360px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[360px] rounded-2xl lg:col-span-3" />
      </div>
    );
  }

  if (!ecoData) return null;

  return (
    <div className="space-y-6">
      {/* Divider heading */}
      <div className="border-t border-border-subtle pt-6">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-bold text-text-primary tracking-tight">
            Analisis Asesmen Karakter Lingkungan (Eco-Awareness)
          </h2>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">
          Indikator estimasi kepedulian lingkungan berdasarkan lokasi tap NFC siswa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left Column: Today's Ratio & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ratio Card */}
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              Sebaran Titik Tap Hari Ini
            </h3>
            
            <div className="space-y-5">
              {/* Halte ratio */}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-status-green-text" />
                    Halte (Rendah Emisi)
                  </span>
                  <span className="text-sm font-bold text-status-green-text">
                    {ecoData.hariIni.halteTaps} siswa ({ecoData.hariIni.haltePercentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-green-text transition-all duration-500 rounded-full" 
                    style={{ width: `${ecoData.hariIni.haltePercentage}%` }}
                  />
                </div>
              </div>

              {/* Gerbang ratio */}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-status-red-text" />
                    Gerbang (Potensi Tinggi)
                  </span>
                  <span className="text-sm font-bold text-status-red-text">
                    {ecoData.hariIni.gerbangTaps} siswa ({ecoData.hariIni.gerbangPercentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#EF4444] transition-all duration-500 rounded-full" 
                    style={{ width: `${ecoData.hariIni.gerbangPercentage}%` }}
                  />
                </div>
              </div>

              {/* Explanation Note */}
              <div className="flex gap-2 rounded-xl bg-blue-50/50 border border-blue-100/50 p-3 text-[11px] text-blue-700 mt-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <strong>Metodologi Estimasi:</strong> Tap di halte mengasumsikan siswa menggunakan bus sekolah atau transportasi ramah lingkungan. Tap di gerbang mengasumsikan siswa diantar kendaraan pribadi.
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Leaderboard Skor Eco Siswa
              </h3>
            </div>

            {ecoData.leaderboard.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                Belum ada data absensi siswa.
              </p>
            ) : (
              <div className="space-y-3">
                {ecoData.leaderboard.map((item, idx) => (
                  <div
                    key={item.siswaId}
                    className="flex items-center justify-between py-1.5 border-b border-border-subtle last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800"
                            : idx === 1
                            ? "bg-slate-100 text-slate-700"
                            : "text-text-muted"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold text-text-primary truncate">
                          {item.nama}
                        </span>
                        <p className="text-[10px] text-text-secondary leading-none mt-0.5">
                          Kelas {item.kelas} · {item.totalTaps} tap
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                        item.kategori === "RENDAH_EMISI"
                          ? "bg-status-green-bg text-status-green-text"
                          : "bg-status-red-bg text-status-red-text"
                      }`}
                    >
                      {item.haltePersentase}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tap Location Weekly Trend */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-brand-600" />
                <h3 className="text-base font-semibold text-text-primary">
                  Tren Lokasi Tap Mingguan
                </h3>
              </div>
              <p className="text-xs text-text-secondary mb-6">
                Jumlah sebaran tap di halte sekolah vs gerbang dalam 5 hari sekolah terakhir.
              </p>
            </div>

            <div className="flex-1">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={ecoData.sebaranMingguan}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip content={<CustomEcoTooltip />} />
                  <Bar
                    dataKey="halte"
                    name="Tap Halte (Rendah Emisi)"
                    fill="#15803D"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    dataKey="gerbang"
                    name="Tap Gerbang (Potensi Tinggi)"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6 border-t border-border-subtle pt-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-status-green-text" />
                <span className="text-xs text-text-secondary">Tap Halte (Rendah Emisi)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-[#EF4444]" />
                <span className="text-xs text-text-secondary">Tap Gerbang (Potensi Tinggi)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

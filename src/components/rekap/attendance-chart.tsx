"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartDataHarian, ChartDataScatter } from "@/lib/types";
import { StatusKehadiran } from "@/lib/types";
import { minutesToTimeString } from "@/lib/utils/date-utils";

interface AttendanceChartProps {
  chartDataHarian: ChartDataHarian[];
  chartDataScatter: ChartDataScatter[];
  isLoading?: boolean;
  siswaList?: { id: string; nama: string }[];
  selectedSiswa?: string;
  onSiswaChange?: (siswaId: string) => void;
}

// Custom tooltip for bar chart
function BarTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-lg border border-border-subtle">
      <p className="text-sm font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="font-semibold text-text-primary">{p.value} siswa</span>
        </div>
      ))}
    </div>
  );
}

// Custom tooltip for scatter chart
function ScatterTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataScatter }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-lg border border-border-subtle">
      <p className="text-sm font-semibold text-text-primary">{data.namaSiswa}</p>
      <p className="text-sm text-text-secondary">
        {data.label} • Tap: {data.jamTapLabel}
      </p>
      <p className="text-sm text-text-secondary">
        Status: {data.status === StatusKehadiran.TEPAT_WAKTU ? "Tepat Waktu" : "Telat"}
      </p>
    </div>
  );
}

export function AttendanceChart({
  chartDataHarian,
  chartDataScatter,
  isLoading = false,
  siswaList = [],
  selectedSiswa = "",
  onSiswaChange,
}: AttendanceChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-[320px] w-full rounded-lg" />
      </div>
    );
  }

  // Y-axis ticks for scatter (minutes since midnight → time label)
  const scatterYTicks = [
    360, 375, 390, 405, 420, 435, 450, 465, 480, // 06:00 to 08:00 every 15 min
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
      <Tabs defaultValue="harian" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Grafik Ketepatan Waktu
            </h3>
            <p className="text-sm text-text-secondary">
              Visualisasi kehadiran per hari
            </p>
          </div>
          <TabsList className="bg-slate-100 rounded-xl">
            <TabsTrigger
              value="harian"
              className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-sm"
            >
              Grafik Harian
            </TabsTrigger>
            <TabsTrigger
              value="detail"
              className="rounded-lg text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-text-primary data-[state=active]:shadow-sm"
            >
              Detail Jam Tap
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Bar chart per day */}
        <TabsContent value="harian" className="mt-0">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartDataHarian}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#EEF1F5"
                vertical={false}
              />
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
              <RechartsTooltip content={<BarTooltip />} />
              <Bar
                dataKey="tepatWaktu"
                name="Tepat Waktu"
                fill="#15803D"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="telat"
                name="Telat"
                fill="#F59E0B"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#15803D]" />
              <span className="text-sm text-text-secondary">Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#F59E0B]" />
              <span className="text-sm text-text-secondary">Telat</span>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Scatter chart - tap times */}
        <TabsContent value="detail" className="mt-0">
          {/* Student filter */}
          <div className="mb-4">
            <select
              value={selectedSiswa}
              onChange={(e) => onSiswaChange?.(e.target.value)}
              className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
            >
              <option value="">Semua Siswa</option>
              {siswaList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#EEF1F5"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                type="category"
                name="Tanggal"
                allowDuplicatedCategory={false}
              />
              <YAxis
                dataKey="jamTapMenit"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={false}
                tickLine={false}
                domain={[360, 480]}
                ticks={scatterYTicks}
                tickFormatter={(val: number) => minutesToTimeString(val)}
                name="Jam"
                reversed
              />
              <ZAxis range={[40, 40]} />
              <RechartsTooltip content={<ScatterTooltip />} />

              {/* Reference line at 07:00 (420 minutes) */}
              <ReferenceLine
                y={420}
                stroke="#B91C1C"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: "Jam Masuk 07:00",
                  position: "right",
                  fill: "#B91C1C",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />

              <Scatter
                data={chartDataScatter}
                shape="circle"
              >
                {chartDataScatter.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.status === StatusKehadiran.TEPAT_WAKTU
                        ? "#15803D"
                        : "#EF4444"
                    }
                    opacity={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#15803D]" />
              <span className="text-sm text-text-secondary">Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#EF4444]" />
              <span className="text-sm text-text-secondary">Telat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-6 border-t-2 border-dashed border-[#B91C1C]" />
              <span className="text-sm text-text-secondary">Batas Jam Masuk</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

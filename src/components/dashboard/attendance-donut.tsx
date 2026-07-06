"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AttendanceDonutProps {
  tepatWaktu: number;
  telat: number;
  absen: number;
}

const COLORS = {
  tepatWaktu: "#15803D",
  telat: "#F59E0B",
  absen: "#94A3B8",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; value: number; percentage: string };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-lg border border-border-subtle">
      <p className="text-sm font-semibold text-text-primary">
        {payload[0].payload.name}
      </p>
      <p className="text-sm text-text-secondary">
        {payload[0].value} siswa ({payload[0].payload.percentage})
      </p>
    </div>
  );
}

export function AttendanceDonut({ tepatWaktu, telat, absen }: AttendanceDonutProps) {
  const total = tepatWaktu + telat + absen;

  const data = [
    {
      name: "Tepat Waktu",
      value: tepatWaktu,
      color: COLORS.tepatWaktu,
      percentage: total > 0 ? `${Math.round((tepatWaktu / total) * 100)}%` : "0%",
    },
    {
      name: "Telat",
      value: telat,
      color: COLORS.telat,
      percentage: total > 0 ? `${Math.round((telat / total) * 100)}%` : "0%",
    },
    {
      name: "Absen",
      value: absen,
      color: COLORS.absen,
      percentage: total > 0 ? `${Math.round((absen / total) * 100)}%` : "0%",
    },
  ];

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary">
          Distribusi Kehadiran
        </h3>
        <p className="text-sm text-text-secondary">
          Ringkasan status bulan berjalan
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative h-[240px] w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text-primary">{total}</span>
            <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">
              Total
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-text-secondary">
              {item.name}
              <span className="ml-1 font-semibold text-text-primary">
                {item.percentage}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

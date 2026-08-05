"use client";

import { Users, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttendanceDonut } from "@/components/dashboard/attendance-donut";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { EcoSummary } from "@/components/dashboard/eco-summary";
import { getDashboardSummary, getRecentActivity } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useLiveAttendance } from "@/lib/hooks/use-live-attendance";

export default function DashboardPage() {
  useLiveAttendance();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary", currentMonth, currentYear],
    queryFn: () => getDashboardSummary(currentMonth, currentYear),
  });

  const { data: recentActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["recent-activities"],
    queryFn: () => getRecentActivity(10),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Dashboard Kehadiran
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Pantau ketepatan waktu dan aktivitas kehadiran siswa secara real-time.
        </p>
      </div>

      {/* Stat cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[160px] rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Siswa Terpantau"
            value={summary.totalSiswa}
            icon={Users}
            variant="gradient"
            badge={{ label: "Aktif", type: "positive" }}
          />
          <StatCard
            title="Rata-rata Ketepatan Waktu"
            value={`${summary.rataKetepatanWaktu}%`}
            icon={Clock}
            variant="gradient"
            badge={{
              label: summary.rataKetepatanWaktu >= 80 ? "Optimal" : "Perlu Perhatian",
              type: summary.rataKetepatanWaktu >= 80 ? "positive" : "negative",
            }}
          />
          <StatCard
            title="Siswa Sering Telat"
            value={summary.jumlahSeringTelat}
            icon={AlertTriangle}
            variant="white"
            badge={{
              label: `≥3 hari`,
              type: summary.jumlahSeringTelat > 5 ? "negative" : "neutral",
            }}
            subtitle="siswa di bulan ini"
          />
          <StatCard
            title="Hari Sekolah Bulan Ini"
            value={summary.hariSekolahBulanIni}
            icon={CalendarDays}
            variant="white"
            badge={{ label: "Sen-Jum", type: "neutral" }}
            subtitle="hari efektif"
          />
        </div>
      ) : null}

      {/* Charts + Table Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Donut Chart */}
        <div className="lg:col-span-2">
          {summaryLoading ? (
            <Skeleton className="h-[420px] rounded-2xl" />
          ) : summary ? (
            <AttendanceDonut
              tepatWaktu={summary.distribusiStatus.tepatWaktu}
              telat={summary.distribusiStatus.telat}
              absen={summary.distribusiStatus.absen}
            />
          ) : null}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <RecentActivity
            activities={recentActivities || []}
            isLoading={activitiesLoading}
          />
        </div>
      </div>

      {/* Eco-awareness section */}
      <EcoSummary month={currentMonth} year={currentYear} />
    </div>
  );
}

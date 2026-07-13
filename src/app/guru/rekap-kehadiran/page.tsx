"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MonthPicker } from "@/components/rekap/month-picker";
import { AttendanceTable } from "@/components/rekap/attendance-table";
import { AttendanceChart } from "@/components/rekap/attendance-chart";
import { ExportExcelButton } from "@/components/rekap/export-excel-button";
import {
  getRekapKehadiran,
  getChartDataHarian,
  getChartDataScatter,
  getSiswaList,
} from "@/lib/mock-data";

export default function RekapKehadiranPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedSiswa, setSelectedSiswa] = useState("");
  const [selectedKelas, setSelectedKelas] = useState(""); // Default ke Semua Kelas agar siswa 4-A langsung tampil

  // Fetch siswa list
  const { data: siswaList } = useQuery({
    queryKey: ["siswa-list"],
    queryFn: () => getSiswaList(),
  });

  // Fetch rekap data
  const { data: rekapData, isLoading: rekapLoading } = useQuery({
    queryKey: ["rekap-kehadiran", selectedMonth, selectedYear, selectedKelas],
    queryFn: () => getRekapKehadiran(selectedMonth, selectedYear, selectedKelas),
  });

  // Fetch chart data (bar)
  const { data: chartHarian, isLoading: chartHarianLoading } = useQuery({
    queryKey: ["chart-harian", selectedMonth, selectedYear, selectedKelas],
    queryFn: () => getChartDataHarian(selectedMonth, selectedYear, selectedKelas),
  });

  // Fetch chart data (scatter)
  const { data: chartScatter, isLoading: chartScatterLoading } = useQuery({
    queryKey: ["chart-scatter", selectedMonth, selectedYear, selectedSiswa],
    queryFn: () =>
      getChartDataScatter(
        selectedMonth,
        selectedYear,
        selectedSiswa || undefined
      ),
  });

  const siswaListForFilter = useMemo(
    () =>
      (siswaList || []).filter((s) => !selectedKelas || s.kelas === selectedKelas).map(
        (s) => ({ id: s.id, nama: s.nama })
      ),
    [siswaList, selectedKelas]
  );

  const handleMonthSelect = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Available classes (from mock data)
  const kelasList = useMemo(() => {
    const classes = new Set((siswaList || []).map((s) => s.kelas));
    return Array.from(classes).sort();
  }, [siswaList]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Rekap Kehadiran
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Pantau rekap kehadiran siswa berdasarkan bulan dan kelas.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Month Picker */}
        <MonthPicker
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onSelect={handleMonthSelect}
        />

        {/* Class filter */}
        <select
          value={selectedKelas}
          onChange={(e) => setSelectedKelas(e.target.value)}
          className="h-10 rounded-xl border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export button */}
        <ExportExcelButton
          data={rekapData || []}
          month={selectedMonth}
          year={selectedYear}
          kelas={selectedKelas || "Semua"}
          disabled={rekapLoading || !rekapData?.length}
        />
      </div>

      {/* Attendance Table */}
      <AttendanceTable
        data={rekapData || []}
        month={selectedMonth}
        year={selectedYear}
        isLoading={rekapLoading}
      />

      {/* Charts */}
      <AttendanceChart
        chartDataHarian={chartHarian || []}
        chartDataScatter={chartScatter || []}
        isLoading={chartHarianLoading || chartScatterLoading}
        siswaList={siswaListForFilter}
        selectedSiswa={selectedSiswa}
        onSiswaChange={setSelectedSiswa}
      />
    </div>
  );
}

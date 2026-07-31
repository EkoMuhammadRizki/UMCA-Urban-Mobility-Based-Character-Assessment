"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { RekapKehadiranRow } from "@/lib/types";
import { getWeekdaysInMonth } from "@/lib/utils/date-utils";
import { exportAttendanceToExcel } from "@/lib/utils/export-utils";

interface ExportExcelButtonProps {
  data: RekapKehadiranRow[];
  month: number;
  year: number;
  kelas: string;
  namaSekolah?: string;
  disabled?: boolean;
}

export function ExportExcelButton({
  data,
  month,
  year,
  kelas,
  namaSekolah = "SDI AL-Irsyadiah",
  disabled = false,
}: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (data.length === 0) {
      toast.warning("Tidak ada data untuk diekspor", {
        description: "Pilih bulan yang memiliki data kehadiran.",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Small delay for UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      const weekdays = getWeekdaysInMonth(month, year);
      exportAttendanceToExcel(data, weekdays, month, year, kelas, namaSekolah);

      toast.success("Export berhasil! 🎉", {
        description: `File .xlsx telah diunduh.`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Gagal mengekspor data", {
        description: "Terjadi kesalahan saat membuat file Excel.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant="outline"
      className="h-10 gap-2 rounded-xl border-border-subtle bg-white px-4 text-sm font-medium text-text-primary hover:bg-slate-50 shadow-sm"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
      ) : (
        <Download className="h-4 w-4 text-brand-600" />
      )}
      <span>{isExporting ? "Mengekspor..." : "Export Excel"}</span>
    </Button>
  );
}

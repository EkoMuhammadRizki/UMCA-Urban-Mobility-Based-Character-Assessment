"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Loader2, Calendar, Database, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatMonthYear } from "@/lib/utils/date-utils";

interface DeleteAttendanceButtonProps {
  month: number;
  year: number;
  disabled?: boolean;
}

export function DeleteAttendanceButton({
  month,
  year,
  disabled = false,
}: DeleteAttendanceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<"month" | "all">("month");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const currentMonthLabel = formatMonthYear(month, year);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch("/api/attendance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          month,
          year,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus data kehadiran");
      }

      toast.success(
        scope === "all"
          ? "Semua data riwayat kehadiran berhasil dihapus! (Reset Total)"
          : `Data kehadiran ${currentMonthLabel} berhasil dihapus!`,
        {
          description: "Database Supabase telah diperbarui.",
        }
      );

      // Invalidate semua query terkait absensi
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rekap-kehadiran"] }),
        queryClient.invalidateQueries({ queryKey: ["chart-harian"] }),
        queryClient.invalidateQueries({ queryKey: ["chart-scatter"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["recent-activities"] }),
        queryClient.invalidateQueries({ queryKey: ["eco-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["siswa-list"] }),
      ]);

      setIsOpen(false);
    } catch (error: any) {
      console.error("Delete attendance error:", error);
      toast.error("Gagal menghapus data kehadiran", {
        description: error.message || "Terjadi kesalahan koneksi ke database.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        variant="outline"
        className="h-10 gap-2 rounded-xl border-red-200 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm transition-all"
        title="Hapus / Reset data kehadiran"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
        <span>Hapus Kehadiran</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-text-primary">
              Hapus Data Kehadiran
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-text-secondary">
              Pilih cakupan data kehadiran yang ingin dibersihkan dari database Supabase.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Pilihan Lingkup Hapus */}
            <div className="grid grid-cols-1 gap-3">
              {/* Opsi 1: Bulan ini */}
              <button
                type="button"
                onClick={() => setScope("month")}
                className={`relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  scope === "month"
                    ? "border-brand-600 bg-brand-50/50 ring-2 ring-brand-600/20"
                    : "border-border-subtle bg-white hover:bg-slate-50"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  scope === "month" ? "bg-brand-600 text-white" : "bg-slate-100 text-text-secondary"
                }`}>
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="text-sm font-semibold text-text-primary">
                    Hanya Bulan Ini ({currentMonthLabel})
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Menghapus riwayat absensi khusus untuk bulan {currentMonthLabel}. Bulan lainnya tetap tersimpan.
                  </p>
                </div>
                {scope === "month" && (
                  <div className="absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Opsi 2: Reset Total / Semua Data (TRUNCATE) */}
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`relative flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  scope === "all"
                    ? "border-red-600 bg-red-50/50 ring-2 ring-red-600/20"
                    : "border-border-subtle bg-white hover:bg-slate-50"
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  scope === "all" ? "bg-red-600 text-white" : "bg-slate-100 text-text-secondary"
                }`}>
                  <Database className="h-4 w-4" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="text-sm font-semibold text-red-600">
                    Semua Data Kehadiran (Reset Total)
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Mengosongkan seluruh tabel kehadiran dari semua periode (setara dengan{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">
                      TRUNCATE TABLE &quot;Kehadiran&quot;
                    </code>
                    ).
                  </p>
                </div>
                {scope === "all" && (
                  <div className="absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {/* Warning Alert */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">Tindakan ini bersifat permanen!</span>
                Data absensi yang dihapus langsung dihilangkan dari database Supabase dan tidak dapat dipulihkan kembali.
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
              className="rounded-xl border-border-subtle"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {scope === "all" ? "Hapus Semua Data" : "Hapus Kehadiran Bulan Ini"}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

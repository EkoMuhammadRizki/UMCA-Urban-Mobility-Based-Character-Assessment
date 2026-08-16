"use client";

import { Database, ShieldAlert, CheckCircle2 } from "lucide-react";
import { DeleteAttendanceButton } from "@/components/rekap/delete-attendance-button";

export default function PengaturanPage() {
  const now = new Date();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Konfigurasi sistem, pemeliharaan basis data, dan preferensi akun.
        </p>
      </div>

      {/* Database Maintenance Section */}
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Manajemen Basis Data (Database)
            </h2>
            <p className="text-xs text-text-secondary">
              Kelola dan bersihkan data riwayat presensi di Supabase tanpa perlu menjalankan SQL manual.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/40 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-950">
                Pembersihan Data Kehadiran (Reset Database)
              </h3>
              <p className="text-xs text-red-800/80 mt-1 leading-relaxed">
                Fitur ini menghapus rekaman di tabel <code className="font-mono font-bold bg-white/70 px-1 py-0.5 rounded border border-red-200">Kehadiran</code> di Supabase. Anda dapat memilih untuk menghapus per bulan tertentu atau melakukan <strong>Reset Total</strong> (setara perintah <code className="font-mono text-[11px] bg-white/70 px-1 py-0.5 rounded border border-red-200">TRUNCATE TABLE &quot;Kehadiran&quot; CASCADE;</code>).
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-red-100">
            <div className="text-xs text-text-secondary">
              Data master siswa dan sekolah tidak akan terpengaruh.
            </div>
            <DeleteAttendanceButton
              month={now.getMonth()}
              year={now.getFullYear()}
            />
          </div>
        </div>
      </div>

      {/* Database Connection Status */}
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Koneksi Database Supabase Aktif
              </h3>
              <p className="text-xs text-text-secondary">
                Sinkronisasi tabel Siswa, Kehadiran, NfcReader, dan Sekolah terhubung secara realtime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

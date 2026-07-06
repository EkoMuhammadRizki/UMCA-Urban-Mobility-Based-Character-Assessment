import { Settings } from "lucide-react";

export default function PengaturanPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Pengaturan
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Konfigurasi sistem dan preferensi akun.
        </p>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-card p-12 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Settings className="h-8 w-8 text-text-muted" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-1">
          Segera Hadir
        </h3>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          Halaman pengaturan sedang dalam pengembangan. Fitur konfigurasi jam masuk sekolah,
          toleransi keterlambatan, dan manajemen akun akan tersedia di versi berikutnya.
        </p>
      </div>
    </div>
  );
}

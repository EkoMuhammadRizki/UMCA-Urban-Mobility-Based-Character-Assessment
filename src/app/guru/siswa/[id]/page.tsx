"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, User, CreditCard, School, TrendingUp, Leaf, Award,
  Pencil, Trash2, Loader2, Save, X,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSiswaDetail } from "@/lib/mock-data";
import { formatTime, formatFullDate } from "@/lib/utils/date-utils";
import { tentukanEcoPoin } from "@/lib/eco-assessment";
import { cn } from "@/lib/utils";

// ─── Tooltip rekap ────────────────────────────────────────────
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
        Ketepatan Waktu:{" "}
        <span className="font-bold text-brand-600">{payload[0].value}%</span>
      </p>
    </div>
  );
}

// ─── Inline edit form ─────────────────────────────────────────
interface EditForm { nama: string; nisn: string; kelas: string }

function EditProfileCard({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: {
  form: EditForm;
  onChange: (f: EditForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const inputClass =
    "w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600";

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">Nama Lengkap</label>
        <input
          type="text"
          value={form.nama}
          onChange={(e) => onChange({ ...form, nama: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          NISN / NIS <span className="text-text-muted">(maks. 20 karakter)</span>
        </label>
        <input
          type="text"
          placeholder="Contoh: 0123456789 atau 23E07929"
          maxLength={20}
          value={form.nisn}
          onChange={(e) =>
            onChange({ ...form, nisn: e.target.value.slice(0, 20) })
          }
          className={inputClass}
        />
        <p className="mt-0.5 text-xs text-text-muted">{form.nisn.length}/20 karakter</p>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-text-secondary">Kelas</label>
        <input
          type="text"
          value={form.kelas}
          onChange={(e) => onChange({ ...form, kelas: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Batal
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SiswaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siswaId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ nama: "", nisn: "", kelas: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: siswa, isLoading, refetch } = useQuery({
    queryKey: ["siswa-detail", siswaId],
    queryFn: () => getSiswaDetail(siswaId),
    enabled: !!siswaId,
  });

  // ── Edit ──────────────────────────────────────────────────
  function startEdit() {
    if (!siswa) return;
    setEditForm({ nama: siswa.nama, nisn: siswa.nfcTagId, kelas: siswa.kelas });
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!editForm.nama.trim()) {
      Swal.fire({ icon: "warning", title: "Nama wajib diisi.", confirmButtonColor: "#2563EB" });
      return;
    }
    if (!editForm.kelas.trim()) {
      Swal.fire({ icon: "warning", title: "Kelas wajib diisi.", confirmButtonColor: "#2563EB" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/siswa/${siswaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editForm.nama,
          nisn: editForm.nisn,
          kelas: editForm.kelas,
        }),
      });
      const json = await res.json();

      if (json.success) {
        await Swal.fire({
          icon: "success",
          title: "Data berhasil diperbarui!",
          text: `Profil ${editForm.nama} telah disimpan.`,
          confirmButtonColor: "#2563EB",
          timer: 2000,
          showConfirmButton: false,
        });
        setIsEditing(false);
        // Reset mock-data sync dan refetch
        import("@/lib/mock-data").then((mod: any) => { mod.isSynced = false; });
        queryClient.invalidateQueries({ queryKey: ["siswa-list"] });
        refetch();
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal menyimpan",
          text: json.error || "Terjadi kesalahan server.",
          confirmButtonColor: "#2563EB",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Kesalahan koneksi",
        text: "Tidak dapat terhubung ke server.",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete() {
    const result = await Swal.fire({
      icon: "warning",
      title: "Hapus siswa ini?",
      html: `<span class="text-sm text-gray-600">Data <strong>${siswa?.nama}</strong> dan seluruh riwayat kehadirannya akan dihapus permanen.<br/>Tindakan ini tidak dapat dibatalkan.</span>`,
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#DC2626",
      cancelButtonColor: "#6B7280",
      focusCancel: true,
    });

    if (!result.isConfirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/siswa/${siswaId}`, { method: "DELETE" });
      const json = await res.json();

      if (json.success) {
        await Swal.fire({
          icon: "success",
          title: "Siswa berhasil dihapus",
          text: json.deletedKehadiran > 0
            ? `${json.deletedKehadiran} data kehadiran juga ikut dihapus.`
            : "Data siswa telah dihapus dari sistem.",
          confirmButtonColor: "#2563EB",
          timer: 2500,
          showConfirmButton: false,
        });
        // Invalidate list lalu balik ke halaman siswa
        import("@/lib/mock-data").then((mod: any) => { mod.isSynced = false; });
        queryClient.invalidateQueries({ queryKey: ["siswa-list"] });
        router.push("/guru/siswa");
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal menghapus",
          text: json.error || "Terjadi kesalahan server.",
          confirmButtonColor: "#2563EB",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Kesalahan koneksi",
        text: "Tidak dapat terhubung ke server.",
        confirmButtonColor: "#2563EB",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[280px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl lg:col-span-2" />
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
        <h2 className="text-xl font-bold text-text-primary mb-2">Siswa Tidak Ditemukan</h2>
        <p className="text-sm text-text-secondary mb-6">
          Data siswa dengan ID tersebut tidak tersedia.
        </p>
        <Link href="/guru/siswa">
          <Button className="rounded-xl bg-brand-600 hover:bg-brand-700">
            Kembali ke Data Siswa
          </Button>
        </Link>
      </div>
    );
  }

  const now = new Date();
  const currentMonthRecords = siswa.kehadiran
    .filter((k) => {
      const d = new Date(k.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const latestTrend = siswa.trenBulanan[siswa.trenBulanan.length - 1];

  const activeTaps = siswa.kehadiran.filter((k) => k.status !== "ABSEN" && k.titikTap);
  const halteCount = activeTaps.filter((k) => k.titikTap === "HALTE").length;
  const gerbangCount = activeTaps.filter((k) => k.titikTap === "GERBANG_SEKOLAH").length;
  const percentHalte = activeTaps.length > 0
    ? Math.round((halteCount / activeTaps.length) * 100)
    : 0;

  const totalBobotSiswa = halteCount * 3 + gerbangCount * 1;
  const avgBobotSiswa = activeTaps.length > 0 ? (totalBobotSiswa / activeTaps.length).toFixed(1) : "0";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header: back + title + action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/guru/siswa">
            <Button variant="outline" size="sm" className="rounded-xl border-border-subtle">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Detail Siswa</h1>
            <p className="text-sm text-text-secondary">Profil dan riwayat kehadiran</p>
          </div>
        </div>

        {/* Edit & Delete buttons */}
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={startEdit}
              className="gap-1.5 rounded-lg border-border-subtle text-text-secondary hover:text-brand-600 hover:border-brand-300"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Data
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-1.5 rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
          >
            {isDeleting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />
            }
            {isDeleting ? "Menghapus..." : "Hapus Siswa"}
          </Button>
        </div>
      </div>

      {/* Profile + Trend row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
              {siswa.nama.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>

            {isEditing ? (
              <div className="w-full text-left">
                <EditProfileCard
                  form={editForm}
                  onChange={setEditForm}
                  onSave={handleSaveEdit}
                  onCancel={() => setIsEditing(false)}
                  isSaving={isSaving}
                />
              </div>
            ) : (
              <>
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
                      <p className="text-xs text-text-muted">NISN / NIS</p>
                      <p className="text-sm font-semibold text-text-primary font-mono">
                        {siswa.nfcTagId || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                    <Leaf className="h-4 w-4 text-green-600" />
                    <div className="text-left">
                      <p className="text-xs text-text-muted">Eco-Awareness (Estimasi)</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {percentHalte}% Tap Halte
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                    <Award className="h-4 w-4 text-amber-500" />
                    <div className="text-left">
                      <p className="text-xs text-text-muted">Bobot Presensi Siswa</p>
                      <p className="text-sm font-semibold text-text-primary">
                        Total {totalBobotSiswa} Poin <span className="text-xs font-normal text-text-secondary">(Rata-rata: {avgBobotSiswa}/3)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3-month trend chart */}
        <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Tren Ketepatan Waktu</h3>
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
            <LineChart
              data={siswa.trenBulanan}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
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

      {/* Attendance history table */}
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-text-primary">
            Riwayat Kehadiran Bulan Ini
          </h3>
          <p className="text-sm text-text-secondary">{currentMonthRecords.length} hari tercatat</p>
        </div>

        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Tanggal", "Hari", "Jam Tap", "Status", "Titik Tap", "Estimasi Emisi"].map(
                  (h) => (
                    <th
                      key={h}
                      className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-text-secondary"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {currentMonthRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-text-secondary">
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
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
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
                            ? "Halte • Bobot 3"
                            : "Gerbang Sekolah • Bobot 1"
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
                            {eco.kategori === "RENDAH_EMISI" ? "Rendah Emisi" : "Tinggi Emisi"}
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

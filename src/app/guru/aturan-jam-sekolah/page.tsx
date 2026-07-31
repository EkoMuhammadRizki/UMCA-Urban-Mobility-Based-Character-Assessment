"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Save, Loader2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";

interface AturanJam {
  hari: string;
  jamMasuk: string;
  tenggat: string;
}

const HARI_SEKOLAH = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

const DEFAULT_ATURAN: AturanJam[] = HARI_SEKOLAH.map((hari) => ({
  hari,
  jamMasuk: "07:00",
  tenggat: "07:00",
}));

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/** Parse "HH:mm" → total menit */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function TimeInput({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
}) {
  const [hour, minute] = value.split(":");

  const baseClass =
    "h-9 rounded-lg border bg-white px-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2";
  const normalClass = "border-border-subtle focus:ring-brand-600/20 focus:border-brand-600";
  const errorClass = "border-red-400 focus:ring-red-400/20 focus:border-red-500";

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        className={`${baseClass} ${hasError ? errorClass : normalClass}`}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-sm font-medium text-text-secondary">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        className={`${baseClass} ${hasError ? errorClass : normalClass}`}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Normalise rules from DB: fill missing days with default, preserve order */
function normalizeAturan(raw: AturanJam[]): AturanJam[] {
  return HARI_SEKOLAH.map((hari) => {
    const existing = raw.find((r) => r.hari === hari);
    if (existing) {
      return {
        hari,
        jamMasuk: existing.jamMasuk || "07:00",
        tenggat: existing.tenggat || existing.jamMasuk || "07:00",
      };
    }
    return { hari, jamMasuk: "07:00", tenggat: "07:00" };
  });
}

export default function AturanJamSekolahPage() {
  const [aturan, setAturan] = useState<AturanJam[]>(DEFAULT_ATURAN);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  /** true saat data dari DB belum ada (DB kosong) → user perlu menyimpan sekali */
  const [isFirstTime, setIsFirstTime] = useState(false);
  /** true saat ada perubahan yang belum disimpan */
  const [isDirty, setIsDirty] = useState(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/school/config");
      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error("Gagal memuat aturan jam sekolah dari server.");
        return;
      }

      if (json.data?.aturanJam && Array.isArray(json.data.aturanJam) && json.data.aturanJam.length > 0) {
        setAturan(normalizeAturan(json.data.aturanJam));
        setIsFirstTime(false);
      } else {
        // DB belum punya aturanJam — tampilkan default tapi tandai perlu disimpan
        setAturan(DEFAULT_ATURAN);
        setIsFirstTime(true);
      }
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to load school hours:", err);
      toast.error("Terjadi kesalahan koneksi saat memuat aturan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  function updateRule(index: number, field: keyof AturanJam, value: string) {
    setAturan((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setIsDirty(true);
    setIsFirstTime(false);
  }

  /** Validate: tenggat must be >= jamMasuk for every day */
  function validateAturan(): { valid: boolean; errors: Set<number> } {
    const errors = new Set<number>();
    aturan.forEach((row, i) => {
      if (toMinutes(row.tenggat) < toMinutes(row.jamMasuk)) {
        errors.add(i);
      }
    });
    return { valid: errors.size === 0, errors };
  }

  async function handleSave() {
    const { valid, errors } = validateAturan();
    if (!valid) {
      const hariError = [...errors].map((i) => aturan[i].hari).join(", ");
      toast.error(`Tenggat absensi tidak boleh lebih awal dari jam masuk. Periksa: ${hariError}.`);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Simpan aturan ke DB
      const res = await fetch("/api/school/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aturanJam: aturan }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Gagal menyimpan perubahan.");
        return;
      }

      // 2. Recalculate status kehadiran yang sudah ada berdasarkan aturan baru
      const recalcRes = await fetch("/api/school/config", { method: "PATCH" });
      const recalcJson = await recalcRes.json();

      if (recalcJson.success && recalcJson.updated > 0) {
        toast.success(
          `Aturan jam disimpan. ${recalcJson.updated} data kehadiran diperbarui sesuai aturan baru.`
        );
      } else {
        toast.success("Aturan jam sekolah berhasil disimpan.");
      }

      setIsDirty(false);
      setIsFirstTime(false);
    } catch (err) {
      console.error("Failed to save school hours:", err);
      toast.error("Terjadi kesalahan koneksi saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  const { errors: validationErrors } = validateAturan();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Aturan Jam Sekolah
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Kelola jadwal jam masuk dan tenggat absensi sekolah per hari.
        </p>
      </div>

      {/* Banner: belum pernah dikonfigurasi */}
      {!isLoading && isFirstTime && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Aturan jam belum dikonfigurasi</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Sistem belum memiliki aturan jam tersimpan. Sesuaikan jam masuk dan tenggat absensi
              untuk setiap hari, lalu klik <strong>Simpan Perubahan</strong> agar berlaku aktif.
            </p>
          </div>
        </div>
      )}

      {/* Banner: ada perubahan belum disimpan */}
      {!isLoading && isDirty && !isFirstTime && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <p className="text-sm text-blue-800">
            Ada perubahan yang belum disimpan. Klik <strong>Simpan Perubahan</strong> untuk menerapkannya.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            Jam Absensi Kehadiran
          </CardTitle>
          <CardDescription>
            Atur batas waktu jam masuk dan tenggat absensi bagi siswa per hari. Absensi yang
            dilakukan setelah tenggat absensi akan dianggap{" "}
            <span className="font-medium text-red-600">Telat</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="text-sm text-text-secondary">Memuat data aturan jam...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Hari</TableHead>
                  <TableHead>
                    Jam Masuk
                    <span className="block text-xs font-normal text-text-tertiary mt-0.5">
                      Waktu resmi masuk sekolah
                    </span>
                  </TableHead>
                  <TableHead>
                    Tenggat Absensi
                    <span className="block text-xs font-normal text-text-tertiary mt-0.5">
                      Batas akhir tap — lewat ini dianggap telat
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aturan.map((row, i) => {
                  const hasTenggatError = validationErrors.has(i);
                  return (
                    <TableRow key={row.hari}>
                      <TableCell className="font-medium">{row.hari}</TableCell>
                      <TableCell>
                        <TimeInput
                          value={row.jamMasuk}
                          onChange={(val) => updateRule(i, "jamMasuk", val)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <TimeInput
                            value={row.tenggat}
                            onChange={(val) => updateRule(i, "tenggat", val)}
                            hasError={hasTenggatError}
                          />
                          {hasTenggatError && (
                            <p className="text-xs text-red-500">
                              Tenggat tidak boleh lebih awal dari jam masuk
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          Perubahan berlaku pada absensi NFC tap berikutnya secara real-time.
        </p>
        <Button
          onClick={handleSave}
          disabled={isLoading || isSaving || validationErrors.size > 0}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}

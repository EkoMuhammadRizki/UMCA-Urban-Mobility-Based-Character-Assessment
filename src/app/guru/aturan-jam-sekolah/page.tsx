"use client";

import { useState, useEffect } from "react";
import { Clock, Save, Loader2 } from "lucide-react";
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

const DEFAULT_ATURAN: AturanJam[] = [
  { hari: "Senin", jamMasuk: "07:00", tenggat: "07:00" },
  { hari: "Selasa", jamMasuk: "07:00", tenggat: "07:00" },
  { hari: "Rabu", jamMasuk: "07:00", tenggat: "07:00" },
  { hari: "Kamis", jamMasuk: "07:00", tenggat: "07:00" },
  { hari: "Jumat", jamMasuk: "07:00", tenggat: "07:00" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [hour, minute] = value.split(":");

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-sm font-medium text-text-secondary">:</span>
      <select
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

export default function AturanJamSekolahPage() {
  const [aturan, setAturan] = useState<AturanJam[]>(DEFAULT_ATURAN);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/school/config");
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.aturanJam && Array.isArray(json.data.aturanJam)) {
            // Map data from database to fit rules (hari, jamMasuk & tenggat)
            const mapped = json.data.aturanJam.map((r: any) => ({
              hari: r.hari,
              jamMasuk: r.jamMasuk || "07:00",
              tenggat: r.tenggat || r.jamMasuk || "07:00"
            }));
            setAturan(mapped);
          }
        } else {
          toast.error("Gagal memuat aturan jam sekolah dari server.");
        }
      } catch (err) {
        console.error("Failed to load school hours:", err);
        toast.error("Terjadi kesalahan koneksi saat memuat aturan.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, []);

  function updateRule(index: number, field: keyof AturanJam, value: string) {
    setAturan((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/school/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aturanJam: aturan })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Aturan jam sekolah berhasil disimpan.");
      } else {
        toast.error(json.error || "Gagal menyimpan perubahan.");
      }
    } catch (err) {
      console.error("Failed to save school hours:", err);
      toast.error("Terjadi kesalahan koneksi saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  }

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-600" />
            Jam Absensi Kehadiran
          </CardTitle>
          <CardDescription>
            Atur batas waktu jam masuk dan tenggat absensi bagi siswa per hari. Absensi yang dilakukan setelah tenggat absensi akan dianggap telat.
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
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Tenggat Absensi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aturan.map((row, i) => (
                  <TableRow key={row.hari}>
                    <TableCell className="font-medium">{row.hari}</TableCell>
                    <TableCell>
                      <TimeInput
                        value={row.jamMasuk}
                        onChange={(val) => updateRule(i, "jamMasuk", val)}
                      />
                    </TableCell>
                    <TableCell>
                      <TimeInput
                        value={row.tenggat}
                        onChange={(val) => updateRule(i, "tenggat", val)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading || isSaving} className="gap-2">
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

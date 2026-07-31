"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState, useMemo, useCallback } from "react";
import {
  Users, Search, UserPlus, Upload, Download, FileSpreadsheet,
  Loader2, AlertTriangle, CheckCircle2, X,
} from "lucide-react";
import { getSiswaList } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  exportSiswaToExcel,
  downloadTemplateSiswa,
  parseSiswaFromExcel,
  type SiswaRow,
} from "@/lib/utils/export-utils";

// ─── Types ────────────────────────────────────────────────────
type ModalState = "none" | "tambah" | "import-preview";

interface TambahForm {
  nama: string;
  nisn: string;
  kelas: string;
}

const EMPTY_FORM: TambahForm = { nama: "", nisn: "", kelas: "" };

// ─── Helper ───────────────────────────────────────────────────
function getInitials(nama: string) {
  return nama
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────

/** Dialog: Tambah Siswa Baru */
function TambahSiswaDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<TambahForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<TambahForm>>({});

  function validate(): boolean {
    const errs: Partial<TambahForm> = {};
    if (!form.nama.trim()) errs.nama = "Nama wajib diisi.";
    if (!form.kelas.trim()) errs.kelas = "Kelas wajib diisi.";
    if (form.nisn && form.nisn.trim().length > 20)
      errs.nisn = "Maksimal 20 karakter.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Siswa berhasil ditambahkan.");
        setForm(EMPTY_FORM);
        onSuccess();
      } else {
        toast.error(json.error || "Gagal menyimpan siswa.");
      }
    } catch {
      toast.error("Terjadi kesalahan koneksi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    onClose();
  }

  const inputClass = (err?: string) =>
    `w-full rounded-lg border ${err ? "border-red-400 focus:ring-red-400/20 focus:border-red-500" : "border-border-subtle focus:ring-brand-600/20 focus:border-brand-600"} bg-white px-3 py-2 text-sm text-text-primary shadow-sm focus:outline-none focus:ring-2`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
              <UserPlus className="h-4 w-4 text-brand-600" />
            </div>
            Tambah Data Siswa
          </DialogTitle>
          <p className="text-sm text-text-secondary">
            Isi data siswa baru. NISN/NIS bersifat opsional.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Nama */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Budi Santoso"
              value={form.nama}
              onChange={(e) => {
                setForm((f) => ({ ...f, nama: e.target.value }));
                setFieldErrors((fe) => ({ ...fe, nama: undefined }));
              }}
              className={inputClass(fieldErrors.nama)}
            />
            {fieldErrors.nama && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.nama}</p>
            )}
          </div>

          {/* NISN */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              NISN / NIS
              <span className="ml-1 text-xs font-normal text-text-muted">(opsional, maks. 20 karakter)</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 0123456789 atau 23E07929"
              maxLength={20}
              value={form.nisn}
              onChange={(e) => {
                setForm((f) => ({ ...f, nisn: e.target.value.slice(0, 20) }));
                setFieldErrors((fe) => ({ ...fe, nisn: undefined }));
              }}
              className={inputClass(fieldErrors.nisn)}
            />
            <p className="mt-1 text-xs text-text-muted">
              {form.nisn.length}/20 karakter
            </p>
            {fieldErrors.nisn && (
              <p className="mt-0.5 text-xs text-red-500">{fieldErrors.nisn}</p>
            )}
          </div>

          {/* Kelas */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">
              Kelas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 4A"
              value={form.kelas}
              onChange={(e) => {
                setForm((f) => ({ ...f, kelas: e.target.value }));
                setFieldErrors((fe) => ({ ...fe, kelas: undefined }));
              }}
              className={inputClass(fieldErrors.kelas)}
            />
            {fieldErrors.kelas && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.kelas}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {isSaving ? "Menyimpan..." : "Simpan Siswa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog: Preview Import Excel */
function ImportPreviewDialog({
  open,
  rows,
  parseErrors,
  onClose,
  onConfirm,
}: {
  open: boolean;
  rows: SiswaRow[];
  parseErrors: string[];
  onClose: () => void;
  onConfirm: (rows: SiswaRow[]) => Promise<void>;
}) {
  const [isImporting, setIsImporting] = useState(false);

  async function handleConfirm() {
    setIsImporting(true);
    await onConfirm(rows);
    setIsImporting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isImporting && onClose()}>
      <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            </div>
            Preview Import Excel
          </DialogTitle>
          <p className="text-sm text-text-secondary">
            Periksa data sebelum disimpan ke sistem.
          </p>
        </DialogHeader>

        {/* Error baris */}
        {parseErrors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {parseErrors.length} baris dilewati karena tidak valid:
                </p>
                <ul className="mt-1 list-disc pl-4 space-y-0.5">
                  {parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs text-amber-700">{e}</li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li className="text-xs text-amber-700">... dan {parseErrors.length - 5} lainnya</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <X className="h-10 w-10 text-text-muted mb-2" />
            <p className="text-sm text-text-secondary">Tidak ada data valid untuk diimport.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{rows.length} siswa</span> siap diimport.
            </p>
            <div className="max-h-64 overflow-auto rounded-lg border border-border-subtle">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary w-8">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Nama</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">NISN/NIS</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                      <td className="px-3 py-2 text-text-primary font-medium">{r.nama}</td>
                      <td className="px-3 py-2 text-text-secondary font-mono">{r.nisn || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{r.kelas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Batal
          </Button>
          {rows.length > 0 && (
            <Button
              onClick={handleConfirm}
              disabled={isImporting}
              className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
            >
              {isImporting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Mengimport...</>
                : <><CheckCircle2 className="h-4 w-4" /> Import {rows.length} Siswa</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SiswaListPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>("none");
  const [importRows, setImportRows] = useState<SiswaRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const { data: siswaList, isLoading } = useQuery({
    queryKey: ["siswa-list"],
    queryFn: () => getSiswaList(),
  });

  const filteredSiswa = useMemo(() => {
    if (!siswaList) return [];
    if (!search) return siswaList;
    const q = search.toLowerCase();
    return siswaList.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q)
    );
  }, [siswaList, search]);

  // Invalidate siswa cache so mock-data syncs fresh from DB
  const refreshSiswa = useCallback(() => {
    // Reset the isSynced flag in mock-data by invalidating the query
    queryClient.invalidateQueries({ queryKey: ["siswa-list"] });
    // Also reset the module-level sync flag
    import("@/lib/mock-data").then((mod) => {
      (mod as any).isSynced = false;
    });
  }, [queryClient]);

  // ── Export Data Siswa ──
  function handleExport() {
    if (!siswaList || siswaList.length === 0) {
      toast.warning("Belum ada data siswa untuk diekspor.");
      return;
    }
    exportSiswaToExcel(
      siswaList.map((s) => ({ nama: s.nama, nisn: s.nfcTagId, kelas: s.kelas })),
      "UMCA"
    );
    toast.success("Data siswa berhasil diekspor.");
  }

  // ── Download Template ──
  function handleDownloadTemplate() {
    downloadTemplateSiswa();
    toast.success("Template berhasil diunduh.");
  }

  // ── Pilih File Import ──
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input agar file yang sama bisa dipilih ulang
    e.target.value = "";

    setIsParsingFile(true);
    try {
      const { data, errors } = await parseSiswaFromExcel(file);
      setImportRows(data);
      setImportErrors(errors);
      setModal("import-preview");
    } catch {
      toast.error("Gagal membaca file Excel.");
    } finally {
      setIsParsingFile(false);
    }
  }

  // ── Confirm Import ──
  async function handleConfirmImport(rows: SiswaRow[]) {
    try {
      const res = await fetch("/api/siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siswaList: rows }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`${json.count} siswa berhasil diimport.`);
        setModal("none");
        refreshSiswa();
      } else {
        const detail = json.details?.slice(0, 3).join(", ");
        toast.error(json.error + (detail ? `: ${detail}` : ""));
      }
    } catch {
      toast.error("Terjadi kesalahan koneksi saat mengimport.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Data Siswa</h1>
          <p className="text-sm text-text-secondary mt-1">
            Daftar siswa yang terdaftar dalam sistem UMCA.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-1.5 rounded-lg border-border-subtle text-text-secondary hover:text-text-primary"
          >
            <Download className="h-3.5 w-3.5" />
            Template
          </Button>

          {/* Export Data Siswa */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5 rounded-lg border-border-subtle text-text-secondary hover:text-text-primary"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Siswa
          </Button>

          {/* Import Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingFile}
            className="gap-1.5 rounded-lg border-border-subtle text-text-secondary hover:text-text-primary"
          >
            {isParsingFile
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />
            }
            Import Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Tambah Data Siswa */}
          <Button
            size="sm"
            onClick={() => setModal("tambah")}
            className="gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Cari nama atau kelas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border-subtle bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
        />
      </div>

      {/* Count */}
      {!isLoading && siswaList && (
        <p className="text-sm text-text-secondary">
          Menampilkan{" "}
          <span className="font-semibold text-text-primary">{filteredSiswa.length}</span>
          {search && ` dari ${siswaList.length}`} siswa
        </p>
      )}

      {/* Student grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSiswa.map((siswa) => (
            <Link
              key={siswa.id}
              href={`/guru/siswa/${siswa.id}`}
              className="group rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-brand-100"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  {getInitials(siswa.nama)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-600 transition-colors truncate">
                    {siswa.nama}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">Kelas {siswa.kelas}</p>
                  <p className="text-[11px] text-text-muted mt-1 font-mono truncate">
                    {siswa.nfcTagId}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {filteredSiswa.length === 0 && !isLoading && (
            <div className="col-span-full py-16 text-center">
              <Users className="mx-auto h-12 w-12 text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-secondary">
                {search
                  ? `Tidak ada siswa dengan nama atau kelas "${search}"`
                  : "Belum ada siswa. Tambahkan siswa baru atau import dari Excel."}
              </p>
              {!search && (
                <Button
                  size="sm"
                  onClick={() => setModal("tambah")}
                  className="mt-4 gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Tambah Siswa Pertama
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <TambahSiswaDialog
        open={modal === "tambah"}
        onClose={() => setModal("none")}
        onSuccess={() => {
          setModal("none");
          refreshSiswa();
        }}
      />

      <ImportPreviewDialog
        open={modal === "import-preview"}
        rows={importRows}
        parseErrors={importErrors}
        onClose={() => setModal("none")}
        onConfirm={handleConfirmImport}
      />
    </div>
  );
}

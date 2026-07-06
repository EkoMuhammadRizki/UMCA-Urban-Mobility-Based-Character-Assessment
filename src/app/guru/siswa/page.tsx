"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { SISWA_LIST } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";

export default function SiswaListPage() {
  const [search, setSearch] = useState("");

  const { data: siswaList, isLoading } = useQuery({
    queryKey: ["siswa-list"],
    queryFn: () => SISWA_LIST,
  });

  const filteredSiswa = useMemo(() => {
    if (!siswaList) return [];
    if (!search) return siswaList;
    return siswaList.filter((s) =>
      s.nama.toLowerCase().includes(search.toLowerCase())
    );
  }, [siswaList, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Data Siswa
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Daftar siswa yang terdaftar dalam sistem UMCA.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Cari siswa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border-subtle bg-white py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600"
        />
      </div>

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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  {siswa.nama
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-600 transition-colors truncate">
                    {siswa.nama}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Kelas {siswa.kelas}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1 font-mono">
                    {siswa.nfcTagId}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {filteredSiswa.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">
                Tidak ditemukan siswa dengan nama &ldquo;{search}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

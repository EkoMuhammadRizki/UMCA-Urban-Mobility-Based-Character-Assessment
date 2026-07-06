"use client";

import { Bell, School } from "lucide-react";

interface TopbarProps {
  sekolahNama?: string;
  guruNama?: string;
}

export function Topbar({
  sekolahNama = "SDN 1 Kota Jakarta",
  guruNama = "Bu Ratna Dewi",
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-white px-8">
      {/* Left: School chip + status chip */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm">
          <School className="h-4 w-4 text-brand-600" />
          <span className="font-medium text-text-primary">{sekolahNama}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-medium text-green-700">Sistem Aktif</span>
        </div>
      </div>

      {/* Right: Notification + Profile */}
      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="relative rounded-lg p-2 text-text-secondary hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <div>
            <p className="text-sm font-semibold text-text-primary text-right">{guruNama}</p>
            <p className="text-xs text-text-secondary text-right">Wali Kelas 4A</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
            {guruNama
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

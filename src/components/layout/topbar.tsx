"use client";

import { useState, useEffect } from "react";

import { School, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

interface TopbarProps {
  sekolahNama?: string;
  guruNama?: string;
}

export function Topbar({
  sekolahNama = "SDI AL-Irsyadiah",
  guruNama = "UMCA",
}: TopbarProps) {
  const router = useRouter();
  const [nama, setNama] = useState(guruNama);
  const [role, setRole] = useState("User UMCA");

  useEffect(() => {
    const storedNama = localStorage.getItem("user_nama");
    const storedRole = localStorage.getItem("user_role");
    if (storedNama) setNama(storedNama);
    if (storedRole) setRole(storedRole);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    Swal.fire({
      title: "Apakah kamu yakin ingin keluar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
      background: "#0D1B33",
      color: "#FFFFFF",
      iconColor: "#3B82F6",
      customClass: {
        popup: "rounded-2xl border border-white/10 shadow-2xl",
      }
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("user_nama");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_email");
        router.push("/login");
      }
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border-subtle bg-white px-4 md:px-8">
      {/* Left: School chip + status chip */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 md:gap-2 rounded-full bg-slate-100 px-3 py-1 md:px-4 md:py-1.5 text-xs md:text-sm max-w-[170px] sm:max-w-none">
          <School className="h-3.5 w-3.5 md:h-4 md:w-4 text-brand-600 flex-shrink-0" />
          <span className="font-medium text-text-primary truncate">{sekolahNama}</span>
        </div>

      </div>

      {/* Right: Profile + Logout (Mobile) */}
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">

        {/* Profile */}
        <div className="flex items-center gap-2 md:gap-3 border-l border-border-subtle pl-2 md:pl-4">
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-text-primary text-right">{nama}</p>
            <p className="text-xs text-text-secondary text-right">{role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
            {nama
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        </div>

        {/* Logout Button (Visible only on mobile/tablet where sidebar is hidden) */}
        <button
          onClick={handleLogout}
          className="md:hidden flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-colors cursor-pointer"
          title="Keluar"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

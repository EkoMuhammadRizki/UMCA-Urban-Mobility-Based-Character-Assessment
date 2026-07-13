"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings,
  Wifi,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/guru/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Rekap Kehadiran",
    href: "/guru/rekap-kehadiran",
    icon: CalendarCheck,
  },
  {
    label: "Data Siswa",
    href: "/guru/siswa",
    icon: Users,
  },
  {
    label: "Pengaturan",
    href: "/guru/pengaturan",
    icon: Settings,
  },
];

interface SidebarProps {
  guruNama?: string;
  guruRole?: string;
}

export function Sidebar({ guruNama = "Bu Ratna Dewi", guruRole = "Wali Kelas 4A" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [nama, setNama] = useState(guruNama);
  const [role, setRole] = useState(guruRole);

  // Poll status pembaca NFC aktif setiap 5 detik
  const { data: readerStatus } = useQuery({
    queryKey: ["nfc-reader-status"],
    queryFn: async () => {
      const res = await fetch("/api/reader/status");
      if (!res.ok) return { active: false };
      return res.json();
    },
    refetchInterval: 5000, // polling tiap 5 detik
  });

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
        router.push("/login");
      }
    });
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-[260px] flex-col bg-navy-950">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
          <img src="/logo/Logo UMCA.png" alt="UMCA Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">UMCA</h1>
          <p className="text-[10px] text-text-muted leading-tight mt-0.5 max-w-[160px]">Urban Mobility-Based Character Assessment</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/guru/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* NFC Status */}
      <div className="mx-4 mb-4 rounded-xl bg-white/5 px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {readerStatus?.active ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
              )}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {readerStatus?.active ? "NFC Reader Aktif" : "NFC Reader Offline"}
            </span>
          </div>
          {readerStatus?.active && readerStatus?.lokasiLabel && (
            <p className="text-[10px] text-slate-400 pl-4 truncate">
              {readerStatus.lokasiLabel}
            </p>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
            {nama
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{nama}</p>
            <p className="text-xs text-text-muted truncate">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Settings,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/guru/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Rekap",
    href: "/guru/rekap-kehadiran",
    icon: CalendarCheck,
  },
  {
    label: "Siswa",
    href: "/guru/siswa",
    icon: Users,
  },
  {
    label: "Pengaturan",
    href: "/guru/pengaturan",
    icon: Settings,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-navy-950 px-4 py-2 pb-5 md:hidden shadow-2xl">
      <nav className="flex justify-around items-center">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/guru/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all duration-200 ${
                isActive
                  ? "text-brand-500 font-semibold scale-105"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

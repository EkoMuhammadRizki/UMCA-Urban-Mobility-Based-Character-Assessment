"use client";

import { useQuery } from "@tanstack/react-query";
import { Battery, Wifi, WifiOff } from "lucide-react";

export function NfcReaderStatusCard({ className = "" }: { className?: string }) {
  const { data: readerStatus } = useQuery({
    queryKey: ["nfc-reader-status"],
    queryFn: async () => {
      const res = await fetch("/api/reader/status");
      if (!res.ok) return { active: false, readers: [] };
      return res.json();
    },
    refetchInterval: 5000,
  });

  const isActive = readerStatus?.active;
  const readers = readerStatus?.readers || [];

  return (
    <div
      className={`rounded-2xl border border-slate-800/80 bg-[#0c182c] p-4 text-white shadow-md relative overflow-hidden ${className}`}
    >
      {/* Header status */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {isActive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
            )}
          </span>
          <span className="text-sm font-semibold text-white">
            {isActive ? "NFC Reader Aktif" : "NFC Reader Offline"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
          {isActive ? (
            <>
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span>{readers.length} Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-slate-400" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Reader list */}
      <div className="pt-2 divide-y divide-white/5">
        {isActive && readers.length > 0 ? (
          readers.map((reader: any) => {
            const pct = reader.batteryPct;
            const voltage = reader.batteryVoltage;
            const color =
              pct == null
                ? "text-slate-400"
                : pct > 50
                ? "text-emerald-400"
                : pct > 20
                ? "text-amber-400"
                : "text-rose-400";

            const bgBadge =
              pct == null
                ? "bg-slate-800"
                : pct > 50
                ? "bg-emerald-500/10 border-emerald-500/20"
                : pct > 20
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-rose-500/10 border-rose-500/20";

            return (
              <div
                key={reader.deviceId}
                className="py-2.5 flex items-center justify-between gap-3 first:pt-2 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {reader.lokasiLabel || reader.deviceId}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {reader.deviceId}
                  </p>
                </div>

                {pct != null ? (
                  <div
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${bgBadge}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Battery className={`h-4 w-4 ${color}`} />
                      <span className={`text-xs font-semibold ${color}`}>
                        Baterai {pct}%
                      </span>
                    </div>
                    {voltage != null && (
                      <span className="text-[11px] text-slate-300 font-medium border-l border-white/10 pl-2">
                        {voltage.toFixed(2)}V
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">Siap</span>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-2.5 text-center">
            <p className="text-xs text-slate-400">
              {isActive
                ? "Menunggu data perangkat..."
                : "Tidak ada perangkat NFC Reader yang aktif saat ini."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

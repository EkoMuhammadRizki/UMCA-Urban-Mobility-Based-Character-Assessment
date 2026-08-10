"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { StatusKehadiran, TitikTap } from "@/lib/types";
import { formatTime } from "@/lib/utils/date-utils";

const DASHBOARD_QUERY_KEYS = ["recent-activities", "dashboard-summary", "eco-summary"];

interface KehadiranPayload {
  id: string;
  siswaId: string;
  tanggal: string;
  jamTap: string | null;
  status: StatusKehadiran;
  modaTransport?: string | null;
  titikTap?: TitikTap | null;
}

function getTitikTapLabel(titikTap?: TitikTap | null): string {
  return titikTap === TitikTap.HALTE ? "Halte (Bobot: 3)" : "Gerbang (Bobot: 1)";
}

export function useLiveAttendance() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("attendance-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Kehadiran" },
        async (payload) => {
          DASHBOARD_QUERY_KEYS.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });

          const record = payload.new as KehadiranPayload;

          try {
            const { data: siswa } = await supabase
              .from("Siswa")
              .select("nama, kelas")
              .eq("id", record.siswaId)
              .maybeSingle();

            const nama = siswa?.nama ?? "Siswa";
            const kelas = siswa?.kelas ?? "—";
            const jam = record.jamTap ? formatTime(record.jamTap) : "—";
            const lokasi = getTitikTapLabel(record.titikTap);
            const statusLabel =
              record.status === StatusKehadiran.TEPAT_WAKTU ? "Tepat Waktu" : "Telat";

            const description = `Tap di ${lokasi} • ${jam} • ${statusLabel}`;

            if (record.status === StatusKehadiran.TEPAT_WAKTU) {
              toast.success(`${nama} · ${kelas}`, { description });
            } else {
              toast.warning(`${nama} · ${kelas}`, { description });
            }
          } catch (err) {
            console.error("useLiveAttendance: gagal menampilkan notifikasi tap:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

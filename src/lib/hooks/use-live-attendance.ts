"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const DASHBOARD_QUERY_KEYS = ["recent-activities", "dashboard-summary", "eco-summary"];

export function useLiveAttendance() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("attendance-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Kehadiran" },
        () => {
          DASHBOARD_QUERY_KEYS.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

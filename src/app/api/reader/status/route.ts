import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { data: readers, error } = await supabase
      .from("NfcReader")
      .select("*")
      .eq("isActive", true)
      .order("deviceId", { ascending: true });

    if (error) {
      console.error("Status check error:", error);
      return NextResponse.json({ success: false, active: false, error: error.message }, { status: 500 });
    }

    if (!readers || readers.length === 0) {
      return NextResponse.json({ success: true, active: false, readers: [], message: "No active readers registered." });
    }

    const now = Date.now();
    // Heartbeat firmware tiap 30 detik → toleransi 45 detik (1.5x interval)
    // agar perangkat tidak bergantian online/offline
    const TIMEOUT_MS = 45000;

    // Kumpulkan semua reader yang baru saja melakukan ping
    const onlineReaders = readers.filter(r => {
      if (!r.lastSeenAt) return false;
      const lastSeenTime = new Date(r.lastSeenAt).getTime();
      return Math.abs(now - lastSeenTime) < TIMEOUT_MS;
    });

    if (onlineReaders.length > 0) {
      return NextResponse.json({
        success: true,
        active: true,
        readers: onlineReaders.map(r => ({
          deviceId: r.deviceId,
          lokasiLabel: r.lokasiLabel,
          lastSeenAt: r.lastSeenAt,
          batteryPct: r.batteryPct ?? null,
          batteryVoltage: r.batteryVoltage ?? null
        }))
      });
    }

    return NextResponse.json({ success: true, active: false, readers: [] });
  } catch (err: any) {
    console.error("Status check route error:", err);
    return NextResponse.json({ success: false, active: false, error: err.message }, { status: 500 });
  }
}

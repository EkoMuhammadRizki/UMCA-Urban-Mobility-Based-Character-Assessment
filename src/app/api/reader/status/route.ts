import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { data: readers, error } = await supabase
      .from("NfcReader")
      .select("*")
      .eq("isActive", true);

    if (error) {
      console.error("Status check error:", error);
      return NextResponse.json({ success: false, active: false, error: error.message }, { status: 500 });
    }

    if (!readers || readers.length === 0) {
      return NextResponse.json({ success: true, active: false, message: "No active readers registered." });
    }

    const now = Date.now();
    const TIMEOUT_MS = 12000; // 12 detik batas toleransi status online

    // Cari jika ada reader yang baru saja melakukan ping
    const activeReader = readers.find(r => {
      if (!r.lastSeenAt) return false;
      const lastSeenTime = new Date(r.lastSeenAt).getTime();
      return Math.abs(now - lastSeenTime) < TIMEOUT_MS;
    });

    if (activeReader) {
      return NextResponse.json({
        success: true,
        active: true,
        lokasiLabel: activeReader.lokasiLabel,
        deviceId: activeReader.deviceId,
        lastSeenAt: activeReader.lastSeenAt
      });
    }

    return NextResponse.json({ success: true, active: false });
  } catch (err: any) {
    console.error("Status check route error:", err);
    return NextResponse.json({ success: false, active: false, error: err.message }, { status: 500 });
  }
}

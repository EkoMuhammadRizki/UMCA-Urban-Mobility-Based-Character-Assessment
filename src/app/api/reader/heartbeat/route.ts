import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const deviceSecret = req.headers.get("x-device-secret");
    if (!deviceSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Missing secret header." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { deviceId, connected } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Missing deviceId in body." },
        { status: 400 }
      );
    }

    // 1. Cari NfcReader di database
    const { data: reader, error: fetchErr } = await supabase
      .from("NfcReader")
      .select("*")
      .eq("deviceId", deviceId)
      .maybeSingle();

    if (fetchErr) {
      console.error("Heartbeat error fetching reader:", fetchErr);
      return NextResponse.json({ success: false, error: "Database error." }, { status: 500 });
    }

    if (!reader) {
      return NextResponse.json({ success: false, error: "Device not registered." }, { status: 404 });
    }

    // 2. Validasi secretKey
    if (reader.secretKey !== deviceSecret) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    // 3. Update lastSeenAt
    const lastSeen = connected ? new Date().toISOString() : null;

    const { error: updateErr } = await supabase
      .from("NfcReader")
      .update({ lastSeenAt: lastSeen })
      .eq("id", reader.id);

    if (updateErr) {
      console.error("Heartbeat error updating lastSeenAt:", updateErr);
      return NextResponse.json({ success: false, error: "Failed to update status." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Heartbeat logged successfully." });
  } catch (error: any) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}

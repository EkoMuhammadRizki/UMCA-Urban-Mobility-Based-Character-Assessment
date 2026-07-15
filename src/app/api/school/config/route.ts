import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("Sekolah")
      .select("id, nama, jamMasuk, aturanJam")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching school config:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET school config catch block:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { aturanJam } = await req.json();
    if (!aturanJam || !Array.isArray(aturanJam)) {
      return NextResponse.json(
        { success: false, error: "Data aturanJam tidak valid." },
        { status: 400 }
      );
    }

    // Ambil sekolah pertama
    const { data: sekolah, error: getError } = await supabase
      .from("Sekolah")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (getError || !sekolah) {
      console.error("Error finding school for update:", getError);
      return NextResponse.json(
        { success: false, error: "Sekolah tidak ditemukan." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("Sekolah")
      .update({
        aturanJam,
        updatedAt: new Date().toISOString()
      })
      .eq("id", sekolah.id);

    if (updateError) {
      console.error("Error updating school config:", updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Aturan jam sekolah berhasil disimpan."
    });
  } catch (err: any) {
    console.error("POST school config catch block:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

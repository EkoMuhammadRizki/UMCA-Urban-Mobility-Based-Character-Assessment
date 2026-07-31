import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type RouteContext = { params: Promise<{ id: string }> };

// ─── PATCH /api/siswa/[id] — Edit data siswa ──────────────────
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nama, nisn, kelas } = body;

    if (!nama?.trim()) {
      return NextResponse.json({ success: false, error: "Nama wajib diisi." }, { status: 400 });
    }
    if (!kelas?.trim()) {
      return NextResponse.json({ success: false, error: "Kelas wajib diisi." }, { status: 400 });
    }
    if (nisn && nisn.toString().trim().length > 20) {
      return NextResponse.json(
        { success: false, error: "NISN/NIS maksimal 20 karakter." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("Siswa")
      .update({
        nama: nama.trim(),
        kelas: kelas.trim(),
        nfcTagId: nisn?.toString().trim() || "",
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("PATCH /api/siswa/[id] error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Data siswa berhasil diperbarui.", data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/siswa/[id] — Hapus siswa ─────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Cek apakah siswa punya data kehadiran
    const { count, error: countError } = await supabase
      .from("Kehadiran")
      .select("id", { count: "exact", head: true })
      .eq("siswaId", id);

    if (countError) {
      return NextResponse.json({ success: false, error: countError.message }, { status: 500 });
    }

    // Hapus kehadiran terkait dulu (cascade manual)
    if (count && count > 0) {
      const { error: deleteKehadiran } = await supabase
        .from("Kehadiran")
        .delete()
        .eq("siswaId", id);

      if (deleteKehadiran) {
        return NextResponse.json(
          { success: false, error: "Gagal menghapus data kehadiran terkait." },
          { status: 500 }
        );
      }
    }

    const { error } = await supabase.from("Siswa").delete().eq("id", id);

    if (error) {
      console.error("DELETE /api/siswa/[id] error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Siswa berhasil dihapus.",
      deletedKehadiran: count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

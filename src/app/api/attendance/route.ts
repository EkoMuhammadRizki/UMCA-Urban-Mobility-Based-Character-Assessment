import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * DELETE /api/attendance
 * Menghapus data kehadiran dari database Supabase
 *
 * Query params atau Body JSON:
 * - scope: "all" | "month" | "siswa" (default: "all")
 * - month: number (0-11, opsional untuk scope "month")
 * - year: number (misal: 2026, opsional untuk scope "month")
 * - siswaId: string (opsional untuk scope "siswa")
 */
export async function DELETE(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Fallback jika tidak mengirimkan JSON body
    }

    const searchParams = req.nextUrl.searchParams;
    const scope = body.scope || searchParams.get("scope") || "all";
    const monthRaw = body.month !== undefined ? body.month : searchParams.get("month");
    const yearRaw = body.year !== undefined ? body.year : searchParams.get("year");
    const siswaId = body.siswaId || searchParams.get("siswaId");

    let query = supabase.from("Kehadiran").delete();

    if (scope === "month" && monthRaw !== null && monthRaw !== undefined && yearRaw !== null && yearRaw !== undefined) {
      const month = Number(monthRaw);
      const year = Number(yearRaw);
      const startMonth = String(month + 1).padStart(2, "0");
      const startDate = `${year}-${startMonth}-01`;
      // Hari terakhir dalam bulan tersebut
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${startMonth}-${String(lastDay).padStart(2, "0")}`;

      query = query.gte("tanggal", startDate).lte("tanggal", endDate);
    } else if (scope === "siswa" && siswaId) {
      query = query.eq("siswaId", siswaId);
    } else {
      // Scope "all" -> hapus semua data (ekivalen TRUNCATE TABLE "Kehadiran")
      // Filter gte tanggal mencakup semua record tanggal yang valid
      query = query.gte("tanggal", "1970-01-01");
    }

    const { error, count } = await query;

    if (error) {
      console.error("Error deleting attendance from Supabase:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Gagal menghapus data kehadiran dari database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        scope === "all"
          ? "Semua data riwayat kehadiran berhasil dihapus (Reset Total)."
          : scope === "month"
          ? "Data kehadiran untuk bulan yang dipilih berhasil dihapus."
          : "Data kehadiran berhasil dihapus.",
      count,
    });
  } catch (err: any) {
    console.error("DELETE /api/attendance error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Terjadi kesalahan server saat menghapus kehadiran." },
      { status: 500 }
    );
  }
}

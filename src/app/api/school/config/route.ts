import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateAttendanceStatus } from "@/lib/utils/attendance-utils";

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

/**
 * PATCH /api/school/config
 * Recalculate dan update status kehadiran existing records yang mungkin salah
 * akibat perubahan aturan jam. Hanya memproses records bulan berjalan.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Opsional: batasi ke tanggal tertentu. Default: bulan berjalan.
    const { tanggalMulai, tanggalAkhir } = body;

    // Ambil konfigurasi sekolah beserta aturanJam
    const { data: sekolah, error: sekolahError } = await supabase
      .from("Sekolah")
      .select("id, jamMasuk, aturanJam")
      .limit(1)
      .maybeSingle();

    if (sekolahError || !sekolah) {
      return NextResponse.json(
        { success: false, error: "Sekolah tidak ditemukan." },
        { status: 404 }
      );
    }

    const aturanJam: any[] = Array.isArray(sekolah.aturanJam) ? sekolah.aturanJam : [];
    const DAYS_INDONESIAN = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

    // Tentukan range tanggal (default: bulan ini)
    const now = new Date();
    const defaultMulai = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const defaultAkhir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const mulai = tanggalMulai || defaultMulai;
    const akhir = tanggalAkhir || defaultAkhir;

    // Ambil semua kehadiran dalam range (hanya yang ada jamTap — bukan ABSEN)
    const { data: records, error: recordsError } = await supabase
      .from("Kehadiran")
      .select("id, tanggal, jamTap, status, siswaId, Siswa(kelas)")
      .gte("tanggal", mulai)
      .lte("tanggal", akhir)
      .not("jamTap", "is", null);

    if (recordsError) {
      console.error("Error fetching kehadiran for recalculate:", recordsError);
      return NextResponse.json({ success: false, error: recordsError.message }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada data kehadiran untuk diperbarui.",
        updated: 0,
      });
    }

    let updatedCount = 0;
    const updatePromises: Promise<any>[] = [];

    for (const record of records) {
      // Parse tanggal langsung dari string "YYYY-MM-DD" — hindari ambiguitas timezone
      const [tYear, tMonth, tDay] = (record.tanggal as string).split("-").map(Number);
      // new Date(year, monthIndex, day) → local time; gunakan Date.UTC untuk konsistensi
      const tanggalDate = new Date(Date.UTC(tYear, tMonth - 1, tDay));
      const dayName = DAYS_INDONESIAN[tanggalDate.getUTCDay()];

      // Hitung threshold untuk hari tersebut
      let thresholdTime = sekolah.jamMasuk || "07:00";
      if (aturanJam.length > 0) {
        const siswaRecord = record.Siswa as any;
        const kelasRaw = (siswaRecord?.kelas || "").trim();
        const kelasAngka = parseInt(kelasRaw, 10);

        const ruleWithKelas = aturanJam.find((r: any) =>
          r.hari === dayName &&
          r.kelas &&
          (r.kelas === kelasRaw || r.kelas === String(kelasAngka))
        );
        const ruleForDay = aturanJam.find((r: any) => r.hari === dayName && !r.kelas);
        const rule = ruleWithKelas ?? ruleForDay;
        if (rule) {
          thresholdTime = rule.tenggat || rule.jamMasuk || thresholdTime;
        }
      }

      // Ekstrak jam WIB dari jamTap (ISO UTC string) untuk perbandingan timezone-safe
      const WIB_OFFSET = 7 * 60;
      const tapWibMs = new Date(record.jamTap as string).getTime() + WIB_OFFSET * 60 * 1000;
      const tapWib = new Date(tapWibMs);
      const tapHhmm = `${String(tapWib.getUTCHours()).padStart(2, "0")}:${String(tapWib.getUTCMinutes()).padStart(2, "0")}`;


      const newStatus = calculateAttendanceStatus(tapHhmm, thresholdTime, 0);


      // Hanya update jika status berubah
      if (newStatus !== record.status) {
        updatedCount++;
        updatePromises.push(
          Promise.resolve(
            supabase
              .from("Kehadiran")
              .update({ status: newStatus })
              .eq("id", record.id)
          )
        );
      }
    }

    // Eksekusi semua update secara parallel
    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      const errors = results.filter((r) => r.error).map((r) => r.error.message);
      if (errors.length > 0) {
        console.error("Errors during recalculate:", errors);
        return NextResponse.json(
          { success: false, error: `Gagal memperbarui ${errors.length} record.`, details: errors },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Recalculate selesai. ${updatedCount} dari ${records.length} record diperbarui.`,
      updated: updatedCount,
      total: records.length,
    });
  } catch (err: any) {
    console.error("PATCH school config catch block:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

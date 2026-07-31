import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateAttendanceStatus } from "@/lib/utils/attendance-utils";
import { tentukanEcoPoin } from "@/lib/eco-assessment";
import { randomUUID } from "crypto";

/**
 * Endpoint Simulasi Tap NFC (Hanya untuk Development/Testing lokal)
 * POST /api/attendance/tap/simulate
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Cek keamanan Environment: Wajib dinonaktifkan di production
    const isProd = process.env.NODE_ENV === "production";
    const enableSim = process.env.ENABLE_TAP_SIMULATION === "true";

    if (isProd && !enableSim) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak. Simulasi dinonaktifkan di lingkungan Production.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { nfcTagId, deviceId, timestamp, modaTransport } = body;

    // 2. Validasi input basic
    if (!nfcTagId || !deviceId || !timestamp) {
      return NextResponse.json(
        {
          success: false,
          error: "Payload tidak lengkap. Harus menyertakan nfcTagId, deviceId, dan timestamp.",
        },
        { status: 400 }
      );
    }

    const tapDate = new Date(timestamp);
    if (isNaN(tapDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Format timestamp tidak valid." },
        { status: 400 }
      );
    }

    // Ekstrak jam:menit dan nama hari dalam zona WIB (UTC+7) dari timestamp.
    // Ini penting agar penentuan "hari apa" dan perbandingan jam tidak terpengaruh
    // timezone server (yang berjalan di UTC saat di-deploy).
    const WIB_OFFSET = 7 * 60; // menit
    const tapUtcMs = tapDate.getTime();
    const tapWibMs = tapUtcMs + WIB_OFFSET * 60 * 1000;
    const tapWib = new Date(tapWibMs);

    // tapHhmm dipakai sebagai string jam lokal untuk calculateAttendanceStatus
    const tapHhmm = `${String(tapWib.getUTCHours()).padStart(2, "0")}:${String(tapWib.getUTCMinutes()).padStart(2, "0")}`;
    // Nama hari dalam WIB (0=Minggu … 6=Sabtu)
    const tapWibDay = tapWib.getUTCDay();

    // 3. Cari NfcReader berdasarkan deviceId (Tanpa cek Secret Key)
    const { data: reader, error: readerError } = await supabase
      .from("NfcReader")
      .select("*")
      .eq("deviceId", deviceId)
      .maybeSingle();

    if (readerError) {
      console.error("Simulation: Error fetching NfcReader:", readerError);
      return NextResponse.json(
        { success: false, error: "Gagal memverifikasi perangkat reader." },
        { status: 500 }
      );
    }

    if (!reader) {
      return NextResponse.json(
        { success: false, error: `Perangkat Reader dengan ID '${deviceId}' tidak terdaftar.` },
        { status: 404 }
      );
    }

    // 4. Cari Siswa berdasarkan nfcTagId (termasuk Sekolah)
    const { data: siswa, error: siswaError } = await supabase
      .from("Siswa")
      .select("*, Sekolah(*)")
      .eq("nfcTagId", nfcTagId)
      .maybeSingle();

    if (siswaError) {
      console.error("Simulation: Error fetching Siswa:", siswaError);
      return NextResponse.json(
        { success: false, error: "Gagal memverifikasi kartu siswa." },
        { status: 500 }
      );
    }

    if (!siswa) {
      return NextResponse.json(
        { success: false, error: `Kartu NFC '${nfcTagId}' belum terdaftar pada siswa manapun.` },
        { status: 404 }
      );
    }

    const sekolah = siswa.Sekolah || siswa.sekolah;
    if (!sekolah) {
      return NextResponse.json(
        { success: false, error: "Sekolah asal siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // Validasi kecocokan sekolah
    if (reader.sekolahId !== siswa.sekolahId) {
      return NextResponse.json(
        { success: false, error: "Perangkat Reader diletakkan di sekolah yang salah." },
        { status: 400 }
      );
    }

    // 5. Normalisasi tanggal ke YYYY-MM-DD dalam WIB
    const year = tapWib.getUTCFullYear();
    const month = String(tapWib.getUTCMonth() + 1).padStart(2, "0");
    const day = String(tapWib.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    // 6. Cek duplikasi tap di hari yang sama
    const { data: existingKehadiran, error: checkError } = await supabase
      .from("Kehadiran")
      .select("*")
      .eq("siswaId", siswa.id)
      .eq("tanggal", dateStr)
      .maybeSingle();

    if (checkError) {
      console.error("Simulation: Error checking duplicate Kehadiran:", checkError);
      return NextResponse.json(
        { success: false, error: "Gagal mendeteksi duplikasi kehadiran." },
        { status: 500 }
      );
    }

    if (existingKehadiran) {
      return NextResponse.json(
        {
          success: false,
          error: `Siswa '${siswa.nama}' sudah melakukan tap hari ini (Simulasi).`,
          data: existingKehadiran,
        },
        { status: 409 }
      );
    }

    // 7. Hitung status kehadiran (Tepat Waktu / Telat)
    // Gunakan tapWibDay untuk nama hari dan tapHhmm untuk perbandingan waktu (keduanya WIB)
    const DAYS_INDONESIAN = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayName = DAYS_INDONESIAN[tapWibDay];
    const kelasRaw = (siswa.kelas || "").trim();
    const kelasAngka = parseInt(kelasRaw, 10);

    let thresholdTime = sekolah.jamMasuk || "07:00";
    if (sekolah.aturanJam && Array.isArray(sekolah.aturanJam) && sekolah.aturanJam.length > 0) {
      const ruleWithKelas = sekolah.aturanJam.find((r: any) =>
        r.hari === dayName &&
        r.kelas &&
        (r.kelas === kelasRaw || r.kelas === String(kelasAngka))
      );
      const ruleForDay = sekolah.aturanJam.find(
        (r: any) => r.hari === dayName && !r.kelas
      );
      const rule = ruleWithKelas ?? ruleForDay;
      if (rule) {
        thresholdTime = rule.tenggat || rule.jamMasuk || thresholdTime;
      }
    }

    // Bandingkan jam WIB (string "HH:mm") dengan threshold — timezone-safe
    const status = calculateAttendanceStatus(tapHhmm, thresholdTime, 0);

    // 8. Hitung penilaian eco-awareness (Poin, Kategori, Emisi)
    const ecoResult = tentukanEcoPoin(reader.titikTap, modaTransport);

    // 9. Simpan record Kehadiran ke Supabase
    const { data: newKehadiran, error: createError } = await supabase
      .from("Kehadiran")
      .insert([
        {
          id: randomUUID(),
          siswaId: siswa.id,
          tanggal: dateStr,
          jamTap: tapDate.toISOString(),
          status,
          titikTap: reader.titikTap,
          nfcReaderId: reader.id,
          modaTransport: modaTransport || null,
          haltId: reader.titikTap === "HALTE" ? "halt-001" : null,
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error("Simulation: Error creating Kehadiran:", createError);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan absensi.", details: createError.message },
        { status: 500 }
      );
    }

    // 10. Update lastSeenAt pada NfcReader secara asynchronous
    supabase
      .from("NfcReader")
      .update({ lastSeenAt: tapDate.toISOString() })
      .eq("id", reader.id)
      .then(({ error }) => {
        if (error) console.error("Simulation: Error updating reader lastSeenAt:", error);
      });

    return NextResponse.json(
      {
        success: true,
        message: "Absensi simulasi berhasil dicatat.",
        isSimulation: true,
        data: {
          id: newKehadiran.id,
          siswa: {
            id: siswa.id,
            nama: siswa.nama,
            kelas: siswa.kelas,
          },
          tanggal: newKehadiran.tanggal,
          jamTap: newKehadiran.jamTap,
          status: newKehadiran.status,
          titikTap: newKehadiran.titikTap,
          modaTransport: newKehadiran.modaTransport,
          ecoPoin: ecoResult.skorEcoPoin,
          kategoriEmisi: ecoResult.kategori,
          estimasiKgCO2: ecoResult.estimasiKgCO2,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in simulation API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal server.",
        details: error?.message || "",
      },
      { status: 500 }
    );
  }
}

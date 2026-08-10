import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateAttendanceStatus } from "@/lib/utils/attendance-utils";
import { tentukanEcoPoin } from "@/lib/eco-assessment";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Ambil device secret header
    const deviceSecret = req.headers.get("x-device-secret");
    if (!deviceSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Missing x-device-secret header." },
        { status: 401 }
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

    // Untuk kebenaran perhitungan, gunakan waktu server saat menerima request
    // untuk mencegah clock drift pada device reader lokal.
    const tapDate = new Date(); // server time (UTC saat di-deploy)
    const clientTapDate = new Date(timestamp);
    if (isNaN(clientTapDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Format timestamp tidak valid." },
        { status: 400 }
      );
    }

    // Konversi ke WIB (UTC+7) untuk semua perhitungan jam/hari.
    // Server berjalan di UTC saat di-deploy; tanpa konversi ini, getDay()/getHours()
    // akan menghasilkan hari/jam yang salah untuk timezone Indonesia.
    const WIB_OFFSET = 7 * 60; // menit
    const tapWibMs = tapDate.getTime() + WIB_OFFSET * 60 * 1000;
    const tapWib = new Date(tapWibMs);
    // String "HH:mm" dalam WIB — dipakai untuk perbandingan threshold
    const tapHhmm = `${String(tapWib.getUTCHours()).padStart(2, "0")}:${String(tapWib.getUTCMinutes()).padStart(2, "0")}`;
    // Nama hari dalam WIB
    const tapWibDay = tapWib.getUTCDay();

    // 3. Cari NfcReader berdasarkan deviceId & validasi secret key
    const { data: reader, error: readerError } = await supabase
      .from("NfcReader")
      .select("*")
      .eq("deviceId", deviceId)
      .maybeSingle();

    if (readerError) {
      console.error("Error fetching NfcReader:", readerError);
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

    // Cek status aktif perangkat
    if (!reader.isActive) {
      return NextResponse.json(
        { success: false, error: "Perangkat Reader ini dinonaktifkan oleh administrator." },
        { status: 401 }
      );
    }

    // Cocokkan secretKey
    if (reader.secretKey !== deviceSecret) {
      return NextResponse.json(
        { success: false, error: "Kredensial Perangkat Tap Reader tidak cocok." },
        { status: 401 }
      );
    }

    // 4. Cari Siswa berdasarkan nfcTagId
    const { data: siswa, error: siswaError } = await supabase
      .from("Siswa")
      .select("*")
      .eq("nfcTagId", nfcTagId)
      .maybeSingle();

    if (siswaError) {
      console.error("Error fetching Siswa:", siswaError);
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

    // 4a. Query data Sekolah secara langsung (bukan via JOIN) agar aturanJam
    // selalu fresh dari DB — menghindari stale cache dari relasi JOIN Siswa→Sekolah.
    const { data: sekolah, error: sekolahError } = await supabase
      .from("Sekolah")
      .select("*")
      .eq("id", siswa.sekolahId)
      .maybeSingle();

    if (sekolahError) {
      console.error("Error fetching Sekolah:", sekolahError);
      return NextResponse.json(
        { success: false, error: "Gagal memuat data sekolah siswa." },
        { status: 500 }
      );
    }

    if (!sekolah) {
      return NextResponse.json(
        { success: false, error: "Sekolah asal siswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // Validasi kecocokan sekolah antara reader dan siswa
    if (reader.sekolahId !== siswa.sekolahId) {
      return NextResponse.json(
        { success: false, error: "Perangkat Reader diletakkan di sekolah yang salah." },
        { status: 400 }
      );
    }

    // Cek hari sekolah dalam WIB (Hanya Senin - Jumat yang diizinkan untuk absensi)
    if (tapWibDay === 0 || tapWibDay === 6) {
      return NextResponse.json(
        { success: false, error: "Absensi ditolak. Absensi hanya dapat dicatat pada hari Senin - Jumat." },
        { status: 403 }
      );
    }

    // 4b. Validasi window jam tap yang diizinkan (WIB)
    // Window ditentukan secara dinamis dari aturanJam hari ini:
    //   - WINDOW_START = jamMasuk hari ini − 30 menit (buffer kedatangan awal)
    //   - WINDOW_END   = tenggat hari ini (batas akhir absensi diterima)
    // Jika aturanJam belum dikonfigurasi, fallback ke window default 06:30–11:00.
    {
      const DAYS_INDONESIAN_WINDOW = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dayNameForWindow = DAYS_INDONESIAN_WINDOW[tapWibDay];
      let windowStartMinutes = 6 * 60 + 30; // default 06:30
      let windowEndMinutes   = 11 * 60;      // default 11:00

      if (sekolah.aturanJam && Array.isArray(sekolah.aturanJam) && sekolah.aturanJam.length > 0) {
        const ruleForWindow = sekolah.aturanJam.find((r: any) => r.hari === dayNameForWindow && !r.kelas)
          ?? sekolah.aturanJam.find((r: any) => r.hari === dayNameForWindow);
        if (ruleForWindow) {
          const [jmH, jmM] = (ruleForWindow.jamMasuk || "07:00").split(":").map(Number);
          const [tgH, tgM] = (ruleForWindow.tenggat || ruleForWindow.jamMasuk || "07:00").split(":").map(Number);
          // Buffer kedatangan 60 menit sebelum jam masuk, minimal jam 05:00
          windowStartMinutes = Math.max(5 * 60, jmH * 60 + jmM - 60);
          windowEndMinutes   = tgH * 60 + tgM;
        }
      }

      // tapHhmm sudah dalam WIB — konversi ke menit untuk perbandingan
      const [tapH, tapM] = tapHhmm.split(":").map(Number);
      const tapTotalMinutes = tapH * 60 + tapM;
      if (tapTotalMinutes < windowStartMinutes || tapTotalMinutes > windowEndMinutes) {
        const fmt = (m: number) =>
          `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        return NextResponse.json(
          {
            success: false,
            error: `Tap ditolak. Absensi hanya diterima antara pukul ${fmt(windowStartMinutes)} - ${fmt(windowEndMinutes)}. Waktu tap: ${tapHhmm} WIB.`,
          },
          { status: 403 }
        );
      }
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
      console.error("Error checking duplicate Kehadiran:", checkError);
      return NextResponse.json(
        { success: false, error: "Gagal mendeteksi duplikasi kehadiran." },
        { status: 500 }
      );
    }

    if (existingKehadiran) {
      // Tolak dengan status 409 Conflict sesuai instruksi (untuk feedback visual detail)
      console.log("[TAP DEBUG] DUPLIKAT — record existing:", JSON.stringify({ id: existingKehadiran.id, tanggal: existingKehadiran.tanggal, status: existingKehadiran.status, jamTap: existingKehadiran.jamTap }));
      return NextResponse.json(
        {
          success: false,
          error: `Siswa '${siswa.nama}' sudah melakukan tap hari ini.`,
          data: existingKehadiran,
        },
        { status: 409 }
      );
    }

    // 7. Hitung status kehadiran (Tepat Waktu / Telat)
    // Gunakan dayName dan tapHhmm dalam WIB — timezone-safe
    const DAYS_INDONESIAN = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayName = DAYS_INDONESIAN[tapWibDay];

    const kelasRaw = (siswa.kelas || "").trim();
    const kelasAngka = parseInt(kelasRaw, 10);

    let thresholdTime: string = sekolah.jamMasuk || "07:00";

    // --- DEBUG LOG ---
    console.log("[TAP DEBUG] sekolah.id:", sekolah.id);
    console.log("[TAP DEBUG] sekolah.aturanJam type:", typeof sekolah.aturanJam, "isArray:", Array.isArray(sekolah.aturanJam));
    console.log("[TAP DEBUG] sekolah.aturanJam value:", JSON.stringify(sekolah.aturanJam));
    console.log("[TAP DEBUG] tapHhmm (WIB):", tapHhmm, "| dayName:", dayName);
    // --- END DEBUG ---

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
      console.log("[TAP DEBUG] rule found:", JSON.stringify(rule));
      if (rule) {
        thresholdTime = rule.tenggat || rule.jamMasuk || thresholdTime;
      }
    } else {
      console.log("[TAP DEBUG] aturanJam TIDAK ADA atau bukan array — pakai fallback jamMasuk:", sekolah.jamMasuk);
    }

    // Bandingkan jam WIB (string "HH:mm") dengan threshold — timezone-safe
    console.log("[TAP DEBUG] thresholdTime final:", thresholdTime, "| hasil status:", tapHhmm <= thresholdTime ? "TEPAT_WAKTU" : "TELAT");
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
      console.error("Error creating Kehadiran:", createError);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan absensi.", details: createError.message },
        { status: 500 }
      );
    }

    // 10. Update lastSeenAt pada NfcReader secara asynchronous (monitoring online)
    supabase
      .from("NfcReader")
      .update({ lastSeenAt: tapDate.toISOString() })
      .eq("id", reader.id)
      .then(({ error }) => {
        if (error) console.error("Error updating reader lastSeenAt:", error);
      });

    return NextResponse.json(
      {
        success: true,
        message: "Absensi berhasil dicatat.",
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
          bobot: ecoResult.bobot,
          modaTransport: newKehadiran.modaTransport,
          ecoPoin: ecoResult.skorEcoPoin,
          kategoriEmisi: ecoResult.kategori,
          estimasiKgCO2: ecoResult.estimasiKgCO2,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in API route:", error);
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

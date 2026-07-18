import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { calculateAttendanceStatus } from "@/lib/utils/attendance-utils";
import { tentukanEcoPoin } from "@/lib/eco-assessment";
import { StatusKehadiran } from "@/lib/types";
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
    // untuk mencegah clock drift pada device reader lokal, namun parsing timestamp
    // dari client jika diperlukan untuk auditing.
    const tapDate = new Date(); // server time
    const clientTapDate = new Date(timestamp);
    if (isNaN(clientTapDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Format timestamp tidak valid." },
        { status: 400 }
      );
    }

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

    // 4. Cari Siswa berdasarkan nfcTagId (termasuk Sekolah)
    const { data: siswa, error: siswaError } = await supabase
      .from("Siswa")
      .select("*, Sekolah(*)")
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

    const sekolah = siswa.Sekolah || siswa.sekolah;
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

    // Cek hari sekolah (Hanya Senin - Jumat yang diizinkan untuk absensi)
    const dayOfWeek = tapDate.getDay(); // 0 = Minggu, 6 = Sabtu
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json(
        { success: false, error: "Absensi ditolak. Absensi hanya dapat dicatat pada hari Senin - Jumat." },
        { status: 403 }
      );
    }

    // 5. Normalisasi tanggal ke YYYY-MM-DD
    const year = tapDate.getFullYear();
    const month = String(tapDate.getMonth() + 1).padStart(2, "0");
    const day = String(tapDate.getDate()).padStart(2, "0");
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
    // Gunakan waktu server (tapDate) untuk mencegah manipulasi clock lokal device
    // Dapatkan batas waktu harian dari aturanJam (gunakan tenggat jika ada, fallback ke jamMasuk)
    let thresholdTime = sekolah.jamMasuk || "07:00";
    if (sekolah.aturanJam && Array.isArray(sekolah.aturanJam)) {
      const DAYS_INDONESIAN = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dayName = DAYS_INDONESIAN[tapDate.getDay()];
      const rule = sekolah.aturanJam.find((r: any) => r.hari === dayName);
      if (rule) {
        thresholdTime = rule.tenggat || rule.jamMasuk || thresholdTime;
      }
    }

    const status = calculateAttendanceStatus(
      tapDate,
      thresholdTime,
      0 // toleransiMenit diatur ke 0 karena batas deadline sudah ditentukan oleh tenggat
    );

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

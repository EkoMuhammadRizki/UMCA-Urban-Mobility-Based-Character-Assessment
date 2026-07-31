import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Generate ID siswa berikutnya dengan format "siswa-NNN".
 * Query semua ID yang berformat "siswa-{angka}", ambil angka tertinggi, lalu +1.
 * Jika belum ada sama sekali, mulai dari siswa-001.
 */
async function generateNextSiswaId(): Promise<string> {
  const { data, error } = await supabase
    .from("Siswa")
    .select("id")
    .like("id", "siswa-%");

  if (error || !data || data.length === 0) {
    return "siswa-001";
  }

  // Ekstrak angka dari ID berformat "siswa-NNN"
  const numbers = data
    .map((row) => {
      const match = row.id.match(/^siswa-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);

  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `siswa-${String(max + 1).padStart(3, "0")}`;
}

// ─── GET /api/siswa ────────────────────────────────────────────
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("Siswa")
      .select("id, nama, kelas, nfcTagId, sekolahId")
      .order("kelas", { ascending: true })
      .order("nama", { ascending: true });

    if (error) {
      console.error("Error fetching siswa:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST /api/siswa ───────────────────────────────────────────
// Body: { nama, nisn, kelas }
// atau bulk: { siswaList: [{ nama, nisn, kelas }] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Ambil sekolahId dari sekolah pertama
    const { data: sekolah, error: sekolahError } = await supabase
      .from("Sekolah")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (sekolahError || !sekolah) {
      return NextResponse.json(
        { success: false, error: "Sekolah tidak ditemukan." },
        { status: 404 }
      );
    }

    const sekolahId = sekolah.id;

    // ── Bulk import ──
    if (body.siswaList && Array.isArray(body.siswaList)) {
      const list = body.siswaList as { nama: string; nisn: string; kelas: string }[];

      if (list.length === 0) {
        return NextResponse.json(
          { success: false, error: "Data siswa kosong." },
          { status: 400 }
        );
      }

      if (list.length > 500) {
        return NextResponse.json(
          { success: false, error: "Maksimal 500 siswa per import." },
          { status: 400 }
        );
      }

      // Validasi tiap baris
      const errors: string[] = [];
      list.forEach((s, i) => {
        if (!s.nama?.trim()) errors.push(`Baris ${i + 1}: Nama wajib diisi.`);
        if (!s.kelas?.trim()) errors.push(`Baris ${i + 1}: Kelas wajib diisi.`);
        if (s.nisn && s.nisn.toString().trim().length > 20) {
          errors.push(`Baris ${i + 1}: NISN/NIS maksimal 20 karakter.`);
        }
      });

      if (errors.length > 0) {
        return NextResponse.json(
          { success: false, error: "Validasi gagal.", details: errors },
          { status: 422 }
        );
      }

      // Ambil ID awal sekali, lalu increment lokal untuk setiap baris
      const firstId = await generateNextSiswaId();
      const startNum = parseInt(firstId.replace("siswa-", ""), 10);

      const now = new Date().toISOString();
      const records = list.map((s, i) => ({
        id: `siswa-${String(startNum + i).padStart(3, "0")}`,
        nama: s.nama.trim(),
        kelas: s.kelas.trim(),
        nfcTagId: s.nisn?.toString().trim() || "",
        sekolahId,
        createdAt: now,
        updatedAt: now,
      }));

      const { error: insertError } = await supabase.from("Siswa").insert(records);
      if (insertError) {
        console.error("Bulk insert error:", insertError);
        return NextResponse.json(
          { success: false, error: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, message: `${records.length} siswa berhasil ditambahkan.`, count: records.length },
        { status: 201 }
      );
    }

    // ── Single tambah ──
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

    const newId = await generateNextSiswaId();
    const now = new Date().toISOString();
    const newSiswa = {
      id: newId,
      nama: nama.trim(),
      kelas: kelas.trim(),
      nfcTagId: nisn?.toString().trim() || "",
      sekolahId,
      createdAt: now,
      updatedAt: now,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("Siswa")
      .insert([newSiswa])
      .select()
      .single();

    if (insertError) {
      console.error("Insert siswa error:", insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "Siswa berhasil ditambahkan.", data: inserted },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/siswa catch:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

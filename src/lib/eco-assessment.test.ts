import { assert } from "console";
import { tentukanEcoPoin, getKategoriEmisiLabel } from "./eco-assessment";
import { TitikTap } from "./types";

function runTests() {
  console.log("=== Menjalankan Unit Test untuk Eco Assessment ===");

  try {
    // Skenario 1: HALTE tanpa modaTransport
    const res1 = tentukanEcoPoin(TitikTap.HALTE, null);
    console.log("Skenario 1 (HALTE, null):", res1);
    assert(res1.skorEcoPoin === 80, "Skenario 1: Skor harus 80");
    assert(res1.kategori === "RENDAH_EMISI", "Skenario 1: Kategori harus RENDAH_EMISI");
    assert(res1.estimasiKgCO2 === 0.1, "Skenario 1: Estimasi CO2 harus 0.1");

    // Skenario 2: GERBANG_SEKOLAH tanpa modaTransport
    const res2 = tentukanEcoPoin(TitikTap.GERBANG_SEKOLAH, null);
    console.log("Skenario 2 (GERBANG_SEKOLAH, null):", res2);
    assert(res2.skorEcoPoin === 30, "Skenario 2: Skor harus 30");
    assert(res2.kategori === "POTENSI_TINGGI_EMISI", "Skenario 2: Kategori harus POTENSI_TINGGI_EMISI");
    assert(res2.estimasiKgCO2 === 0.8, "Skenario 2: Estimasi CO2 harus 0.8");

    // Skenario 3: Moda transport eksplisit overriding (Jalan Kaki di Gerbang)
    const res3 = tentukanEcoPoin(TitikTap.GERBANG_SEKOLAH, "Jalan Kaki");
    console.log("Skenario 3 (GERBANG_SEKOLAH, 'Jalan Kaki'):", res3);
    assert(res3.skorEcoPoin === 100, "Skenario 3: Skor harus 100");
    assert(res3.kategori === "RENDAH_EMISI", "Skenario 3: Kategori harus RENDAH_EMISI");
    assert(res3.estimasiKgCO2 === 0.0, "Skenario 3: Estimasi CO2 harus 0.0");

    // Skenario 4: Moda transport tidak dikenal
    const res4 = tentukanEcoPoin(TitikTap.HALTE, "Teleportasi");
    console.log("Skenario 4 (HALTE, 'Teleportasi'):", res4);
    assert(res4.skorEcoPoin === 50, "Skenario 4: Skor harus 50");
    assert(res4.kategori === "SEDANG", "Skenario 4: Kategori harus SEDANG");
    assert(res4.estimasiKgCO2 === 0.5, "Skenario 4: Estimasi CO2 harus 0.5");

    console.log("\n✅ Semua Unit Test Berhasil! 🎉");
  } catch (error) {
    console.error("\n❌ Unit Test Gagal:", error);
    process.exit(1);
  }
}

runTests();

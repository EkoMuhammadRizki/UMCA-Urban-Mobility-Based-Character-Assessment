import { TitikTap } from "@/lib/types";

export type KategoriEmisi = "RENDAH_EMISI" | "SEDANG" | "POTENSI_TINGGI_EMISI";

export interface EcoAssessmentResult {
  skorEcoPoin: number;
  kategori: KategoriEmisi;
  estimasiKgCO2: number;
}

/**
 * Determines eco score, emission category, and estimated CO2 emissions in kg per trip.
 * Rules:
 * - Explicit modaTransport always overrides the default titikTap proxy.
 * - If modaTransport is null/undefined, falls back to titikTap proxy:
 *   - HALTE -> Mass transit assumption (RENDAH_EMISI)
 *   - GERBANG_SEKOLAH -> Private vehicle assumption (POTENSI_TINGGI_EMISI)
 * - If no details are available or unknown, falls back to SEDANG (neutral).
 * 
 * NOTE: Values are rough estimates for indicator purposes only, not precision measurements.
 */
export function tentukanEcoPoin(
  titikTap: TitikTap | string | null | undefined,
  modaTransport?: string | null
): EcoAssessmentResult {
  
  // 1. Explicit modaTransport always wins
  if (modaTransport) {
    const normalized = modaTransport.trim().toLowerCase();

    // Active Transport (Zero emission)
    if (normalized === "jalan kaki" || normalized === "sepeda") {
      return {
        skorEcoPoin: 100,
        kategori: "RENDAH_EMISI",
        estimasiKgCO2: 0.0,
      };
    }

    // Mass / School Transit (Low emission per passenger)
    if (
      normalized === "bus sekolah" ||
      normalized === "bus umum" ||
      normalized === "transjakarta" ||
      normalized === "angkutan umum" ||
      normalized === "angkot" ||
      normalized === "kereta" ||
      normalized === "lrt" ||
      normalized === "mrt"
    ) {
      return {
        skorEcoPoin: 80,
        kategori: "RENDAH_EMISI",
        estimasiKgCO2: 0.1, // rough per-passenger trip estimate
      };
    }

    // Two-wheeler (Medium emission per passenger)
    if (
      normalized === "motor" ||
      normalized === "ojek" ||
      normalized === "ojek online" ||
      normalized === "ride-sharing motor"
    ) {
      return {
        skorEcoPoin: 40,
        kategori: "SEDANG",
        estimasiKgCO2: 0.4,
      };
    }

    // Private Car (High emission per passenger)
    if (
      normalized === "mobil pribadi" ||
      normalized === "mobil" ||
      normalized === "taksi" ||
      normalized === "taksi online" ||
      normalized === "ride-sharing mobil"
    ) {
      return {
        skorEcoPoin: 10,
        kategori: "POTENSI_TINGGI_EMISI",
        estimasiKgCO2: 1.2,
      };
    }

    // Fallback for unrecognized modaTransport
    return {
      skorEcoPoin: 50,
      kategori: "SEDANG",
      estimasiKgCO2: 0.5,
    };
  }

  // 2. Fallback to titikTap proxy
  if (titikTap === TitikTap.HALTE || titikTap === "HALTE") {
    // Tap at bus stop implies student took mass transit
    return {
      skorEcoPoin: 80,
      kategori: "RENDAH_EMISI",
      estimasiKgCO2: 0.1,
    };
  }

  if (titikTap === TitikTap.GERBANG_SEKOLAH || titikTap === "GERBANG_SEKOLAH") {
    // Tap at school gate implies private drop-off
    return {
      skorEcoPoin: 30,
      kategori: "POTENSI_TINGGI_EMISI",
      estimasiKgCO2: 0.8, // estimated avg of private motor/car mix
    };
  }

  // 3. Fallback when there's no data (absen or unknown)
  return {
    skorEcoPoin: 0,
    kategori: "SEDANG",
    estimasiKgCO2: 0.0,
  };
}

/**
 * Gets the Indonesian label for emission categories.
 */
export function getKategoriEmisiLabel(kategori: KategoriEmisi): string {
  switch (kategori) {
    case "RENDAH_EMISI":
      return "Rendah Emisi";
    case "SEDANG":
      return "Sedang";
    case "POTENSI_TINGGI_EMISI":
      return "Potensi Tinggi Emisi";
    default:
      return "Tidak Diketahui";
  }
}

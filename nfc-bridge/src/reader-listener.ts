import { sendTapRecord } from "./api-client";

// Cache untuk melacak waktu tap terakhir per UID (untuk debouncing)
const lastTapCache = new Map<string, number>();
const DEBOUNCE_MS = 3000; // 3 detik debounce sesuai requirement

/**
 * Mendaftarkan event listener pada perangkat NFC Reader
 * @param reader - Objek Reader dari library nfc-pcsc
 */
export function setupReaderListeners(reader: any) {
  console.log(`[Reader Listener] Menghubungkan pendengar untuk reader: ${reader.name}`);

  // Event saat kartu NFC didekatkan (tap)
  reader.on("card", async (card: any) => {
    try {
      // Ambil UID menggunakan APDU command GET UID secara manual (karena autoProcessing dimatikan)
      // APDU GET UID: Class=FF, Ins=CA, P1=00, P2=00, Le=00
      const packet = Buffer.from([0xFF, 0xCA, 0x00, 0x00, 0x00]);
      const response = await reader.transmit(packet, 40);
      
      // Respon sukses diakhiri dengan status bytes '90 00' (2 byte terakhir)
      // Potong 2 byte terakhir untuk mendapatkan data UID murni
      const uid = response.slice(0, -2).toString("hex").toUpperCase();
      if (!uid) return;

      const now = Date.now();
      const lastTap = lastTapCache.get(uid) || 0;

      // Cek durasi debounce
      if (now - lastTap < DEBOUNCE_MS) {
        // Abaikan tap berulang yang terlalu cepat untuk kartu yang sama
        return;
      }

      lastTapCache.set(uid, now);
      console.log(`\x1b[36m[Reader Listener] Kartu Terdeteksi! UID: ${uid}\x1b[0m`);
      
      // Kirim data ke API Route Next.js
      await sendTapRecord(uid);
    } catch (err: any) {
      console.error("[Reader Listener] Gagal membaca UID kartu secara manual:", err.message);
    }
  });

  // Event saat kartu NFC diangkat dari reader
  reader.on("card.off", (card: any) => {
    if (!card || !card.uid) return;
    const uid = card.uid.toUpperCase();
  });

  // Event ketika terjadi error pembacaan
  reader.on("error", (err: any) => {
    // Abaikan error 'AID was not set' karena kita hanya memerlukan UID dasar kartu
    if (err.message && err.message.includes("AID was not set")) {
      return;
    }
    console.error(`[Reader Listener] Error pembacaan pada ${reader.name}:`, err.message);
  });

  // Event ketika pembaca dilepas
  reader.on("end", () => {
    console.log(`[Reader Listener] Perangkat pemindai dilepas: ${reader.name}`);
  });
}

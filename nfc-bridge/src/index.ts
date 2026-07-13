import dotenv from "dotenv";
import { setupReaderListeners } from "./reader-listener";
import { sendTapRecord, sendHeartbeat } from "./api-client";
import readline from "readline";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const DEVICE_ID = process.env.DEVICE_ID || "ACR122U-A9-RR545-169122";
const SIMULATE_READER = process.env.SIMULATE_READER === "true";

console.log("=========================================");
console.log("    UMCA NFC BRIDGE MIDDLEWARE ACTIVE    ");
console.log("=========================================");
console.log(`Device ID    : ${DEVICE_ID}`);
console.log(`API Base URL : ${API_BASE_URL}`);

// Status koneksi pembaca USB global
let isReaderConnected = false;

/**
 * Menjalankan mode pembaca fisik ACR122U
 */
async function runNfcReader() {
  try {
    const { NFC } = await import("nfc-pcsc");
    const nfc = new NFC();

    nfc.on("reader", (reader: any) => {
      console.log(`\n\x1b[32m[NFC USB] Perangkat reader terdeteksi: ${reader.name}\x1b[0m`);
      console.log("[NFC USB] Menghubungkan driver ACR122U...");
      
      // Matikan auto-processing agar tidak error ketika memindai kartu ISO 14443-4 (seperti e-money / Flazz)
      reader.autoProcessing = false;
      
      isReaderConnected = true;
      setupReaderListeners(reader);

      // Listener saat reader dicabut
      reader.on("end", () => {
        isReaderConnected = false;
      });
    });

    nfc.on("error", (err: any) => {
      console.error("\x1b[31m[NFC PC/SC] Kesalahan sistem PC/SC:\x1b[0m", err.message);
      isReaderConnected = false;
    });
  } catch (error: any) {
    console.warn("\n\x1b[33m[Warning] Gagal memuat modul C++ 'nfc-pcsc' (bindings tidak ditemukan).\x1b[0m");
    console.log("Kemungkinan besar karena C++ Build Tools belum terpasang di komputer Anda.");
    console.log("-> Mengalihkan otomatis ke MODE SIMULASI TERMINAL (Keyboard Input).");
    startKeyboardSimulation();
  }
}

/**
 * Menjalankan simulasi input UID kartu lewat keyboard di Terminal
 */
function startKeyboardSimulation() {
  // Dalam mode simulasi, kita tandai reader seakan-akan selalu terkoneksi
  isReaderConnected = true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("\n\x1b[36m[Mode Simulasi] Ketik/Paste UID Kartu NFC (contoh: 04A1B2C3D4E5F6) lalu tekan Enter:\x1b[0m");
  
  const askForUid = () => {
    rl.question("\nUID Kartu > ", async (uidInput) => {
      const uid = uidInput.trim().toUpperCase();
      if (uid) {
        console.log(`[Simulasi] Menempelkan kartu dengan UID: ${uid}`);
        await sendTapRecord(uid);
      } else {
        console.log("[Simulasi] UID tidak boleh kosong.");
      }
      askForUid();
    });
  };

  askForUid();
}

// ─── Loop Heartbeat 5 Detik ───────────────────────────
// Mengirimkan status online/offline reader ke server Next.js setiap 5 detik
setInterval(async () => {
  await sendHeartbeat(isReaderConnected);
}, 5000);

// Eksekusi berdasarkan konfigurasi
if (SIMULATE_READER) {
  console.log("\n[Kiosk] Mengaktifkan MODE SIMULASI KEYBOARD (dikonfigurasi via .env)...");
  startKeyboardSimulation();
} else {
  console.log("Memantau koneksi USB perangkat ACR122U...\n");
  runNfcReader();
}

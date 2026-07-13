import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";
const DEVICE_ID = process.env.DEVICE_ID || "ACR122U-A9-RR545-169122";
const DEVICE_SECRET = process.env.DEVICE_SECRET || "super-secret-key-123";

/**
 * Mengirim payload tap NFC ke API Next.js backend
 * @param nfcTagId - UID kartu NFC yang terbaca oleh ACR122U
 */
export async function sendTapRecord(nfcTagId: string) {
  const timestamp = new Date().toISOString();
  
  console.log(`\n[API Client] Mengirim data tap untuk UID: ${nfcTagId} pada ${timestamp}...`);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/tap`,
      {
        deviceId: DEVICE_ID,
        nfcTagId: nfcTagId,
        timestamp: timestamp
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-device-secret": DEVICE_SECRET
        }
      }
    );

    const { success, message, data } = response.data;
    if (success) {
      console.log(`\x1b[32m[API Client] Absensi Berhasil dicatat! ✅\x1b[0m`);
      console.log(`Siswa       : ${data.siswa.nama} (Kelas ${data.siswa.kelas})`);
      console.log(`Waktu Tap   : ${new Date(data.jamTap).toLocaleTimeString()}`);
      console.log(`Status Absen: ${data.status}`);
      console.log(`Eco-Category: ${data.kategoriEmisi} (${data.ecoPoin} Poin, Est: ${data.estimasiKgCO2} kg CO2)`);
    } else {
      console.log(`\x1b[33m[API Client] Respon tidak sukses: ${message}\x1b[0m`);
    }
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;
      
      if (status === 409) {
        console.log(`\x1b[33m[API Client] Konflik (409): ${responseData.error}\x1b[0m`);
        if (responseData.data) {
          console.log(`Detail      : Sudah Tap sebelumnya pada pukul ${new Date(responseData.data.jamTap).toLocaleTimeString()}`);
        }
      } else {
        console.log(`\x1b[31m[API Client] Gagal (${status}): ${responseData.error || "Kesalahan API backend."}\x1b[0m`);
      }
    } else {
      console.log(`\x1b[31m[API Client] Gagal terhubung ke Backend API: ${error.message}\x1b[0m`);
      console.log(`Pastikan Next.js server sudah aktif dan berjalan di: ${API_BASE_URL}`);
    }
  }
}

/**
 * Mengirim ping status heartbeat pembaca NFC ke Next.js API
 * @param connected - Apakah hardware pembaca terpasang (dicolok)
 */
export async function sendHeartbeat(connected: boolean) {
  try {
    await axios.post(
      `${API_BASE_URL}/api/reader/heartbeat`,
      {
        deviceId: DEVICE_ID,
        connected: connected
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-device-secret": DEVICE_SECRET
        }
      }
    );
  } catch (error: any) {
    // Gagal heartbeat sengaja di-ignore agar tidak memenuhi logs terminal
  }
}

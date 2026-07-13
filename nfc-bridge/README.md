# NFC Bridge — Middleware ACR122U ke Next.js API

Aplikasi companion Node.js ini mendeteksi event tap kartu NFC pada perangkat **ACS ACR122U**, membaca UID/Tag ID kartu secara real-time, lalu meneruskannya ke API backend Next.js secara aman.

---

## 🛠️ Langkah 1: Instalasi Driver Pembaca ACR122U (Windows)

Perangkat ACS ACR122U menggunakan standar driver PC/SC. Agar Node.js dapat mendeteksi perangkat, pastikan driver resmi telah terpasang:

1. **Unduh Driver Resmi**:
   * Kunjungi halaman resmi ACS: [ACR122U USB NFC Reader Driver](https://www.acs.com.hk/en/products/3/acr122u-usb-nfc-reader/)
   * Unduh installer driver MSI untuk Windows.
2. **Jalankan Layanan Smart Card**:
   * Buka Windows Services (tekan `Win + R`, ketik `services.msc`, lalu tekan Enter).
   * Cari layanan bernama **Smart Card**.
   * Pastikan status layanan tersebut **Running** (Sedang berjalan) dan jenis startup diatur ke **Automatic**.
3. **Colok Perangkat**:
   * Colokkan kabel USB ACR122U ke laptop/komputer. Lampu LED pada reader harus berwarna merah solid (menunjukkan daya masuk dan siap membaca).

---

## 💻 Langkah 2: Menjalankan Aplikasi Middleware

1. **Masuk ke Direktori**:
   Buka terminal di folder `nfc-bridge/`:
   ```bash
   cd nfc-bridge
   ```
2. **Instal Dependensi**:
   ```bash
   npm install
   ```
3. **Konfigurasi Environment**:
   Salin berkas `.env` yang sudah disiapkan, lalu sesuaikan isinya jika diperlukan:
   * `DEVICE_ID` : ID unik perangkat (dari stiker/QR reader, e.g., `ACR122U-A9-RR545-169122`).
   * `DEVICE_SECRET` : Token autentikasi rahasia perangkat (wajib cocok dengan field `secretKey` di database `NfcReader`).
   * `API_BASE_URL` : URL server Next.js Anda (default: `http://localhost:3000`).
4. **Jalankan Middleware**:
   * Mode Pengembangan (dengan hot-reload):
     ```bash
     npm run dev
     ```
   * Mode Produksi (build dan run):
     ```bash
     npm run build
     npm start
     ```

---

## 🔍 Log Konsol Output

Saat berjalan sukses, konsol akan menampilkan log berikut:
* `[NFC USB] Perangkat reader terdeteksi: ACS ACR122U Picc Interface 0` saat perangkat dicolok.
* `[Reader Listener] Kartu Terdeteksi! UID: XXXXXXXX` ketika kartu didekatkan ke reader.
* `[API Client] Absensi Berhasil dicatat! ✅` ketika respons server Next.js sukses.

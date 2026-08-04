// ============================================================================
//  UMCA — Urban Mobility-Based Character Assessment
//  ESP32 NFC Reader Firmware — PERANGKAT 1: HALTE SEKOLAH (Emisi Rendah)
//  (DIRECT INTEGRATION TO SUPABASE RPC)
// ============================================================================
//  Wiring RC522 (RFID):
//    - SS / SDA   → GPIO 5
//    - RST        → GPIO 22
//    - MOSI       → GPIO 23
//    - SCK        → GPIO 18 (atau 19)
//    - MISO       → GPIO 19 (atau 21)
//
//  Wiring DFPlayer Mini:
//    - TX (DFPlayer) → GPIO 16 (RX2 ESP32)
//    - RX (DFPlayer) → GPIO 17 (TX2 ESP32)
// ============================================================================

#include <SPI.h>
#include <MFRC522.h>
#include <HardwareSerial.h>
#include <DFRobotDFPlayerMini.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ─── Pin Definitions ────────────────────────────────────────────────────────
#define SS_PIN    5
#define RST_PIN   22
#define LED_OK    2     // LED bawaan ESP32 (GPIO2)
#define BUZZER    4

// ─── Inisialisasi Objek ─────────────────────────────────────────────────────
MFRC522 mfrc522(SS_PIN, RST_PIN);
DFRobotDFPlayerMini myDFPlayer;
HardwareSerial mySerial(2); // UART2: RX2=GPIO16, TX2=GPIO17

// ═══════════════════════════════════════════════════════════════════════════
//  KONFIGURASI — PERANGKAT HALTE SEKOLAH (DIRECT TO SUPABASE)
// ═══════════════════════════════════════════════════════════════════════════

const char* SUPABASE_URL = "https://ndybudwdzyfamrchtcrw.supabase.co";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5keWJ1ZHdkenlmYW1yY2h0Y3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDcwMzIsImV4cCI6MjA5OTUyMzAzMn0.KUD0QMUEQYz_k4lOeYOlMIwbKwOCHqSKu7GByWOlHwQ";

// Identitas Perangkat Halte (Cocokkan dengan tabel NfcReader di Supabase)
const char* DEVICE_ID = "reader-halte-001";
const char* DEVICE_SECRET = "umca-secret-key-halte-001";
const char* DEFAULT_MODA_TRANSPORT = "Bus Sekolah"; // Otomatis kategori Rendah Emisi
const char* AP_NAME = "UMCA-Halte-Setup";

// ═══════════════════════════════════════════════════════════════════════════

// ─── Timing ─────────────────────────────────────────────────────────────────
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;  // 30 detik
const unsigned long TAP_COOLDOWN = 3000;         // 3 detik cooldown
const unsigned long WIFI_ERROR_SOUND_INTERVAL = 60000; // Suara error koneksi tiap 60 detik
unsigned long lastWifiErrorSound = 0;
unsigned long lastTapTime = 0;

// ─── Status Tracking ────────────────────────────────────────────────────────
bool dfPlayerReady = false;
bool wifiConnected = false;

// ─── Forward Declarations ───────────────────────────────────────────────────
void sendHeartbeat();
void handleNfcTap(String uid);
void playSound(int track);
void blinkLED(int times, int delayMs);
String getTimestamp();

// ═══════════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_OK, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  digitalWrite(LED_OK, LOW);

  Serial.println();
  Serial.println("=============================================");
  Serial.println("  UMCA — ESP32 Reader: HALTE SEKOLAH        ");
  Serial.println("  (DIRECT TO SUPABASE RPC)                   ");
  Serial.println("=============================================");
  Serial.println();

  // ─── 1. DFPlayer Init ─────────────────────────────────────────
  Serial.println("[DFPlayer] Inisialisasi UART2 (RX:16, TX:17)...");
  mySerial.begin(9600, SERIAL_8N1, 16, 17);
  mySerial.setTimeout(500);
  delay(200);

  if (myDFPlayer.begin(mySerial, false)) {
    Serial.println("[DFPlayer] OK - Terdeteksi.");
    myDFPlayer.volume(28);
    dfPlayerReady = true;
  } else {
    Serial.println("[DFPlayer] WARNING: Tidak terdeteksi/gagal. Tetap berjalan tanpa suara.");
  }

  // ─── 2. WiFiManager ──────────────────────────────────────────
  Serial.println("[WiFi] Menghubungkan...");
  WiFiManager wm;
  wm.setConfigPortalTimeout(180);

  if (!wm.autoConnect(AP_NAME)) {
    Serial.println("[WiFi] Gagal terhubung. Restarting...");
    delay(3000);
    ESP.restart();
  }

  wifiConnected = true;
  Serial.print("[WiFi] OK - Terhubung! IP ESP32: ");
  Serial.println(WiFi.localIP());

  // ─── 3. RFID RC522 Init (Auto Detect Pin SPI) ────────────────
  Serial.println("[RFID] Inisialisasi SPI...");
  
  // Coba Konfigurasi SPI Standard (SCK:18, MISO:19, MOSI:23, SS:5)
  SPI.begin(18, 19, 23, SS_PIN);
  mfrc522.PCD_Init();
  delay(100);

  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  
  // Jika tidak terdeteksi, coba Konfigurasi Custom SPI (SCK:19, MISO:21, MOSI:23, SS:5)
  if (version == 0x00 || version == 0xFF) {
    SPI.end();
    SPI.begin(19, 21, 23, SS_PIN);
    mfrc522.PCD_Init();
    delay(100);
    version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  }

  if (version == 0x00 || version == 0xFF) {
    Serial.println("[RFID] ERROR: RC522 tidak terdeteksi! Periksa solderan pin SPI & kabel reader.");
  } else {
    Serial.print("[RFID] OK - RC522 Berhasil Diinisialisasi. Version: 0x");
    Serial.println(version, HEX);
  }

  // ─── 4. Heartbeat Pertama & Ready Status ─────────────────────
  Serial.println("[System] Mengirim heartbeat pertama ke Supabase...");
  sendHeartbeat();

  playSound(5); // Sound 0005.mp3: "Sistem siap"
  blinkLED(3, 150);

  Serial.println();
  Serial.println("=============================================");
  Serial.println("  SISTEM HALTE SIAP - Silakan Tap Kartu NFC  ");
  Serial.print("  Device ID : "); Serial.println(DEVICE_ID);
  Serial.print("  Supabase  : "); Serial.println(SUPABASE_URL);
  Serial.print("  WiFi IP   : "); Serial.println(WiFi.localIP());
  Serial.println("=============================================");
  Serial.println();
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════
void loop() {
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("[WiFi] Koneksi terputus! Mencoba menghubungkan ulang...");
      wifiConnected = false;
    }
    WiFi.reconnect();

    // Suara "Terjadi Kesalahan Koneksi" (0004.mp3) setiap 60 detik saat offline
    if (millis() - lastWifiErrorSound >= WIFI_ERROR_SOUND_INTERVAL) {
      playSound(4);
      lastWifiErrorSound = millis();
    }

    delay(1000);
  } else if (!wifiConnected) {
    wifiConnected = true;
    Serial.println("[WiFi] Terhubung kembali ke WiFi.");
    lastWifiErrorSound = 0; // reset agar suara error langsung berbunyi saat WiFi putus lagi
  }

  if (millis() - lastTapTime < TAP_COOLDOWN) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String scannedUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) scannedUID += "0";
    scannedUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  scannedUID.toUpperCase();

  Serial.println();
  Serial.println("---------------------------------------------");
  Serial.print("[HALTE] KARTU TERDETEKSI! UID: ");
  Serial.println(scannedUID);
  Serial.println("---------------------------------------------");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TAP] WiFi tidak terhubung. Absensi tidak dapat dikirim.");
    playSound(4); // 0004.mp3 "Terjadi Kesalahan Koneksi"
  } else {
    handleNfcTap(scannedUID);
  }
  lastTapTime = millis();
}

// ═══════════════════════════════════════════════════════════════════════════
//  KIRIM TAP KE SUPABASE RPC
// ═══════════════════════════════════════════════════════════════════════════
void handleNfcTap(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TAP] ERROR: WiFi terputus saat mau kirim data!");
    playSound(4);
    return;
  }

  String url = String(SUPABASE_URL) + "/rest/v1/rpc/umca_attendance_tap";
  Serial.print("[TAP] Sending POST to: ");
  Serial.println(url);

  JsonDocument doc;
  doc["nfc_tag_id"] = uid;
  doc["device_id"] = DEVICE_ID;
  doc["device_secret"] = DEVICE_SECRET;
  doc["moda_transport"] = DEFAULT_MODA_TRANSPORT;
  doc["client_timestamp"] = getTimestamp();

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  WiFiClientSecure secureClient;
  
  secureClient.setInsecure();
  secureClient.setTimeout(10000);
  http.begin(secureClient, url);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("User-Agent", "UMCA-ESP32-Halte/3.0");

  int httpCode = http.POST(jsonBody);
  Serial.print("[TAP] HTTP Response Code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("[TAP] Response Server: ");
    Serial.println(response);

    JsonDocument resDoc;
    DeserializationError err = deserializeJson(resDoc, response);

    if (!err) {
      bool success = resDoc["success"] | false;
      const char* errorMsg = resDoc["error"] | "";
      int statusCode = resDoc["statusCode"] | httpCode;

      if (statusCode == 201 && success) {
        const char* nama = resDoc["data"]["siswa"]["nama"] | "Siswa";
        const char* kelas = resDoc["data"]["siswa"]["kelas"] | "";
        const char* status = resDoc["data"]["status"] | "";
        const char* jamTapStr = resDoc["data"]["jamTap"] | "";
        const char* titikTapStr = resDoc["data"]["titikTap"] | "HALTE";

        Serial.println("=============================================");
        Serial.println("  ✓ ABSENSI BERHASIL DICATAT                 ");
        Serial.print("  • Nama Siswa : "); Serial.println(nama);
        Serial.print("  • Kelas      : "); Serial.println(kelas);
        Serial.print("  • UID NFC    : "); Serial.println(uid);
        Serial.print("  • Waktu Tap  : "); Serial.println(jamTapStr);
        Serial.print("  • Status     : "); Serial.println(status);
        Serial.print("  • Lokasi     : "); Serial.println(titikTapStr);
        Serial.println("=============================================");

        playSound(1);
        blinkLED(2, 150);

      } else if (statusCode == 409) {
        Serial.println("=============================================");
        Serial.println("  ⚠ PERINGATAN: SUDAH ABSEN HARI INI         ");
        Serial.print("  • UID NFC    : "); Serial.println(uid);
        Serial.print("  • Keterangan : "); Serial.println(errorMsg);
        Serial.println("=============================================");

        playSound(3);
        blinkLED(3, 100);

      } else if (statusCode == 404) {
        Serial.println("=============================================");
        Serial.println("  ✗ ERROR: KARTU/PERANGKAT TIDAK TERDAFTAR  ");
        Serial.print("  • UID NFC    : "); Serial.println(uid);
        Serial.print("  • Keterangan : "); Serial.println(errorMsg);
        Serial.println("=============================================");

        playSound(2);
        blinkLED(5, 80);

      } else {
        Serial.print("[TAP] SERVER ERROR: "); Serial.println(errorMsg);
        playSound(4);
      }
    } else {
      Serial.println("[TAP] ERROR: Gagal parsing JSON response!");
      playSound(4);
    }
  } else {
    Serial.print("[TAP] ERROR HTTP Connection (-1 = Server/IP Tidak Reachable): ");
    Serial.println(http.errorToString(httpCode));
    playSound(4);
  }

  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(SUPABASE_URL) + "/rest/v1/rpc/umca_reader_heartbeat";

  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["device_secret"] = DEVICE_SECRET;
  doc["connected"] = true;

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  WiFiClientSecure secureClient;

  secureClient.setInsecure();
  secureClient.setTimeout(5000);
  http.begin(secureClient, url);

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  http.addHeader("User-Agent", "UMCA-ESP32-Halte/3.0");

  int httpCode = http.POST(jsonBody);
  if (httpCode == 200) {
    Serial.print(".");
  } else {
    Serial.print("\n[HB Connection Error: "); Serial.print(httpCode); Serial.println("] Pastikan IP & Keys Benar");
  }
  http.end();
}

String getTimestamp() { return String(millis()); }
void playSound(int track) { if (dfPlayerReady) { myDFPlayer.play(track); delay(200); } }
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_OK, HIGH); delay(delayMs);
    digitalWrite(LED_OK, LOW); delay(delayMs);
  }
}

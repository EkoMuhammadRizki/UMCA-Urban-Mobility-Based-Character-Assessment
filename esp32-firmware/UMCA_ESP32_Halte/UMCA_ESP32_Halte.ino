// ============================================================================
//  UMCA — Urban Mobility-Based Character Assessment
//  ESP32 NFC Reader Firmware — PERANGKAT 1: HALTE SEKOLAH (Emisi Rendah)
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
//  KONFIGURASI — PERANGKAT HALTE SEKOLAH
// ═══════════════════════════════════════════════════════════════════════════

// IP Laptop tempat Next.js berjalan (Sesuai output 'npm run dev': 192.168.1.32)
// Jika Next.js jalan di port 3000: "http://192.168.1.32:3000"
// Jika Next.js jalan di port 3001: "http://192.168.1.32:3001"
const char* BASE_URL = "http://192.168.1.32:3000";

// Identitas Perangkat Halte (Cocokkan dengan tabel NfcReader di Supabase)
const char* DEVICE_ID = "reader-halte-001";
const char* DEVICE_SECRET = "umca-secret-key-halte-001";
const char* DEFAULT_MODA_TRANSPORT = "Bus Sekolah"; // Otomatis kategori Rendah Emisi
const char* AP_NAME = "UMCA-Halte-Setup";

// ═══════════════════════════════════════════════════════════════════════════

// ─── Timing ─────────────────────────────────────────────────────────────────
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;  // 5 detik
const unsigned long TAP_COOLDOWN = 3000;         // 3 detik cooldown
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
  Serial.println("  Urban Mobility-Based Character Assessment  ");
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
  Serial.println("[System] Mengirim heartbeat pertama ke server...");
  sendHeartbeat();

  playSound(5); // Sound 0005.mp3: "Sistem siap"
  blinkLED(3, 150);

  Serial.println();
  Serial.println("=============================================");
  Serial.println("  SISTEM HALTE SIAP - Silakan Tap Kartu NFC  ");
  Serial.print("  Device ID : "); Serial.println(DEVICE_ID);
  Serial.print("  Server    : "); Serial.println(BASE_URL);
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
    delay(1000);
    return;
  } else if (!wifiConnected) {
    wifiConnected = true;
    Serial.println("[WiFi] Terhubung kembali ke WiFi.");
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

  handleNfcTap(scannedUID);
  lastTapTime = millis();
}

// ═══════════════════════════════════════════════════════════════════════════
//  KIRIM TAP KE WEB SERVICE
// ═══════════════════════════════════════════════════════════════════════════
void handleNfcTap(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TAP] ERROR: WiFi terputus saat mau kirim data!");
    playSound(4);
    return;
  }

  String url = String(BASE_URL) + "/api/attendance/tap";
  Serial.print("[TAP] Sending POST to: ");
  Serial.println(url);

  JsonDocument doc;
  doc["nfcTagId"] = uid;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getTimestamp();
  doc["modaTransport"] = DEFAULT_MODA_TRANSPORT;

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  bool useHTTPS = String(BASE_URL).startsWith("https");

  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (useHTTPS) {
    secureClient.setInsecure();
    secureClient.setTimeout(10000);
    http.begin(secureClient, url);
  } else {
    plainClient.setTimeout(10000);
    http.begin(plainClient, url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SECRET);
  http.addHeader("User-Agent", "UMCA-ESP32-Halte/2.1");

  int httpCode = http.POST(jsonBody);
  Serial.print("[TAP] Response Code: ");
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

      if (httpCode == 201 && success) {
        const char* nama = resDoc["data"]["siswa"]["nama"] | "Siswa";
        const char* kelas = resDoc["data"]["siswa"]["kelas"] | "";
        const char* status = resDoc["data"]["status"] | "";
        const char* jamTapStr = resDoc["data"]["jamTap"] | "";
        const char* titikTapStr = resDoc["data"]["titikTap"] | "HALTE";
        int ecoPoin = resDoc["data"]["ecoPoin"] | 0;

        Serial.println("=============================================");
        Serial.println("  ✓ ABSENSI BERHASIL DICATAT                 ");
        Serial.print("  • Nama Siswa : "); Serial.println(nama);
        Serial.print("  • Kelas      : "); Serial.println(kelas);
        Serial.print("  • UID NFC    : "); Serial.println(uid);
        Serial.print("  • Waktu Tap  : "); Serial.println(jamTapStr);
        Serial.print("  • Status     : "); Serial.println(status);
        Serial.print("  • Lokasi     : "); Serial.println(titikTapStr);
        Serial.print("  • EcoPoin    : "); Serial.print(ecoPoin); Serial.println(" Poin (Rendah Emisi)");
        Serial.println("=============================================");

        playSound(1);
        blinkLED(2, 150);

      } else if (httpCode == 409) {
        Serial.println("=============================================");
        Serial.println("  ⚠ PERINGATAN: SUDAH ABSEN HARI INI         ");
        Serial.print("  • UID NFC    : "); Serial.println(uid);
        Serial.print("  • Keterangan : "); Serial.println(errorMsg);
        Serial.println("=============================================");

        playSound(3);
        blinkLED(3, 100);

      } else if (httpCode == 404) {
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

  String url = String(BASE_URL) + "/api/reader/heartbeat";

  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["connected"] = true;

  String jsonBody;
  serializeJson(doc, jsonBody);

  HTTPClient http;
  bool useHTTPS = String(BASE_URL).startsWith("https");

  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (useHTTPS) {
    secureClient.setInsecure();
    secureClient.setTimeout(5000);
    http.begin(secureClient, url);
  } else {
    plainClient.setTimeout(5000);
    http.begin(plainClient, url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-secret", DEVICE_SECRET);
  http.addHeader("User-Agent", "UMCA-ESP32-Halte/2.1");

  int httpCode = http.POST(jsonBody);
  if (httpCode == 200) {
    Serial.print(".");
  } else {
    Serial.print("\n[HB Connection Error: "); Serial.print(httpCode); Serial.println("] Pastikan IP & Port Server Benar");
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

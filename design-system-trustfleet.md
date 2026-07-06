# Design System — PresenceSync (Referensi Visual: TrustFleet AI)

Referensi: tampilan dashboard fintech dengan sidebar navy gelap, konten terang, card putih beraksen biru, dan badge status berwarna pastel.

---

## 1. Color Palette

### Base / Neutral
| Token | Hex | Penggunaan |
|---|---|---|
| `--navy-950` | `#0A1428` | Background sidebar (gelap solid) |
| `--navy-900` | `#0D1B33` | Gradient sidebar bawah / hover item |
| `--bg-app` | `#F5F7FA` | Background utama konten |
| `--surface-card` | `#FFFFFF` | Background card/tabel |
| `--border-subtle` | `#E5E8EF` | Border card, divider tabel |
| `--text-primary` | `#0F172A` | Judul, teks utama |
| `--text-secondary` | `#64748B` | Sub-judul, deskripsi, label kolom |
| `--text-muted` | `#94A3B8` | Placeholder, teks tersier |

### Primary / Brand
| Token | Hex | Penggunaan |
|---|---|---|
| `--brand-blue-600` | `#2563EB` | Tombol utama, tab aktif, link |
| `--brand-blue-700` | `#1D4ED8` | Hover state tombol utama |
| `--brand-blue-100` | `#DBEAFE` | Background chip/badge biru muda |
| `--gradient-card-start` | `#1E3A8A` | Gradient card statistik (kiri atas) |
| `--gradient-card-end` | `#2563EB` | Gradient card statistik (kanan bawah) |

### Status (Ketepatan Waktu / Risiko)
| Token | Hex (bg) | Hex (text) | Arti di PresenceSync |
|---|---|---|---|
| `--status-green` | `#DCFCE7` | `#15803D` | Tepat Waktu / Risiko Rendah |
| `--status-amber` | `#FEF3C7` | `#B45309` | Telat Sedikit / Risiko Sedang |
| `--status-red` | `#FEE2E2` | `#B91C1C` | Telat / Absen / Risiko Tinggi |
| `--status-gray` | `#F1F5F9` | `#475569` | Belum Ada Data / Netral |

---

## 2. Typography

- Font family: **Inter** atau **Plus Jakarta Sans** (sans-serif, geometris, mirip contoh referensi)
- Skala:
  - Judul halaman (H1): `28px / 700 / navy-950`
  - Sub-judul deskripsi: `14px / 400 / text-secondary`
  - Judul card statistik: `13px / 600 / uppercase / text-secondary` (huruf besar, tracking wide)
  - Angka besar di card statistik: `32px / 700 / white` (di card gradient biru) atau `navy-950` (di card putih)
  - Body tabel: `14px / 400–500`
  - Badge/status text: `12px / 600`

---

## 3. Layout Structure

```
┌────────────┬──────────────────────────────────────────────┐
│            │  Topbar: [chip sekolah] [chip AI aktif]   🔔 profil │
│  Sidebar   ├──────────────────────────────────────────────┤
│  (navy)    │  Judul Halaman (H1) + deskripsi kecil        │
│            │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  - Logo    │  │ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4 │ │
│  - Menu    │  └────────┘ └────────┘ └────────┘ └────────┘ │
│    items   │  ┌──────────────────┐ ┌────────────────────┐ │
│  - Profil  │  │ Grafik / Donat   │ │ Tabel Aktivitas     │ │
│    (bawah) │  └──────────────────┘ └────────────────────┘ │
└────────────┴──────────────────────────────────────────────┘
```

- Sidebar: lebar tetap ±260px, background `--navy-950`, logo + nama app di atas, menu item dengan ikon (lucide-react), item aktif = pill biru solid (`--brand-blue-600`) dengan teks putih & sudut membulat penuh (`rounded-full` atau `rounded-lg`), profil user di paling bawah sidebar dengan avatar bulat inisial.
- Topbar: background putih, berisi chip info (mis. nama sekolah, status "AI Engine: Aktif" dengan dot hijau), ikon notifikasi, avatar + nama + role user di kanan.
- Konten: padding besar (`32px`), background `--bg-app`.

---

## 4. Component Style

### Card Statistik (gradient, seperti "Total Pelanggan Diskor")
- Background: gradient diagonal `--gradient-card-start` → `--gradient-card-end`
- Rounded: `16px`
- Padding: `20-24px`
- Icon di kiri atas dalam lingkaran semi-transparan putih
- Badge kecil kanan atas (mis. `+12%`) dengan background putih transparan
- Label kecil uppercase, angka besar bold putih di bawahnya

### Card Konten Putih (tabel, grafik, list)
- Background: `--surface-card`
- Border: `1px solid --border-subtle`
- Rounded: `16px`
- Shadow: halus, `0 1px 3px rgba(0,0,0,0.04)`
- Header card: judul (16px/600) + deskripsi kecil abu-abu

### Badge Status
- Rounded penuh (`rounded-full`), padding horizontal `10-12px`, padding vertikal `4px`
- Dot kecil solid di kiri teks (warna sesuai status), teks warna sesuai token status di atas
- Contoh: `● Tepat Waktu` (hijau), `● Telat` (amber/merah)

### Tabel
- Header kolom: uppercase, `12px`, `--text-secondary`, background sedikit abu (`#FAFBFC`)
- Baris: hover background `#F8FAFC`
- Kolom aksi/link: warna `--brand-blue-600`, underline saat hover

### Tombol
- Primary: background `--brand-blue-600`, teks putih, rounded `10px`, hover → `--brand-blue-700`
- Secondary/outline (filter pill seperti "Semua Risiko"): border tipis, background putih, saat aktif → background `--brand-blue-600` + teks putih
- Ikon kalender/export: outline button dengan ikon lucide-react (`Calendar`, `Download`)

### Kalender / Month Picker (khusus fitur rekap kehadiran)
- Trigger: tombol outline dengan ikon kalender + label bulan terpilih (mis. "Juli 2026")
- Popover: grid 3x4 (12 bulan), bulan terpilih = background `--brand-blue-600` teks putih, navigasi tahun di atas grid dengan panah kiri/kanan

### Grafik (Recharts)
- Warna bar/line mengikuti token status: Tepat Waktu = `#15803D`/hijau solid, Telat = `#EF4444`/merah atau `#F59E0B`/amber
- Grid line tipis abu (`#EEF1F5`), tanpa border chart
- Tooltip: card putih kecil dengan shadow, rounded `8px`

---

## 5. Spacing & Radius Token

| Token | Value |
|---|---|
| `--radius-sm` | 8px |
| `--radius-md` | 12px |
| `--radius-lg` | 16px |
| `--space-card-gap` | 24px |
| `--space-section-gap` | 32px |

---

## 6. Tailwind Config Snippet (referensi cepat)

```js
// tailwind.config.js (extend.colors)
colors: {
  navy: { 950: '#0A1428', 900: '#0D1B33' },
  brand: { 600: '#2563EB', 700: '#1D4ED8', 100: '#DBEAFE' },
  status: {
    green: { bg: '#DCFCE7', text: '#15803D' },
    amber: { bg: '#FEF3C7', text: '#B45309' },
    red:   { bg: '#FEE2E2', text: '#B91C1C' },
    gray:  { bg: '#F1F5F9', text: '#475569' },
  }
}
```

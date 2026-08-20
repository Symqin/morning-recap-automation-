# Morning Recap Automation — WhatsApp ke Google Sheets

Dokumentasi arsitektur, cara kerja, dan panduan setup otomasi pencatatan laporan ruang rawat inap dari WhatsApp ke Google Sheets menggunakan **OpenWA** + **n8n**.

---

## 1. Ringkasan

Otomasi ini mencatat laporan kondisi ruang rawat inap yang dikirim via WhatsApp langsung ke Google Sheets secara otomatis dan real-time. Saat pengguna mengirim pesan dengan format laporan (format `Field: nilai`) ke nomor WhatsApp `morning-rekap`, pesan tersebut di-parse dan **di-update ke baris ruangan yang sesuai** di tab tanggal hari ini.

- Angka **BOR (%)** TIDAK dikirim manual — dihitung otomatis di Google Sheets (mis. `=(G7/F7)*100`).
- Satu pesan = data satu ruangan.

## 2. Komponen

| Komponen | Fungsi | Port | Container |
|----------|--------|------|-----------|
| **OpenWA** | Gateway WhatsApp API. Menerima pesan masuk dan meneruskannya ke webhook. | 2785 | `openwa-api` |
| **n8n** | Platform otomasi workflow. Menerima webhook, parse pesan, memanggil Google Sheets API. | 5678 | `morning-report-n8n` |
| **Google Sheets** | Tempat penyimpanan laporan (tab per tanggal). | - | - |
| **Google Cloud** | Aktifkan Google Sheets API + kredensial OAuth2 untuk n8n. | - | - |

## 3. Arsitektur & Alur Kerja

```
┌────────────┐   event message.received   ┌──────────────────────┐   Google Sheets API   ┌───────────────┐
│ WhatsApp   │ ────────────────────────► │  n8n (Webhook)        │ ────────────────────► │ Google Sheets │
│ (kirim     │                           │  :5678/webhook/       │                       │ (tab per      │
│  laporan)  │                           │  wa-to-sheet          │                       │  tanggal)     │
└────────────┘                           └───────────┬──────────┘                       └───────────────┘
                                                      │ alur:
                                                      ├─ 1. Parse & Hitung Tab
                                                      ├─ 2. Cek Daftar Tab (GET)
                                                      ├─ 3. Buat Tab jika belum ada (copy template + rename + clear)
                                                      ├─ 4. Baca Kolom Ruangan (kolom C)
                                                      ├─ 5. Cari Baris Ruangan
                                                      └─ 6. Update Nilai (PUT)
```

**Alur lengkap n8n (13 node):**
1. **Webhook WA** — menerima POST dari OpenWA.
2. **Parse & Hitung Tab** (Code) — meng-parse `Field: nilai` menjadi peta kolom; menghitung nama tab hari ini (format `19 AGUSTUS 2026`).
3. **Cek Daftar Tab** (HTTP GET) — membaca daftar tab dari Google Sheets API.
4. **Tentukan Tab** (Code) — mengecek apakah tab hari ini sudah ada; memilih template (tab tanggal terdekat).
5. **Tab Sudah Ada?** (If) —
   - **Ya** → langsung ke langkah 8 (baca kolom).
   - **Tidak** → buat tab baru dari template.
6. **Buat tab** (Copy Tab Template → Ekstrak SheetId → Rename Tab → Bersihkan Data Lama) — menyalin struktur template, menamai ulang sesuai tanggal hari ini, dan membersihkan data lama.
7. (kembali ke) **Baca Kolom Ruangan** — membaca kolom C (daftar nama ruangan) di tab tersebut.
8. **Cari Baris Ruangan** (Code) — mencari baris berdasarkan nama ruangan dari pesan.
9. **Ruangan Ditemukan?** (If) — hanya lanjut jika ruangan cocok.
10. **Update Nilai Ruangan** (HTTP PUT) — menulis data ke baris ruangan yang ditemukan.

## 4. Payload Webhook OpenWA

```json
{
  "event": "message.received",
  "timestamp": "2026-08-19T01:30:00.000Z",
  "sessionId": "2a095c3f-...",
  "data": {
    "id": "...",
    "from": "628xxx@g.us | @c.us",
    "to": "6285157602166@c.us",
    "chatId": "628xxx@g.us | 628xxx@c.us",
    "body": "RUANGAN: ICU\nKAPA SITAS TTO: 10\n...",
    "type": "text",
    "timestamp": 1787...,
    "fromMe": false,
    "isGroup": true | false,
    "author": "628xxx@c.us",
    "contact": { "pushName": "Nama Pengirim" }
  }
}
```

> OpenWA membungkus payload dalam `{ body: { ... } }` saat mengirim ke webhook n8n. Parser sudah menyesuaikan dengan struktur ini.

## 5. Format Pesan

**Satu pesan = satu ruangan.** Tiap baris format `NamaField: nilai`. Baris `RUANGAN` wajib ada di paling atas.

```
RUANGAN: ICU
KAPA SITAS TTO: 10
KAPA SITAS RIIL: 8
SISA AWAL: 2
ISI: 6
KOSONG: 2
BARU: 1
PINDAHAN: 0
PULANG: 2
KASUS MEDIKAL: 3
KASUS BEDAH: 2
KASUS OBGYN: 1
CARA BAYAR JKN: 5
CARA BAYAR TUNAI: 1
CARA BAYAR ASRNS: 1
LAMA RAWAT II: 3
LOS RS: 4
TOI: 1
RENCANA PULANG: 2
RUJUK: 1
PINDAH: 0
RENCANA PINDAH: 1
MNGL: 0
OPERASI ELEKTIF: 2
CITO: 1
POLI: 0
HD: 1
CRRT: 1
BC: 0
CATH LAB: 1
PENUNJANG: 1
ECHO: 1
USG: 0
ENDOSCOPY: 0
LAIN: 1
PESAN: pasien stabil
KETERANGAN: monitoring ketat
```

**Aturan:**
- Pemisah field menggunakan **titik dua (`:`)** — juga mendukung pipe `|` dan tab.
- Nama field **tidak case-sensitive** (mis. `ruangan`, `RUANGAN`, `Ruang` semuanya dikenali).
- Kolom yang tidak diisi dibiarkan kosong.
- Kolom **BOR (%)** tidak perlu dikirim (dihitung otomatis di sheet).
- Kirim dari **nomor lain** (atau di grup) ke nomor `morning-rekap` (`6285157602166`).

## 6. Pemetaan Kolom ke Google Sheets

Struktur tab tanggal: header bertingkat di **baris 4–6**, data ruangan mulai **baris 7**, nama ruang di **kolom C**.

| Field Pesan | Kolom Sheet |
|-------------|-------------|
| RUANGAN | C |
| KAPA SITAS TTO | D |
| KAPA SITAS RIIL | E |
| SISA AWAL | F |
| ISI | G |
| KOSONG | H |
| (BOR % — otomatis) | I |
| BARU | J |
| PINDAHAN | K |
| PULANG | L |
| KASUS MEDIKAL | M |
| KASUS BEDAH | N |
| KASUS OBGYN | O |
| CARA BAYAR JKN | P |
| CARA BAYAR TUNAI | Q |
| CARA BAYAR ASRNS | R |
| LAMA RAWAT II | S |
| LOS RS | T |
| TOI | U |
| RENCANA PULANG | V |
| RUJUK | W |
| PINDAH | X |
| RENCANA PINDAH | Y |
| MNGL | Z |
| OPERASI ELEKTIF | AB |
| CITO | AC |
| POLI | AD |
| HD | AE |
| CRRT | AF |
| BC | AG |
| CATH LAB | AH |
| PENUNJANG | AI |
| ECHO | AJ |
| USG | AK |
| ENDOSCOPY | AL |
| LAIN | AM |
| PESAN | AN |
| KETERANGAN | AO |

Lihat alias lengkap & logika di `parser.js`.

## 7. Cara Setup

### a. Persyaratan
- Docker Desktop (running), WSL.
- Akun Google (untuk Google Sheets + Google Cloud).

### b. Jalankan Container
OpenWA & n8n sudah berjalan (container `openwa-api` & `morning-report-n8n`). Pastikan aktif:
```
docker ps
```

### c. Koneksikan WhatsApp (scan QR)
1. Buka OpenWA dashboard: **http://localhost:2785**
2. Buka sesi `morning-rekap`, scan QR dengan HP.

### d. Setup Google (sekali)
1. **Aktifkan Google Sheets API** di Google Cloud Console:
   `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview`
2. Buat **OAuth client ID** (Web application), tambah redirect URI:
   `http://localhost:5678/rest/oauth2-credential/callback`
3. **Publish app** di OAuth consent screen (atau tambah email sebagai test user).
4. Di n8n, buat credential **Google Sheets OAuth2**, isi Client ID/Secret, login Google.

### e. Workflow n8n
1. Buka n8n: **http://localhost:5678**
2. Import workflow "WA ke Google Sheets (API Full)" (ID aktif).
3. Pastikan kredensial Google menempel di semua node HTTP (Cek Daftar Tab, Baca Kolom, Copy Tab, Rename, Bersihkan, Update).
4. Aktifkan workflow (toggle Active), webhook `/webhook/wa-to-sheet` jadi live.

### f. Webhook OpenWA
Webhook terdaftar pada sesi `morning-rekap`:
- **URL:** `http://host.docker.internal:5678/webhook/wa-to-sheet`
- **Event:** `message.received`
- **Filter:** tanpa filter (semua pesan grup & private diteruskan)

### g. Setelah Setup — Tes
Kirim pesan format laporan dari nomor lain ke `6285157602166` (atau di grup), lalu cek tab tanggal di Google Sheets.

## 8. Konfigurasi yang Dilakukan (Riwayat)

### a. Fix SSRF di `docker-compose.dev.yml`
OpenWA memblokir koneksi ke `host.docker.internal` oleh proteksi SSRF. Ditambahkan:
```yaml
- SSRF_ALLOWED_HOSTS=${SSRF_ALLOWED_HOSTS:-host.docker.internal}
```
Lalu container `openwa-api` di-recreate.

### b. Fix format kolom di parser
Kolom `KAPA SITAS TTO`, `KAPA SITAS RIIL`, `SISA AWAL` awalnya tidak terpetakan — sudah ditambahkan di `FIELD_TO_COLUMN` dan `ALIASES`.

### c. Nonaktifkan kolom BOR dari pesan
Kolom **BOR (%)** dihapus dari pemetaan — dihitung otomatis di Google Sheets.

## 9. File Terkait

| File | Lokasi |
|------|--------|
| Workflow n8n (aktif) | dibuat via MCP di n8n (ID workflow aktif) |
| Parser | `Documents/morning-recap-automation/parser.js` |
| Compose OpenWA | `Project-Code/morning-report/OpenWA/docker-compose.dev.yml` |
| Compose n8n | `Project-Code/morning-report/n8n/compose.yaml` |
| Dokumentasi ini | `Documents/morning-recap-automation/README.md` |
| Dokumentasi laporan | `Documents/morning-recap-automation/LAPORAN.md` |

## 10. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| **HTTP 403 Forbidden Google Sheets** | Aktifkan Google Sheets API di Google Cloud Console, lalu tunggu beberapa menit. |
| **Sesi WA `initializing`** | Ulangi scan QR di dashboard OpenWA (2785). |
| **Data tidak masuk** | Kirim dari **nomor lain** (bukan nomor sesi sendiri). Pesan ke diri sendiri dianggap `fromMe`. |
| **Kolom tetap kosong** | Pastikan format `Field: nilai` benar & nama field sesuai daftar. |
| **Webhook tidak terpanggil** | Pastikan workflow n8n aktif dan URL webhook benar. |
| **Tab tidak dibuat** | Pastikan ada tab tanggal lain sebagai template & kredensial menempel di node Copy/Rename. |
| **Error `Unable to parse range`** | Pastikan nama tab tanggal ada (sudah dibuat) sebelum update. |

## 11. Melanjutkan Sesi Chat

```
opencode -s ses_0004293a2ffeK3glVwTqPspCo7
```

opencode -s ses_fe282e252ffekM5nfGyKCjpsEO (home server)

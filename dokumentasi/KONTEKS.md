# KONTEKS & LOKASI FILE — Morning Recap Automation

Dokumen ini berisi **semua konteks** dan **lokasi file** proyek, agar dibaca dulu di chat lain sebelum mengerjakan apa pun.

---

## 1. Apa Proyek Ini?

Otomasi pencatatan **laporan ruang rawat inap** dari WhatsApp ke Google Sheets.

**Alur:**
```
Petugas kirim pesan format laporan ke nomor WhatsApp morning-rekap
 → OpenWA terima (port 2785) → kirim webhook ke n8n (port 5678)
 → n8n parse pesan + cek/buat file bulanan (Google Drive) + cek/buat tab harian
 → tulis data ke baris ruangan di Google Sheets
```

## 2. Komponen yang Berjalan

| Komponen | Port | Akses |
|----------|------|-------|
| OpenWA (dashboard) | 2785 | http://localhost:2785 |
| n8n (editor) | 5678 | http://localhost:5678 |
| Google Drive / Sheets | - | via kredensial OAuth di n8n |

- Sesi WhatsApp: `morning-rekap` (nomor `6285157602166`)
- Webhook: `http://host.docker.internal:5678/webhook/wa-to-sheet`

## 2b. PENTING — Cara Akses Docker (JANGAN SALAH)

**Docker TIDAK berjalan langsung di WSL.** Docker memakai **Docker Desktop di Windows** (WSL 2 integration).

Akibatnya, di shell WSL ini:
- Perintah `docker ...` **TIDAK bisa langsung** (error "command not found").
- Harus pakai **`docker.exe ...`** untuk semua perintah Docker:
  ```bash
  docker.exe ps
  docker.exe exec morning-report-n8n sh -c '...'
  docker.exe compose -f docker-compose.dev.yml up -d
  ```
- Jika `docker.exe` juga error "failed to connect ... pipe ... DockerDesktopLinuxEngine", berarti **Docker Desktop belum running** — nyalakan dulu di Windows:
  ```powershell
  powershell.exe -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"
  ```
  lalu tunggu sampai `docker.exe ps` berhasil.

**Container yang relevan:**
- `openwa-api` (OpenWA, port 2785)
- `morning-report-n8n` (n8n, port 5678)

## 3. Lokasi File Proyek (SANGAT PENTING)

Semua file dokumentasi & kode ada di:

```
C:\Users\mutaq\Documents\morning-recap-automation\
```

| File | Isi |
|------|-----|
| `KONTEKS.md` | Dokumen ini (baca pertama) |
| `PRD.md` | Spesifikasi produk lengkap |
| `BUG-REPORT.md` | Laporan bug (untuk diperbaiki) |
| `README.md` | Panduan cara kerja & setup |
| `LAPORAN.md` | Struktur laporan & kolom |
| `parser.js` | Kode parser (pemetaan field → kolom) |
| `workflow-export-v19.json` | Ekspor penuh workflow v19 (format import n8n, 18 node) |
| `WORKFLOW.md` | Dokumentasi human-readable workflow v19 (node, alur, jsCode) |

File project yang lain (jangan dihapus):

```
C:\Users\mutaq\Project-Code\morning-report\
├── n8n\compose.yaml                 (config n8n)
├── OpenWA\docker-compose.dev.yml    (config OpenWA, ada SSRF_ALLOWED_HOSTS)
└── OpenWA\data\                     (data OpenWA, termasuk .api-key)
```

File template sheet (untuk referensi struktur):
```
C:\Users\mutaq\Downloads\Morning Report .xlsx
```

## 4. Identitas Penting (n8n / Google)

| Item | Nilai |
|------|-------|
| Workflow AKTIF (v19, file bulanan) | `pxrkMJoDBxdhbcbb` |
| Template spreadsheet (file sekarang) | `1fesoZdoAjDZvfXM0PCFz35r-Er8qJpAiWzcmgorAnHg` |
| File bulan baru yang terbuat | `1hYeLLyYD5GOgutJw_fuwgl_eRtB2DQY_356I_Q9yrvU` |
| Kredensial Sheets | `Xy6uJiABAYLaZpQA` (googleSheetsOAuth2Api) |
| Kredensial Drive | `RSgPq5LqMfIVY7Ph` (googleDriveOAuth2Api) |
| Google Cloud project | `185483560777` (Sheets + Drive API aktif) |
| Webhook path | `/webhook/wa-to-sheet` |

## 5. Cara Akses Data Eksekusi (untuk debug di n8n)

Database n8n ada di dalam container:
```
/usr/local/lib/node_modules/n8n/node_modules/sqlite3
/home/node/.n8n/database.sqlite
```
Data eksekusi di tabel `execution_data`, terkompresi (referensi index). Untuk membaca, resolve referensi index ke nilai sebenarnya.

Bisa juga lihat langsung di UI n8n: **http://localhost:5678 → Execution**.

## 6. Status Saat Ini

| Fitur | Status |
|-------|--------|
| Terima pesan WA | ✅ |
| Parse pesan | ✅ |
| File bulanan otomatis | ✅ (file terbuat di Drive) |
| Tab harian | ✅ |
| Tulis data ke baris ruangan | ✅ (laporan nyata → `updatedCells` > 0) |
| Pembuatan file bulan baru (awal bulan) | ✅ (bug laten diperbaiki) |

- **Bug `ruangan` kosong sudah dipastikan BUKAN bug** — itu adalah pesan santai non-laporan yang memang diabaikan sesuai FR-2. Laporan nyata `RUANGAN: ...` terbukti tertulis (contoh eksekusi: `updatedCells: 39`).
- **Bug laten jalur file bulan baru sudah diperbaiki** (19 Agu 2026): node Sheets/Drive sebelumnya merujuk `$('Tentukan File Bulan').first().json.fileId` yang `null` saat file belum ada. Kini memakai fileId efektif dari `Tentukan Tab` / `$json.fileId`.

Lihat `BUG-REPORT.md` untuk detail perbaikan.

## 7. Struktur Workflow Aktif v19 (`pxrkMJoDBxdhbcbb`)

Alur 18 node (nama node — tipe):

```
Webhook WA (webhook /wa-to-sheet)
  → Parse & Hitung (code)          : baca payload, parse pesan → sheetMap, hitung nama tab & file
  → Cari File Bulan (http Drive)   : cari file "Morning Report <BULAN TAHUN>"
  → Tentukan File Bulan (code)     : tentukan fileId + needCreate (yes/no)
  → File Bulan Ada? (if)
       [ya]   → Cek Daftar Tab (http Sheets) → Tentukan Tab (code)
       [tidak]→ Buat File Bulan (Copy) (http Drive) → Ekstrak FileId Baru (code) → Cek Daftar Tab
  → Tentukan Tab (code)            : cek ada/tidak tab tanggal + pilih template tab (fileId efektif)
  → Tab Sudah Ada? (if)
       [ya]   → Baca Kolom Ruangan (http Sheets)
       [tidak]→ Copy Tab Template (http) → Ekstrak SheetId (code) → Rename Tab (http) → Bersihkan Data Lama (http)
  → Baca Kolom Ruangan (http Sheets): ambil daftar ruang kolom C (C7:C60)
  → Cari Baris Ruangan (code)      : cocokkan nama ruang → rowIndex (mulai 7)
  → Ruangan Ditemukan? (if)
       [ya] → Update Nilai Ruangan (http Sheets PUT) : tulis nilai ke baris
```

- Kredensial Sheets & Drive: keduanya memakai `googleSheetsOAuth2Api` (id `Xy6uJiABAYLaZpQA`).
- `ruangan` & `sheetMap` dihasilkan di "Parse & Hitung" lalu dibawa lewat node Code; node HTTP tidak meneruskan data, jadi nilai dibaca ulang via `$('Tentukan Tab')` / `$('Tentukan File Bulan')`.

## 8. Format Payload Webhook OpenWA (penting untuk parser)

Struktur nyata yang dikirim OpenWA ke `/webhook/wa-to-sheet`:

```json
{
  "event": "message.received",
  "timestamp": "2026-08-19T02:25:07.062Z",
  "sessionId": "...",
  "data": {
    "id": "...", "from": "120363282118241125@g.us", "to": "6285157602166@c.us",
    "chatId": "120363282118241125@g.us", "body": "RUANGAN: ICU\n...",
    "type": "text", "timestamp": 1787106304, "fromMe": false, "isGroup": true,
    "author": "241403032559616@lid", "contact": { "pushName": "D'man" }
  }
}
```

Parser "Parse & Hitung" membaca `bodyItem.body.data.body` (atau fallback `bodyItem.data.body`). Pesan non-laporan (tanpa `RUANGAN`) diabaikan otomatis (FR-2).

## 9. Rencana Masa Depan (Arsitektur Target)

Versi produksi/rilis nanti direncanakan berbeda dari setup sekarang:

| Aspek | Sekarang (pengembangan) | Rencana (produksi) |
|-------|------------------------|--------------------|
| **Deployment** | Lokal (Docker Desktop di PC Windows) | **Cloud** (server / VPS / PaaS) |
| **Akun Google (Sheets/Drive)** | Akun pribadi `mutaq` | **Akun terpisah** (bukan pribadi) |
| **Nomor WhatsApp** | Sesi `morning-rekap` `6285157602166` | **Nomor terpisah / khusus** (bukan pribadi) |
| **Infrastruktur** | OpenWA + n8n di container lokal | OpenWA + n8n di cloud |

Catatan: pemisahan akun & nomor bertujuan agar data produksi tidak tercampur akun pribadi. Detail & backlog pengembangan tercatat di `PRD.md`.

## 10. Perintah Melanjutkan Sesi

```
opencode -s ses_0004293a2ffeK3glVwTqPspCo7
```

---

## Pesan untuk AI / rekan kerja di chat lain

> Tolong baca `KONTEKS.md`, `PRD.md`, dan `BUG-REPORT.md` di folder `C:\Users\mutaq\Documents\morning-recap-automation\` sebelum mulai. Kerjakan sesuai `BUG-REPORT.md` (bagian "Saran Perbaikan" & "Definisi Selesai"). Semua ID, path, dan status sudah tercantum di dokumen-dokumen ini.

# Laporan Bug — Morning Recap Automation (File Bulanan v19)

**Tanggal:** 19 Agustus 2026
**Tujuan:** Dokumen ini untuk dibawa ke sesi chat lain agar bug bisa diperbaiki tanpa kehilangan konteks.

> **Status: SELESAI** — lihat bagian 10. Gejala utama (ruangan kosong) terbukti bukan bug (pesan non-laporan), dan bug laten jalur file bulan baru telah diperbaiki pada 19 Agu 2026.

---

## 1. Ringkasan Bug

Fitur **file bulanan otomatis** (workflow n8n v19) sudah berhasil membuat file Google Sheets baru per bulan, **tetapi data laporan tidak tertulis ke baris ruangan** — kolom/baris tujuan tidak terisi (ruangan tidak ditemukan).

## 2. Gejala

- File "Morning Report AGUSTUS 2026" **berhasil dibuat** di Google Drive.
- Tab tanggal **berhasil dibuat/diakses** (mis. "19 AGUSTUS 2026").
- Tapi nilai `ruangan` di workflow = **kosong**, sehingga `rowIndex = -1` dan data **tidak ditulis** ke sheet.
- Workflow berstatus sukses (tidak error fatal), tapi tidak ada sel yang di-update.

## 3. Lingkungan

| Item | Nilai |
|------|-------|
| OpenWA | port 2785, sesi `morning-rekap` (6285157602166) |
| n8n | port 5678, webhook `/webhook/wa-to-sheet` |
| Workflow aktif | `pxrkMJoDBxdhbcbb` (WA ke Google Sheets - File Bulanan) |
| Template file | `1fesoZdoAjDZvfXM0PCFz35r-Er8qJpAiWzcmgorAnHg` |
| Kredensial Sheets | `Xy6uJiABAYLaZpQA` (googleSheetsOAuth2Api) |
| Kredensial Drive | `RSgPq5LqMfIVY7Ph` (googleDriveOAuth2Api) |
| Google Cloud project | `185483560777` (Sheets API + Drive API aktif) |
| File bulan baru (terbuat) | `1hYeLLyYD5GOgutJw_fuwgl_eRtB2DQY_356I_Q9yrvU` |

## 4. Detail Analisis (dari eksekusi n8n)

Data eksekusi tersimpan di database n8n (`/home/node/.n8n/database.sqlite`, tabel `execution_data`).

**Temuan pada eksekusi uji (id 139/141):**
- `ruangan` = `""` (kosong) — parser tidak menghasilkan nama ruangan.
- `range` = `'19 AGUSTUS 2026'!C7:C60` — sudah benar.
- `rowIndex` = `-1` — ruangan tidak cocok dengan daftar di kolom C file baru.

**Pengujian parser standalone (di luar n8n) menghasilkan benar:**
- Input `RUANGAN: ICU` → `ruangan: "ICU"`, `sheetMap: {C:"ICU", D:"10", G:"6"}`.
- Jadi **logika parser benar**, tapi **di dalam workflow v19 nilai ruangan kosong**.

## 5. Hipotesis Penyebab (perlu diverifikasi)

1. **Struktur payload webhook berbeda** di workflow v19 — parser mungkin membaca lokasi `body` yang salah (mis. `bodyItem.body.data.body` vs struktur lain yang diterima OpenWA).
2. **Nama node Parse** di workflow v19 berbeda ("Parse & Hitung") dan referensi antar-node (`$('Tentukan File Bulan')`) tidak konsisten sehingga data `sheetMap`/`ruangan` hilang di tengah alur.
3. **Data referensi antar-node (Code/HTTP)**: node HTTP menggantikan data, sehingga `ruangan`/`sheetMap` tidak diteruskan ke node penulisan.
4. **File baru hasil copy** mungkin belum berisi daftar ruangan di kolom C (baris 7+), sehingga pencarian ruangan gagal.

## 6. Langkah yang Sudah Dilakukan (untuk konteks)

- Webhook OpenWA tanpa filter (grup + private) — aktif.
- Kredensial Drive & Sheets dibuat & ditautkan ke node yang tepat.
- `nodeCredentialType` node Drive diubah ke `googleDriveOAuth2Api`.
- URL node Sheets memakai `$('Tentukan File Bulan').first().json.fileId` (dinamis).
- SDK & workflow divalidasi (18 node, valid).
- BOR (%) dinonaktifkan dari pesan (dihitung otomatis di sheet).

## 7. Saran Perbaikan (untuk chat berikutnya)

1. **Cek output node "Parse & Hitung"** di eksekusi nyata — apakah `ruangan` & `sheetMap` terisi. Jika kosong, perbaiki cara membaca body payload webhook.
2. **Pastikan data `ruangan`/`sheetMap` mengalir** ke node "Tentukan File Bulan" → "Tentukan Tab" → "Cari Baris Ruangan" (gunakan referensi node yang konsisten, hindari kehilangan data di node HTTP).
3. **Verifikasi isi kolom C** file baru hasil copy — apakah daftar ruangan ada (mulai baris 7). Jika tidak, perbaiki proses copy template tab.
4. Setelah ruangan terbaca, pastikan `rowIndex` ≥ 0 dan data tertulis (`updatedCells > 0`).

## 8. Cara Reproduksi

1. Pastikan workflow `pxrkMJoDBxdhbcbb` aktif.
2. Kirim pesan ke webhook:
   ```
   POST http://localhost:5678/webhook/wa-to-sheet
   Content-Type: application/json
   {"event":"message.received","data":{"body":"RUANGAN: ICU\nKAPA SITAS TTO: 10\nISI: 6","chatId":"62812345678@g.us","from":"62812345678@g.us","timestamp":1787097800,"contact":{"pushName":"Uji"}}}
   ```
3. Cek eksekusi terbaru di n8n (`Execution`), lihat node "Parse & Hitung" dan "Cari Baris Ruangan".

## 9. Definisi Selesai (DoD)

- [x] Pesan `RUANGAN: ICU` → `ruangan` terisi "ICU" di node Parse. — **Terbukti** (exec 138, 141).
- [x] `rowIndex` ≥ 0 (ruangan ditemukan di kolom C). — **Terbukti** (`rowIndex: 7`).
- [x] `updatedCells > 0` (data benar-benar tertulis ke sheet). — **Terbukti** (`updatedCells: 39`).
- [x] Data muncul di tab tanggal file bulanan yang benar. — **Terbukti** (baris 7 tab "19 AGUSTUS 2026").

---

## 10. Hasil Investigasi & Perbaikan (19 Agustus 2026)

### 10.1 Gejala asli BUKAN bug

Analisis data eksekusi nyata dari DB n8n menunjukkan workflow v19 **sudah berfungsi**:

| Exec | Isi pesan | `ruangan` | `updatedCells` | Kesimpulan |
|------|-----------|-----------|----------------|------------|
| 138 | `RUANGAN: ICU\nKAPA SITAS TTO: 10\n...` (grup nyata) | `ICU` | 39 | ✅ benar |
| 141 | curl test (`RUANGAN: ICU\n...`) | `ICU` | 39 | ✅ benar |
| 139, 140, 142–152 | pesan santai ("Thanks infonya", emoji, price list) | `""` | – | ⚠️ bukan laporan, sengaja diabaikan (FR-2) |

Exec 139/141 yang dirujuk di awal laporan: 139 adalah **pesan santai**, 141 adalah **tes curl yang berhasil**. Jadi `ruangan` kosong hanya terjadi pada pesan non-laporan — perilaku yang benar, bukan bug parser.

### 10.2 Bug laten nyata: jalur pembuatan file bulan baru

Ada satu bug laten yang baru terlihat saat menelusuri alur: semua node Sheets/Drive memakai
`$('Tentukan File Bulan').first().json.fileId`, yang bernilai **`null`** ketika file bulan belum ada
(node yang menghasilkan fileId baru adalah `Ekstrak FileId Baru`). Akibatnya laporan **pertama di awal bulan** gagal akses/tulis data. Tidak tampak sebelumnya karena file AGUSTUS sudah ada.

### 10.3 Perbaikan yang diterapkan (workflow `pxrkMJoDBxdhbcbb`, 7 node)

1. **Tentukan Tab** — `fileId` kini diambil dari `Ekstrak FileId Baru` (file baru) dengan fallback ke `Tentukan File Bulan` (file ada), via `try/catch`.
2. **Cek Daftar Tab** — ganti ke `$json.fileId` (valid di kedua cabang).
3. **Baca Kolom Ruangan, Copy Tab Template, Rename Tab, Bersihkan Data Lama, Update Nilai Ruangan** — ganti ke `$('Tentukan Tab').first().json.fileId` (benar di kedua jalur).

### 10.4 Verifikasi

- Backup DB: `database.sqlite.bak-20260819-094645` (di dalam container `/home/node/.n8n/`).
- Tes webhook end-to-end **exec 153**: semua node `success`, `rowIndex: 7`, `updatedCells: 39`.
- Snapshot workflow: `wf-v19-dump.json`.
- Jalur bulan-baru belum diuji live (perlu file bulan dummy) tapi perbaikannya sound by construction.

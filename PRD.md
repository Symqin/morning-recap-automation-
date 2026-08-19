# PRD — Morning Recap Automation (WhatsApp → Google Sheets)

**Versi:** 1.0
**Tanggal:** 19 Agustus 2026
**Status:** Implementasi aktif (workflow n8n v19)

---

## 1. Ringkasan Produk

Otomasi pencatatan **laporan ruang rawat inap** dari WhatsApp ke Google Sheets. Petugas mengirim pesan berformat laporan ke nomor WhatsApp `morning-rekap`, sistem mem-parse dan menulis data ke baris ruangan yang sesuai di Google Sheets — otomatis dan real-time.

## 2. Tujuan & Manfaat

- Menghilangkan input manual ganda ke spreadsheet.
- Data laporan ruang masuk langsung ke sheet tanpa jeda.
- **File baru otomatis dibuat setiap bulan** (tidak perlu buat file manual).
- Menjaga konsistensi format laporan.

## 3. Pengguna

- Petugas ruang rawat inap (pengirim laporan via WhatsApp).
- Admin / manajemen rumah sakit (pembaca sheet).

## 4. Alur Kerja (End-to-End)

```
1. Petugas kirim pesan format laporan ke nomor morning-rekap (dari nomor lain/grup)
2. OpenWA menerima event message.received
3. OpenWA kirim webhook ke n8n (/webhook/wa-to-sheet)
4. n8n parse pesan → hitung nama tab & nama file bulan
5. n8n cek file "Morning Report <BULAN TAHUN>" di Google Drive
   - belum ada → buat file baru (copy dari template) + rename
6. n8n cek tab tanggal hari ini di file tersebut
   - belum ada → buat tab (copy dari template tab + rename + bersihkan)
7. n8n cari baris ruangan (kolom C)
8. n8n tulis data ke baris ruangan tersebut
```

## 5. Persyaratan Fungsional

### 5.1 Penerimaan Pesan
| ID | Kebutuhan |
|----|-----------|
| FR-1 | Menerima pesan format laporan dari WhatsApp (private & grup). |
| FR-2 | Mengabaikan pesan non-laporan (tanpa error). |
| FR-3 | Kirim dari **nomor lain** (bukan nomor sesi sendiri). |

### 5.2 Parsing Pesan
| ID | Kebutuhan |
|----|-----------|
| FR-4 | Format satu field per baris: `NamaField: nilai`. |
| FR-5 | Mendukung pemisah `:`, `|`, dan tab. |
| FR-6 | Nama field tidak case-sensitive. |
| FR-7 | Baris `RUANGAN` wajib (menentukan baris tujuan). |
| FR-8 | Kolom yang tidak diisi dibiarkan kosong. |
| FR-9 | Kolom **BOR (%)** dihitung otomatis di sheet (tidak dikirim manual). |

### 5.3 File Bulanan Otomatis
| ID | Kebutuhan |
|----|-----------|
| FR-10 | Nama file: `Morning Report <BULAN TAHUN>` (mis. "Morning Report AGUSTUS 2026"). |
| FR-11 | Jika file bulan belum ada, buat dari template (copy) + rename. |
| FR-12 | Jika sudah ada, langsung gunakan file tersebut. |

### 5.4 Tab Harian
| ID | Kebutuhan |
|----|-----------|
| FR-13 | Nama tab: `tanggal BULAN tahun` (mis. "19 AGUSTUS 2026"). |
| FR-14 | Jika tab belum ada, buat dari template tab + rename + bersihkan data. |

### 5.5 Penulisan Data
| ID | Kebutuhan |
|----|-----------|
| FR-15 | Cari baris ruangan berdasarkan nama di kolom C. |
| FR-16 | Tulis data ke baris ruangan yang sesuai. |

## 6. Struktur File & Tab

- **File Google Sheets** = 1 file per bulan (`Morning Report <BULAN TAHUN>`).
- **Tab** = 1 tab per tanggal (format `19 AGUSTUS 2026`).
- **Header** di baris 4–6 (bertingkat).
- **Data ruangan** mulai baris 7, nama ruang di kolom C.

## 7. Pemetaan Kolom

| Field Pesan | Kolom Sheet |
|-------------|-------------|
| RUANGAN | C |
| KAPA SITAS TTO | D |
| KAPA SITAS RIIL | E |
| SISA AWAL | F |
| ISI | G |
| KOSONG | H |
| BOR (%) — otomatis | I |
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

## 8. Format Pesan Contoh

```
RUANGAN: ICU
KAPA SITAS TTO: 10
KAPA SITAS RIIL: 8
SISA AWAL: 2
ISI: 6
KOSONG: 2
BARU: 1
PULANG: 2
KASUS MEDIKAL: 3
CARA BAYAR JKN: 4
PESAN: pasien stabil
```

## 9. Teknologi & Komponen

| Komponen | Peran | Port |
|----------|-------|------|
| OpenWA | Gateway WhatsApp API | 2785 |
| n8n | Otomasi workflow (parse, Drive, Sheets) | 5678 |
| Google Drive API | Cari & buat file bulanan | - |
| Google Sheets API | Baca/tulis tab & data | - |

## 10. Persyaratan Non-Fungsional

| ID | Kebutuhan |
|----|-----------|
| NFR-1 | Berjalan real-time (webhook). |
| NFR-2 | Aman (API key OpenWA, OAuth Google). |
| NFR-3 | Idempoten (pesan sama tidak menduplikasi baris, hanya update baris ruangan). |
| NFR-4 | Tahan terhadap pesan non-laporan. |

## 11. Batasan & Catatan

- Kirim laporan **dari nomor lain**, bukan dari nomor sesi morning-rekap (pesan ke diri sendiri dianggap `fromMe`).
- BOR (%) tidak dikirim manual — dihitung otomatis di sheet.
- Membutuhkan kredensial Google: Sheets OAuth2 + Drive OAuth2 (satu client ID/secret).
- Google Drive API & Sheets API harus aktif di Google Cloud Console.

## 12. Status Implementasi

| Fitur | Status |
|-------|--------|
| Penerimaan pesan WA | ✅ Berfungsi |
| Parsing pesan | ✅ Berfungsi |
| File bulanan otomatis | ✅ Dibuat (Drive) |
| Tab harian | ✅ Dibuat |
| Penulisan data per ruangan | ✅ Berfungsi (laporan nyata → `updatedCells` > 0) |
| BOR otomatis | ✅ |
| Buat file bulan baru (awal bulan) | ✅ Bug laten diperbaiki (19 Agu 2026) |

## 13. Setup Ringkas

1. Jalankan container OpenWA + n8n.
2. Scan QR sesi `morning-rekap` (OpenWA :2785).
3. Aktifkan Google Sheets API & Drive API di Google Cloud.
4. Buat OAuth client + kredensial Sheets & Drive di n8n.
5. Import/aktifkan workflow n8n (webhook `/webhook/wa-to-sheet`).
6. Webhook OpenWA → n8n terdaftar (tanpa filter).

## 14. Pertanyaan Terbuka / Backlog

- [x] Penyelarasan data ruangan pada file baru (baris 7 dst di file bulanan) — **selesai** (bug laten jalur bulan baru diperbaiki 19 Agu 2026).
- [ ] Notifikasi/auto-reply jika format salah.
- [ ] Backup otomatis file bulanan.

## 15. Backlog Rilis Produksi (arsitektur target)

Rencana untuk versi produksi (rilis), berbeda dari setup pengembangan saat ini:

| Item | Deskripsi | Status |
|------|-----------|--------|
| **Deploy di cloud** | Migrasi dari lokal (Docker Desktop di PC Windows) ke cloud (VPS / server / PaaS), OpenWA + n8n berjalan di cloud. | 🔲 Belum |
| **Akun Google terpisah** | Gunakan akun (Sheets/Drive) **khusus**, bukan akun pribadi `mutaq`, agar data produksi terpisah & tidak tercampur data pribadi. | 🔲 Belum |
| **Nomor WhatsApp terpisah** | Gunakan **nomor khusus** untuk sesi `morning-rekap`, bukan nomor pribadi (`6285157602166`). | 🔲 Belum |
| **Kredensial & identitas baru** | Buat ulang OAuth client, kredensial Sheets/Drive, dan workflow untuk akun/nomor baru setelah migrasi. | 🔲 Belum |

Catatan: pemisahan akun & nomor bertujuan memastikan data laporan produksi tidak tercampur akun/nomor pribadi. Detail konteks saat ini ada di `KONTEKS.md`.

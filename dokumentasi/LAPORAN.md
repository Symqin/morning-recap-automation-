# Dokumentasi Laporan Rawat Inap (Morning Recap)

Dokumentasi struktur laporan ruang rawat inap yang dicatat melalui otomasi WhatsApp → Google Sheets.

---

## 1. Ringkasan

Laporan ini mencatat kondisi **ruang rawat inap** secara periodik: kapasitas tempat tidur, jumlah pasien (isi/kosong), pendapatan angka BOR, pergerakan pasien (baru, pulang, pindah, rujuk), rencana pulang, tindakan medis (operasi, HD, CRRT, dll), penunjang (radiologi, ECHO, USG), serta cara bayar pasien (JKN, tunai, Asuransi).

Pengguna mengirim pesan dengan **format laporan** (format `Field: nilai`) ke nomor WhatsApp `morning-rekap`, lalu n8n mem-parse dan **meng-update baris ruangan yang sesuai** di tab tanggal hari ini.

## 2. Struktur Kolom Laporan

Laporan tersusun atas kelompok kolom berikut (di Google Sheets, header bertingkat di baris 4–6, data mulai baris 7):

### a. Identitas & Kapasitas Ruangan
| Kolom | Kolom Sheet | Deskripsi |
|-------|-------------|-----------|
| **RUANGAN** | C | Nama ruang rawat inap (mis. ICU, PICU) |
| **KAPA SITAS TTO** | D | Kapasitas Tempat Tidur Operasional |
| **KAPA SITAS RIIL** | E | Kapasitas tempat tidur yang benar-benar tersedia |
| **SISA AWAL** | F | Sisa tempat tidur kosong di awal periode |
| **ISI** | G | Jumlah pasien terisi |
| **KOSONG** | H | Jumlah tempat tidur kosong |
| **BOR (%)** | I | Bed Occupancy Rate — **dihitung otomatis di sheet**, tidak dikirim manual |

### b. Pergerakan Pasien
| Kolom | Kolom Sheet | Deskripsi |
|-------|-------------|-----------|
| **BARU** | J | Pasien masuk baru |
| **PINDAHAN** | K | Pasien pindahan dari ruang lain |
| **PULANG** | L | Pasien pulang |
| **KASUS MEDIKAL** | M | Pasien kasus medikal |
| **KASUS BEDAH** | N | Pasien kasus bedah |
| **KASUS OBGYN** | O | Pasien kasus kebidanan & kandungan |
| **LAMA RAWAT II** | S | Pasien lama rawat (tingkat II) |
| **LOS RS** | T | Length of Stay — rata-rata lama hari rawat |
| **TOI** | U | Turn Over Interval |
| **RENCANA PULANG** | V | Rencana pasien pulang |
| **RUJUK** | W | Pasien dirujuk |
| **PINDAH** | X | Pasien pindah ruang |
| **RENCANA PINDAH** | Y | Rencana pasien pindah ruang |
| **MNGL** | Z | Manglai (pergi tanpa izin) |

### c. Cara Bayar
| Kolom | Kolom Sheet | Deskripsi |
|-------|-------------|-----------|
| **CARA BAYAR JKN** | P | Pasien dengan jaminan JKN/BPJS |
| **CARA BAYAR TUNAI** | Q | Pasien bayar tunai |
| **CARA BAYAR ASRNS** | R | Pasien dengan asuransi |

### d. Tindakan / Operasi
| Kolom | Kolom Sheet | Deskripsi |
|-------|-------------|-----------|
| **OPERASI ELEKTIF** | AB | Operasi terjadwal |
| **CITO** | AC | Operasi segera (emergency) |
| **POLI** | AD | Operasi/tindakan poli |
| **HD** | AE | Hemodialisis (cuci darah) |
| **CRRT** | AF | Continuous Renal Replacement Therapy |
| **BC** | AG | Tindakan tertentu |
| **CATH LAB** | AH | Laboratorium kateterisasi jantung |

### e. Penunjang Diagnostik
| Kolom | Kolom Sheet | Deskripsi |
|-------|-------------|-----------|
| **PENUNJANG** | AI | Penunjang (radiologi/thorax/CT/MRI) |
| **ECHO** | AJ | Echocardiography |
| **USG** | AK | Ultrasonografi |
| **ENDOSCOPY** | AL | Endoskopi |
| **LAIN** | AM | Penunjang lain |

### f. Catatan
| Kolom | Kolom Sheet | Deskripsi |
|-------|-------------|-----------|
| **PESAN** | AN | Catatan tambahan dalam pesan |
| **KETERANGAN** | AO | Keterangan umum |

## 3. Format Pesan yang Diterima

Pesan harus berupa **satu field per baris**, pemisah **titik dua (`:`)**, pipe (`|`), atau tab. Baris `RUANGAN` wajib:

```
RUANGAN: ICU
KAPA SITAS TTO: 10
KAPA SITAS RIIL: 8
SISA AWAL: 2
ISI: 6
KOSONG: 2
BARU: 1
PULANG: 2
```

> **Catatan:** Kolom BOR (%) **tidak** perlu dikirim — dihitung otomatis di Google Sheets. Nama field tidak case-sensitive.

## 4. Cara Pengisian ke Google Sheets

1. Pengguna mengirim pesan format laporan ke nomor `morning-rekap` (dari nomor lain / grup).
2. OpenWA meneruskan event `message.received` ke n8n.
3. n8n meng-parse pesan & menghitung nama tab hari ini (format `19 AGUSTUS 2026`).
4. Jika tab belum ada, n8n membuatnya dari template.
5. n8n mencari baris ruangan (kolom C) lalu **menulis data ke baris tersebut**.
6. Kolom yang tidak ada datanya dibiarkan kosong.

## 5. Alias Kata Kunci (parser.js)

Kolom mengenali beberapa variasi penulisan, contoh:

- `ruangan` ← ruangan, ruang, kamar, room
- `kapa sitas tto` ← kapa sitas tto, kapasitas tto, tto, kapasitas
- `kapa sitas riil` ← kapa sitas riil, kapasitas riil, riil
- `cara bayar jkn` ← cara bayar jkn, jkn
- `cath lab` ← cath lab, cath
- `mnngl` ← mnngl, mnl

Daftar lengkap ada di `ALIASES` dalam `parser.js`.

## 6. File Terkait

| File | Lokasi |
|------|--------|
| Kode parser (pemetaan & alias) | `Documents/morning-recap-automation/parser.js` |
| Dokumentasi arsitektur & setup | `Documents/morning-recap-automation/README.md` |
| Dokumentasi laporan ini | `Documents/morning-recap-automation/LAPORAN.md` |

## 7. Melanjutkan Sesi Chat

```
opencode -s ses_0004293a2ffeK3glVwTqPspCo7
```
opencode -s ses_fe81b7d2bffe39nMWL7AruWcV2 (new)
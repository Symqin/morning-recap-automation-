/**
 * morning-recap-automation — Parser pesan WhatsApp (satu ruangan) → Google Sheets
 *
 * Format pesan: satu "Field: nilai" per baris.
 *   RUANGAN: ICU
 *   KAPA SITAS TTO: 10
 *   KAPA SITAS RIIL: 8
 *   SISA AWAL: 2
 *   ISI: 6
 *   KOSONG: 2
 *   ...
 *
 * Pemetaan berdasarkan struktur tab tanggal di "Morning Report .xlsx"
 * (header bertingkat di baris 4-6, data ruangan mulai baris 7, nama ruang di kolom C).
 *
 * Pemakaian:
 *   node parser.js             -> contoh uji
 *   const { parseMessage } = require('./parser.js');
 */

/**
 * Pemetaan nama field pesan -> posisi kolom (huruf) di Google Sheets.
 * Kolom diambil dari header sheet (baris 4-6).
 *
 * CATATAN: kolom BOR (%) (kolom I) sengaja TIDAK dipetakan karena dihitung otomatis
 * di Google Sheets — sehingga tidak perlu dikirim dari pesan WhatsApp.
 */
const FIELD_TO_COLUMN = {
  RUANGAN: 'C',
  'KAPA SITAS TTO': 'D',
  'KAPA SITAS RIIL': 'E',
  'SISA AWAL': 'F',
  ISI: 'G',
  KOSONG: 'H',
  BARU: 'J',
  PINDAHAN: 'K',
  PULANG: 'L',
  'KASUS MEDIKAL': 'M',
  'KASUS BEDAH': 'N',
  'KASUS OBGYN': 'O',
  'CARA BAYAR JKN': 'P',
  'CARA BAYAR TUNAI': 'Q',
  'CARA BAYAR ASRNS': 'R',
  'LAMA RAWAT II': 'S',
  'LOS RS': 'T',
  TOI: 'U',
  'RENCANA PULANG': 'V',
  RUJUK: 'W',
  PINDAH: 'X',
  'RENCANA PINDAH': 'Y',
  MNGL: 'Z',
  'OPERASI ELEKTIF': 'AB',
  CITO: 'AC',
  POLI: 'AD',
  HD: 'AE',
  CRRT: 'AF',
  BC: 'AG',
  'CATH LAB': 'AH',
  PENUNJANG: 'AI',
  ECHO: 'AJ',
  USG: 'AK',
  ENDOSCOPY: 'AL',
  LAIN: 'AM',
  PESAN: 'AN',
  KETERANGAN: 'AO',
};

/** Alias fleksibel: variasi penulisan -> nama field baku. */
const ALIASES = {
  ruangan: 'RUANGAN',
  ruang: 'RUANGAN',
  kamar: 'RUANGAN',
  'kapa sitas tto': 'KAPA SITAS TTO',
  'kapasitas tto': 'KAPA SITAS TTO',
  tto: 'KAPA SITAS TTO',
  kapasitas: 'KAPA SITAS TTO',
  'kapa sitas riil': 'KAPA SITAS RIIL',
  'kapasitas riil': 'KAPA SITAS RIIL',
  riil: 'KAPA SITAS RIIL',
  'sisa awal': 'SISA AWAL',
  sisa: 'SISA AWAL',
  isi: 'ISI',
  kosong: 'KOSONG',
  baru: 'BARU',
  pindahan: 'PINDAHAN',
  pulang: 'PULANG',
  'kasus medikal': 'KASUS MEDIKAL',
  medikal: 'KASUS MEDIKAL',
  'kasus bedah': 'KASUS BEDAH',
  bedah: 'KASUS BEDAH',
  'kasus obgyn': 'KASUS OBGYN',
  obgyn: 'KASUS OBGYN',
  'cara bayar jkn': 'CARA BAYAR JKN',
  jkn: 'CARA BAYAR JKN',
  'cara bayar tunai': 'CARA BAYAR TUNAI',
  tunai: 'CARA BAYAR TUNAI',
  'cara bayar asrns': 'CARA BAYAR ASRNS',
  asrns: 'CARA BAYAR ASRNS',
  'lama rawat ii': 'LAMA RAWAT II',
  'lama rawat': 'LAMA RAWAT II',
  'los rs': 'LOS RS',
  los: 'LOS RS',
  toi: 'TOI',
  'rencana pulang': 'RENCANA PULANG',
  rujuk: 'RUJUK',
  pindah: 'PINDAH',
  'rencana pindah': 'RENCANA PINDAH',
  mnngl: 'MNGL',
  mnl: 'MNGL',
  'operasi elektif': 'OPERASI ELEKTIF',
  operasi: 'OPERASI ELEKTIF',
  elektif: 'OPERASI ELEKTIF',
  cito: 'CITO',
  poli: 'POLI',
  hd: 'HD',
  crrt: 'CRRT',
  bc: 'BC',
  'cath lab': 'CATH LAB',
  cath: 'CATH LAB',
  penunjang: 'PENUNJANG',
  echo: 'ECHO',
  usg: 'USG',
  endoscopy: 'ENDOSCOPY',
  endoskopi: 'ENDOSCOPY',
  lain: 'LAIN',
  lainnya: 'LAIN',
  pesan: 'PESAN',
  catatan: 'PESAN',
  keterangan: 'KETERANGAN',
  ket: 'KETERANGAN',
};

/** Bulan Indonesia untuk nama tab tanggal. */
const MONTHS = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

/**
 * Nama tab untuk tanggal tertentu, mengikuti pola sheet: "31 JULI 2026".
 * @param {Date} d
 * @returns {string}
 */
function tabName(d) {
  const date = d || new Date();
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Parse teks pesan menjadi objek { namaField: nilai } (hanya field yang dikenali).
 * Mendukung "Field: nilai", "Field | nilai", dan "Field<TAB>nilai" per baris.
 *
 * @param {string} text
 * @returns {Object}
 */
function parseMessage(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    const m = line.match(/^\s*([^:|\t]+?)\s*[:|\t]\s*(.*)$/);
    if (m) {
      const rawKey = m[1].trim().toLowerCase();
      const val = m[2].trim();
      if (!val) continue;
      const canonical = ALIASES[rawKey] || rawKey;
      if (canonical && FIELD_TO_COLUMN[canonical]) {
        out[canonical] = val;
      }
    }
  }
  return out;
}

/**
 * Konversi output parse ke peta { kolomLetter: nilai } untuk ditulis ke Google Sheets.
 * @param {Object} parsed - hasil parseMessage
 * @returns {Object} { C: 'ICU', D: '10', G: '6', ... }
 */
function toSheetMap(parsed) {
  const map = {};
  for (const [field, val] of Object.entries(parsed)) {
    const col = FIELD_TO_COLUMN[field];
    if (col) map[col] = val;
  }
  return map;
}

module.exports = { parseMessage, tabName, toSheetMap, FIELD_TO_COLUMN, ALIASES, MONTHS };

// Uji CLI: node parser.js
if (require.main === module) {
  const sample = [
    'RUANGAN: ICU',
    'KAPA SITAS TTO: 10',
    'KAPA SITAS RIIL: 8',
    'SISA AWAL: 2',
    'ISI: 6',
    'KOSONG: 2',
    'BARU: 1',
    'PULANG: 2',
    'KASUS MEDIKAL: 3',
    'CARA BAYAR JKN: 4',
    'CRRT: 1',
  ].join('\n');
  const parsed = parseMessage(sample);
  console.log('TAB:', tabName(new Date(2026, 6, 31)));
  console.log('PARSED:', JSON.stringify(parsed, null, 2));
  console.log('SHEET MAP:', JSON.stringify(toSheetMap(parsed)));
}

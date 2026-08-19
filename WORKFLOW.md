# Dokumentasi Workflow n8n — "WA ke Google Sheets (File Bulanan)"

> Diekspor dari n8n (DB) pada 19 Agustus 2026. File import: `workflow-export-v19.json`.

- **ID Workflow:** `pxrkMJoDBxdhbcbb`
- **Status aktif:** True
- **Jumlah node:** 18
- **Webhook path:** `/webhook/wa-to-sheet`
- **executionOrder:** v1

## Daftar Node

| # | Nama | Tipe | Keterangan |
|---|------|------|------------|
| 1 | Webhook WA | Webhook | |
| 2 | Parse & Hitung | Code | |
| 3 | Cari File Bulan | HTTP Request | |
| 4 | Tentukan File Bulan | Code | |
| 5 | File Bulan Ada? | IF | |
| 6 | Cek Daftar Tab | HTTP Request | |
| 7 | Buat File Bulan (Copy) | HTTP Request | |
| 8 | Ekstrak FileId Baru | Code | |
| 9 | Tentukan Tab | Code | |
| 10 | Tab Sudah Ada? | IF | |
| 11 | Baca Kolom Ruangan | HTTP Request | |
| 12 | Copy Tab Template | HTTP Request | |
| 13 | Ekstrak SheetId | Code | |
| 14 | Rename Tab | HTTP Request | |
| 15 | Bersihkan Data Lama | HTTP Request | |
| 16 | Cari Baris Ruangan | Code | |
| 17 | Ruangan Ditemukan? | IF | |
| 18 | Update Nilai Ruangan | HTTP Request | |

## Alur Koneksi

```
Webhook WA  ->  Parse & Hitung
Parse & Hitung  ->  Cari File Bulan
Cari File Bulan  ->  Tentukan File Bulan
Tentukan File Bulan  ->  File Bulan Ada?
File Bulan Ada?  ->  Cek Daftar Tab
File Bulan Ada?  ->  Buat File Bulan (Copy) (cabang 1)
Cek Daftar Tab  ->  Tentukan Tab
Buat File Bulan (Copy)  ->  Ekstrak FileId Baru
Ekstrak FileId Baru  ->  Cek Daftar Tab
Tentukan Tab  ->  Tab Sudah Ada?
Tab Sudah Ada?  ->  Baca Kolom Ruangan
Tab Sudah Ada?  ->  Copy Tab Template (cabang 1)
Baca Kolom Ruangan  ->  Cari Baris Ruangan
Copy Tab Template  ->  Ekstrak SheetId
Ekstrak SheetId  ->  Rename Tab
Rename Tab  ->  Bersihkan Data Lama
Bersihkan Data Lama  ->  Baca Kolom Ruangan
Cari Baris Ruangan  ->  Ruangan Ditemukan?
Ruangan Ditemukan?  ->  Update Nilai Ruangan
```

## Detail Setiap Node

### Webhook WA

- Tipe: `n8n-nodes-base.webhook` | typeVersion: 2.1
- Path: `wa-to-sheet`

### Parse & Hitung

- Tipe: `n8n-nodes-base.code` | typeVersion: 2
- **jsCode:**

```js
const MONTHS = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
const bodyItem = $input.first().json;
const payload = (bodyItem.body && typeof bodyItem.body === 'object') ? bodyItem.body : bodyItem;
const src = (payload.data && typeof payload.data === 'object') ? payload.data : payload;
const msg = src || {};
const now = msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date();
const sheetName = now.getDate() + ' ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
const monthFile = 'Morning Report ' + MONTHS[now.getMonth()] + ' ' + now.getFullYear();
const FIELD = { RUANGAN:'C','KAPA SITAS TTO':'D','KAPA SITAS RIIL':'E','SISA AWAL':'F',ISI:'G',KOSONG:'H',BARU:'J',PINDAHAN:'K',PULANG:'L','KASUS MEDIKAL':'M','KASUS BEDAH':'N','KASUS OBGYN':'O','CARA BAYAR JKN':'P','CARA BAYAR TUNAI':'Q','CARA BAYAR ASRNS':'R','LAMA RAWAT II':'S','LOS RS':'T',TOI:'U','RENCANA PULANG':'V',RUJUK:'W',PINDAH:'X','RENCANA PINDAH':'Y',MNGL:'Z','OPERASI ELEKTIF':'AB',CITO:'AC',POLI:'AD',HD:'AE',CRRT:'AF',BC:'AG','CATH LAB':'AH',PENUNJANG:'AI',ECHO:'AJ',USG:'AK',ENDOSCOPY:'AL',LAIN:'AM',PESAN:'AN',KETERANGAN:'AO'};
const ALIAS = { ruangan:'RUANGAN',ruang:'RUANGAN',kamar:'RUANGAN','kapa sitas tto':'KAPA SITAS TTO','kapasitas tto':'KAPA SITAS TTO','tto':'KAPA SITAS TTO','kapasitas':'KAPA SITAS TTO','kapa sitas riil':'KAPA SITAS RIIL','kapasitas riil':'KAPA SITAS RIIL','riil':'KAPA SITAS RIIL','sisa awal':'SISA AWAL','sisa':'SISA AWAL',isi:'ISI',kosong:'KOSONG',baru:'BARU',pindahan:'PINDAHAN',pulang:'PULANG','kasus medikal':'KASUS MEDIKAL',medikal:'KASUS MEDIKAL','kasus bedah':'KASUS BEDAH',bedah:'KASUS BEDAH','kasus obgyn':'KASUS OBGYN',obgyn:'KASUS OBGYN','cara bayar jkn':'CARA BAYAR JKN',jkn:'CARA BAYAR JKN','cara bayar tunai':'CARA BAYAR TUNAI',tunai:'CARA BAYAR TUNAI','cara bayar asrns':'CARA BAYAR ASRNS',asrns:'CARA BAYAR ASRNS','lama rawat ii':'LAMA RAWAT II','lama rawat':'LAMA RAWAT II','los rs':'LOS RS',los:'LOS RS',toi:'TOI','rencana pulang':'RENCANA PULANG',rujuk:'RUJUK',pindah:'PINDAH','rencana pindah':'RENCANA PINDAH',mnngl:'MNGL',mnl:'MNGL','operasi elektif':'OPERASI ELEKTIF',operasi:'OPERASI ELEKTIF',elektif:'OPERASI ELEKTIF',cito:'CITO',poli:'POLI',hd:'HD',crrt:'CRRT',bc:'BC','cath lab':'CATH LAB',cath:'CATH LAB',penunjang:'PENUNJANG',echo:'ECHO',usg:'USG',endoscopy:'ENDOSCOPY',endoskopi:'ENDOSCOPY',lain:'LAIN',lainnya:'LAIN',pesan:'PESAN',catatan:'PESAN',keterangan:'KETERANGAN',ket:'KETERANGAN'};
const sheetMap = {};
const bodyLines = String(msg.body||'').split(String.fromCharCode(10));
for (const rawLine of bodyLines) {
  const line = rawLine.trim();
  if (!line) continue;
  let sepIdx = -1;
  for (let si = 0; si < line.length; si++) {
    const ch = line.charAt(si);
    if (ch === ':' || ch === '|' || ch === String.fromCharCode(9)) { sepIdx = si; break; }
  }
  if (sepIdx <= 0) continue;
  const k = line.slice(0, sepIdx).trim().toLowerCase();
  const v = line.slice(sepIdx + 1).trim();
  if (!k || !v) continue;
  const c = ALIAS[k] || k;
  const col = FIELD[c];
  if (col) sheetMap[col] = v;
}
return [{ json: { sheetName, monthFile, ruangan: sheetMap['C']||'', sheetMap, waktu: now.toISOString(), grup:(msg.chatId||'').replace('@g.us',''), pengirim: msg.contact?.pushName||msg.contact?.name||msg.author||'', nomor:(msg.author||msg.from||'').split('@')[0] } }];
```


### Cari File Bulan

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `GET`
- URL: `=https://www.googleapis.com/drive/v3/files?q=name='{{ $json.monthFile.replace(/\'/g, "\\'") }}' and trashed=false&fields=files(id,name)`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Tentukan File Bulan

- Tipe: `n8n-nodes-base.code` | typeVersion: 2
- **jsCode:**

```js
const bodyItem = $input.first().json;
const data = (bodyItem.json && bodyItem.json.files) || bodyItem.files || [];
const parseOut = $('Parse & Hitung').first().json;
const target = parseOut.sheetName || '';
const monthFile = parseOut.monthFile || '';
const existing = data.find(f => String(f.name||'').trim() === String(monthFile).trim());
const fileId = existing ? existing.id : null;
return [{ json: { fileId, needCreate: fileId ? 'no' : 'yes', target, monthFile, ruangan: parseOut.ruangan||'', sheetMap: parseOut.sheetMap||{}, sheetName: target } }];
```


### File Bulan Ada?

- Tipe: `n8n-nodes-base.if` | typeVersion: 2.3

### Cek Daftar Tab

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `GET`
- URL: `=https://sheets.googleapis.com/v4/spreadsheets/{{ $json.fileId }}?fields=sheets.properties(title,sheetId)`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Buat File Bulan (Copy)

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `POST`
- URL: `=https://www.googleapis.com/drive/v3/files/1fesoZdoAjDZvfXM0PCFz35r-Er8qJpAiWzcmgorAnHg/copy`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Ekstrak FileId Baru

- Tipe: `n8n-nodes-base.code` | typeVersion: 2
- **jsCode:**

```js
const bodyItem = $input.first().json;
const data = bodyItem.json || bodyItem;
const decide = $('Tentukan File Bulan').first().json;
const newId = data.id || null;
return [{ json: { fileId: newId, target: decide.target, monthFile: decide.monthFile, ruangan: decide.ruangan, sheetMap: decide.sheetMap, sheetName: decide.sheetName } }];
```


### Tentukan Tab

- Tipe: `n8n-nodes-base.code` | typeVersion: 2
- **jsCode:**

```js
const bodyItem = $input.first().json;
const sheets = (bodyItem.json && bodyItem.json.sheets) || bodyItem.sheets || [];
const parseOut = $('Tentukan File Bulan').first().json;
let fileId = parseOut.fileId || '';
try { fileId = $('Ekstrak FileId Baru').first().json.fileId || fileId; } catch (e) {}
const target = parseOut.target || '';
const exists = sheets.some(s => (s.properties?.title||'').trim() === String(target).trim());
const template = sheets.find(s => /JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER|JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI/.test(s.properties?.title||'') && !/REKAP/i.test(s.properties?.title||''));
return [{ json: { exists, hasTab: exists ? 'yes':'no', target, templateSheetId: template?.properties?.sheetId||null, fileId, ruangan: parseOut.ruangan||'', sheetMap: parseOut.sheetMap||{} } }];
```


### Tab Sudah Ada?

- Tipe: `n8n-nodes-base.if` | typeVersion: 2.3

### Baca Kolom Ruangan

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `GET`
- URL: `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Tentukan Tab').first().json.fileId }}/values/{{ encodeURI("'" + $('Tentukan Tab').first().json.target + "'!C7:C60") }}`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Copy Tab Template

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `POST`
- URL: `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Tentukan Tab').first().json.fileId }}/sheets/{{ $json.templateSheetId }}:copyTo`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Ekstrak SheetId

- Tipe: `n8n-nodes-base.code` | typeVersion: 2
- **jsCode:**

```js
const bodyItem = $input.first().json;
const data = bodyItem.json || bodyItem;
const decide = $('Tentukan Tab').first().json;
return [{ json: { target: decide.target, newSheetId: data.sheetId||null, fileId: decide.fileId } }];
```


### Rename Tab

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `POST`
- URL: `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Tentukan Tab').first().json.fileId }}:batchUpdate`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Bersihkan Data Lama

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `POST`
- URL: `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Tentukan Tab').first().json.fileId }}/values/{{ encodeURI("'" + $('Tentukan Tab').first().json.target + "'!A7:BL200") }}:clear`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

### Cari Baris Ruangan

- Tipe: `n8n-nodes-base.code` | typeVersion: 2
- **jsCode:**

```js
const bodyItem = $input.first().json;
const decide = $('Tentukan Tab').first().json;
const target = decide.target || '';
const room = decide.ruangan || '';
const sheetMap = decide.sheetMap || {};
const rows = (bodyItem.json && bodyItem.json.values) || bodyItem.values || [];
let rowIndex = -1;
if (room) {
  for (let i=0;i<rows.length;i++) {
    const cell = rows[i];
    const name = String(Array.isArray(cell) ? (cell[0] ?? '') : cell).trim();
    if (name && name.toLowerCase() === String(room).trim().toLowerCase()) { rowIndex = 7 + i; break; }
  }
}
const cols = ['C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO'];
const values = [];
for (const col of cols) values.push(sheetMap[col] ?? '');
return [{ json: { target, rowIndex, range: "'" + target + "'!C" + rowIndex + ":AO" + rowIndex, values: [values] } }];
```


### Ruangan Ditemukan?

- Tipe: `n8n-nodes-base.if` | typeVersion: 2.3

### Update Nilai Ruangan

- Tipe: `n8n-nodes-base.httpRequest` | typeVersion: 4.2
- Method: `PUT`
- URL: `=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Tentukan Tab').first().json.fileId }}/values/{{ encodeURIComponent($json.range) }}?valueInputOption=USER_ENTERED`
- Kredensial: `googleSheetsOAuth2Api` (id Xy6uJiABAYLaZpQA)

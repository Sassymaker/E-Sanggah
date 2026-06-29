const fs = require('fs-extra');
const path = require('path');
const { google } = require('googleapis');
const env = require('../config/env');
const { formatDateTime } = require('../utils/date');

const SHEET_HEADERS = [
  'ID',
  'Waktu Input',
  'Nama Lengkap',
  'NIP / NI PPPK',
  'Hari Disanggah',
  'Tanggal Disanggah',
  'Alasan Sanggahan',
  'Bukti Dukung',
  'Surat Pernyataan',
  'Status',
  'Catatan Admin',
  'Diupdate Pada',
  'Username'
];

function isGoogleConfigured() {
  return Boolean(env.google.clientEmail && env.google.privateKey && env.google.sheetsId);
}

function getAuth() {
  return new google.auth.JWT({
    email: env.google.clientEmail,
    key: env.google.privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ]
  });
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuth() });
}

function quoteSheet(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

async function ensureSheet(monthTitle) {
  if (!isGoogleConfigured()) return false;
  const sheets = getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: env.google.sheetsId });
  const found = spreadsheet.data.sheets?.find((sheet) => sheet.properties.title === monthTitle);
  if (found) return true;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: env.google.sheetsId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: monthTitle,
              gridProperties: { rowCount: 1000, columnCount: SHEET_HEADERS.length }
            }
          }
        }
      ]
    }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: env.google.sheetsId,
    range: `${quoteSheet(monthTitle)}!A1:M1`,
    valueInputOption: 'RAW',
    requestBody: { values: [SHEET_HEADERS] }
  });

  return true;
}

function recordToRow(item) {
  return [
    item.id,
    formatDateTime(item.createdAt),
    item.namaLengkap,
    item.nip,
    item.hariDisanggah,
    item.tanggalDisanggah,
    item.alasanSanggahan,
    item.buktiDukungUrl || '-',
    item.suratPernyataanUrl || '-',
    item.status,
    item.catatanAdmin || '-',
    item.updatedAt ? formatDateTime(item.updatedAt) : '-',
    item.createdByUsername || '-'
  ];
}

async function syncMonthSheet(monthTitle, records) {
  if (!isGoogleConfigured()) return { enabled: false };
  await ensureSheet(monthTitle);
  const sheets = getSheets();
  const values = [SHEET_HEADERS, ...records.map(recordToRow)];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: env.google.sheetsId,
    range: `${quoteSheet(monthTitle)}!A:M`
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: env.google.sheetsId,
    range: `${quoteSheet(monthTitle)}!A1:M${values.length}`,
    valueInputOption: 'RAW',
    requestBody: { values }
  });

  return { enabled: true, sheet: monthTitle, rows: records.length };
}

async function uploadFileToDrive(file, monthTitle, prefix) {
  if (!file) return null;

  if (!(env.google.clientEmail && env.google.privateKey && env.google.driveFolderId)) {
    await fs.ensureDir(env.uploadDir);
    const safeName = `${Date.now()}-${prefix}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destination = path.join(env.uploadDir, safeName);
    await fs.move(file.path, destination, { overwrite: true });
    return {
      fileName: file.originalname,
      fileId: null,
      url: `${env.appBaseUrl}/uploads/${safeName}`,
      storage: 'local'
    };
  }

  const drive = getDrive();
  const name = `${monthTitle}-${Date.now()}-${prefix}-${file.originalname}`;
  const response = await drive.files.create({
    requestBody: {
      name,
      parents: [env.google.driveFolderId]
    },
    media: {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path)
    },
    fields: 'id, name, webViewLink, webContentLink'
  });

  if (env.google.publicLinks) {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
  }

  await fs.remove(file.path);

  return {
    fileName: file.originalname,
    fileId: response.data.id,
    url: response.data.webViewLink || response.data.webContentLink,
    storage: 'google_drive'
  };
}

async function cleanupTmpFiles(files = []) {
  await Promise.all(files.filter(Boolean).map((file) => fs.remove(file.path).catch(() => null)));
}

module.exports = {
  SHEET_HEADERS,
  isGoogleConfigured,
  syncMonthSheet,
  uploadFileToDrive,
  cleanupTmpFiles
};

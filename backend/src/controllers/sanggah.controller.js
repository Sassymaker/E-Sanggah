const { readDb, writeDb } = require('../data/db');
const { makeId } = require('../utils/id');
const { monthKey, normalizeDateInput } = require('../utils/date');
const { uploadFileToDrive, syncMonthSheet, cleanupTmpFiles } = require('../services/google.service');

const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at"];
const STATUS_OPTIONS = ['Menunggu', 'Disetujui', 'Ditolak', 'Perlu Revisi'];

function getMonthRecords(db, month) {
  return db.sanggahan
    .filter((item) => monthKey(item.tanggalDisanggah) === month)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function syncChangedMonths(db, months) {
  const uniqueMonths = [...new Set(months.filter(Boolean))];
  for (const month of uniqueMonths) {
    await syncMonthSheet(month, getMonthRecords(db, month));
  }
}

function applyFilters(records, query, user) {
  let result = [...records];

  if (user.role === 'user') {
    result = result.filter((item) => item.createdBy === user.id);
  }

  if (query.month) {
    result = result.filter((item) => monthKey(item.tanggalDisanggah) === query.month);
  }

  if (query.status) {
    result = result.filter((item) => item.status === query.status);
  }

  if (query.search) {
    const keyword = String(query.search).toLowerCase();
    result = result.filter((item) => {
      return [item.namaLengkap, item.nip, item.alasanSanggahan, item.hariDisanggah, item.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }

  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function validateCreateInput(body) {
  const required = ['namaLengkap', 'nip', 'hariDisanggah', 'tanggalDisanggah', 'alasanSanggahan'];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === '') {
      return `${field} wajib diisi.`;
    }
  }

  if (!HARI_OPTIONS.includes(body.hariDisanggah)) return 'Hari yang disanggah tidak valid.';
  return null;
}

async function createSanggahan(req, res, next) {
  const uploadedFiles = Object.values(req.files || {}).flat();
  try {
    if (req.user.role !== 'user') {
      await cleanupTmpFiles(uploadedFiles);
      return res.status(403).json({ message: 'Hanya user yang boleh menginput sanggahan.' });
    }

    const validationMessage = validateCreateInput(req.body || {});
    if (validationMessage) {
      await cleanupTmpFiles(uploadedFiles);
      return res.status(400).json({ message: validationMessage });
    }

    const buktiFile = req.files?.buktiDukung?.[0] || null;
    const suratFile = req.files?.suratPernyataan?.[0] || null;
    if (!buktiFile || !suratFile) {
      await cleanupTmpFiles(uploadedFiles);
      return res.status(400).json({ message: 'Bukti dukung dan surat pernyataan wajib diupload.' });
    }

    const tanggal = normalizeDateInput(req.body.tanggalDisanggah);
    const month = monthKey(tanggal);
    const bukti = await uploadFileToDrive(buktiFile, month, 'bukti');
    const surat = await uploadFileToDrive(suratFile, month, 'surat');

    const db = readDb();
    const newItem = {
      id: makeId('SGH'),
      namaLengkap: String(req.body.namaLengkap).trim(),
      nip: String(req.body.nip).trim(),
      hariDisanggah: req.body.hariDisanggah,
      tanggalDisanggah: tanggal,
      alasanSanggahan: String(req.body.alasanSanggahan).trim(),
      buktiDukungFileName: bukti.fileName,
      buktiDukungFileId: bukti.fileId,
      buktiDukungUrl: bukti.url,
      buktiDukungStorage: bukti.storage,
      suratPernyataanFileName: surat.fileName,
      suratPernyataanFileId: surat.fileId,
      suratPernyataanUrl: surat.url,
      suratPernyataanStorage: surat.storage,
      status: 'Menunggu',
      catatanAdmin: '',
      createdBy: req.user.id,
      createdByUsername: req.user.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.sanggahan.push(newItem);
    writeDb(db);
    await syncChangedMonths(db, [month]);

    return res.status(201).json({ message: 'Sanggahan berhasil dikirim.', data: newItem });
  } catch (error) {
    await cleanupTmpFiles(uploadedFiles);
    return next(error);
  }
}

function listSanggahan(req, res) {
  const db = readDb();
  const data = applyFilters(db.sanggahan, req.query, req.user);
  return res.json({ data, total: data.length });
}

function getSanggahan(req, res) {
  const db = readDb();
  const item = db.sanggahan.find((record) => record.id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Data sanggahan tidak ditemukan.' });
  if (req.user.role === 'user' && item.createdBy !== req.user.id) {
    return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini.' });
  }
  return res.json({ data: item });
}

async function updateSanggahan(req, res, next) {
  const uploadedFiles = Object.values(req.files || {}).flat();
  try {
    const db = readDb();
    const index = db.sanggahan.findIndex((record) => record.id === req.params.id);
    if (index === -1) {
      await cleanupTmpFiles(uploadedFiles);
      return res.status(404).json({ message: 'Data sanggahan tidak ditemukan.' });
    }

    const oldItem = db.sanggahan[index];
    if (req.user.role === 'user' && oldItem.createdBy !== req.user.id) {
      await cleanupTmpFiles(uploadedFiles);
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini.' });
    }

    if (req.user.role === 'user' && oldItem.status !== 'Menunggu') {
      await cleanupTmpFiles(uploadedFiles);
      return res.status(400).json({ message: 'Data hanya bisa diedit user saat status masih Menunggu.' });
    }

    const updated = { ...oldItem };
    const oldMonth = monthKey(oldItem.tanggalDisanggah);

    if (req.user.role === 'user') {
      const allowedFields = ['namaLengkap', 'nip', 'hariDisanggah', 'tanggalDisanggah', 'alasanSanggahan'];
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) updated[field] = String(req.body[field]).trim();
      });
      if (!HARI_OPTIONS.includes(updated.hariDisanggah)) {
        await cleanupTmpFiles(uploadedFiles);
        return res.status(400).json({ message: 'Hari yang disanggah tidak valid.' });
      }
      updated.tanggalDisanggah = normalizeDateInput(updated.tanggalDisanggah);
    }

    if (req.user.role === 'admin') {
      if (req.body.status !== undefined) {
        if (!STATUS_OPTIONS.includes(req.body.status)) {
          await cleanupTmpFiles(uploadedFiles);
          return res.status(400).json({ message: 'Status tidak valid.' });
        }
        updated.status = req.body.status;
      }
      if (req.body.catatanAdmin !== undefined) updated.catatanAdmin = String(req.body.catatanAdmin).trim();
    }

    const newMonth = monthKey(updated.tanggalDisanggah);
    const buktiFile = req.files?.buktiDukung?.[0] || null;
    const suratFile = req.files?.suratPernyataan?.[0] || null;

    if (buktiFile) {
      const bukti = await uploadFileToDrive(buktiFile, newMonth, 'bukti');
      updated.buktiDukungFileName = bukti.fileName;
      updated.buktiDukungFileId = bukti.fileId;
      updated.buktiDukungUrl = bukti.url;
      updated.buktiDukungStorage = bukti.storage;
    }

    if (suratFile) {
      const surat = await uploadFileToDrive(suratFile, newMonth, 'surat');
      updated.suratPernyataanFileName = surat.fileName;
      updated.suratPernyataanFileId = surat.fileId;
      updated.suratPernyataanUrl = surat.url;
      updated.suratPernyataanStorage = surat.storage;
    }

    updated.updatedAt = new Date().toISOString();
    db.sanggahan[index] = updated;
    writeDb(db);
    await syncChangedMonths(db, [oldMonth, newMonth]);

    return res.json({ message: 'Data sanggahan berhasil diperbarui.', data: updated });
  } catch (error) {
    await cleanupTmpFiles(uploadedFiles);
    return next(error);
  }
}

async function deleteSanggahan(req, res, next) {
  try {
    const db = readDb();
    const index = db.sanggahan.findIndex((record) => record.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Data sanggahan tidak ditemukan.' });

    const item = db.sanggahan[index];
    if (req.user.role === 'user' && item.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke data ini.' });
    }
    if (req.user.role === 'user' && item.status !== 'Menunggu') {
      return res.status(400).json({ message: 'User hanya boleh menghapus data saat status masih Menunggu.' });
    }

    const deletedMonth = monthKey(item.tanggalDisanggah);
    db.sanggahan.splice(index, 1);
    writeDb(db);
    await syncChangedMonths(db, [deletedMonth]);

    return res.json({ message: 'Data sanggahan berhasil dihapus.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSanggahan,
  listSanggahan,
  getSanggahan,
  updateSanggahan,
  deleteSanggahan,
  applyFilters,
  getMonthRecords,
  STATUS_OPTIONS,
  HARI_OPTIONS
};

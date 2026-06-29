const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const env = require('../config/env');

fs.ensureDirSync(env.tmpDir);

const allowedMimes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, env.tmpDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Format file tidak didukung. Gunakan PDF, JPG, PNG, WEBP, DOC, atau DOCX.'));
    }
    cb(null, true);
  }
});

module.exports = upload;

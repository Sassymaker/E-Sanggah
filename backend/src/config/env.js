require('dotenv').config();
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  rootDir,
  tmpDir: path.join(rootDir, 'storage', 'tmp'),
  uploadDir: path.join(rootDir, 'storage', 'uploads'),
  initialAdmin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    fullName: process.env.ADMIN_FULLNAME || 'Administrator E-Sanggah'
  },
  initialUser: {
    username: process.env.USER_USERNAME || 'user',
    password: process.env.USER_PASSWORD || 'user123',
    fullName: process.env.USER_FULLNAME || 'Pegawai Contoh'
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID || '',
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    sheetsId: process.env.GOOGLE_SHEETS_ID || '',
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    publicLinks: String(process.env.GOOGLE_DRIVE_PUBLIC_LINKS || 'false') === 'true'
  }
};

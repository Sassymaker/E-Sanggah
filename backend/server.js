const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs-extra');
const env = require('./src/config/env');
const { initDb } = require('./src/data/db');
const authRoutes = require('./src/routes/auth.routes');
const sanggahRoutes = require('./src/routes/sanggah.routes');
const adminRoutes = require('./src/routes/admin.routes');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

async function bootstrap() {
  await fs.ensureDir(env.tmpDir);
  await fs.ensureDir(env.uploadDir);
  await initDb();

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(env.uploadDir));

  const frontendPath = path.join(env.rootDir, '..', 'frontend');
  app.use(express.static(frontendPath));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'E-Sanggah API' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/sanggah', sanggahRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(path.join(frontendPath, 'index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`E-Sanggah berjalan di ${env.appBaseUrl}`);
  });
}

bootstrap().catch((error) => {
  console.error('Gagal menjalankan server:', error);
  process.exit(1);
});

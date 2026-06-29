const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { readDb, publicUser } = require('../data/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login ulang.' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const db = readDb();
    const user = db.users.find((item) => item.id === payload.id);
    if (!user) return res.status(401).json({ message: 'User tidak valid.' });
    req.user = publicUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };

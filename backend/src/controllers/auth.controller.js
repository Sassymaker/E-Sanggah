const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { readDb, publicUser } = require('../data/db');

async function login(req, res) {
  const { username, password, role } = req.body || {};

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password, dan peran wajib diisi.' });
  }

  const db = readDb();
  const user = db.users.find((item) => item.username === username && item.role === role);
  if (!user) return res.status(401).json({ message: 'Akun tidak ditemukan untuk peran tersebut.' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Password salah.' });

  const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: '8h' });
  return res.json({ token, user: publicUser(user) });
}

function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, me };

const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { makeId } = require('../utils/id');

const dbPath = path.join(__dirname, 'db.json');

function defaultDb() {
  return {
    users: [],
    sanggahan: []
  };
}

async function seedUsers(db) {
  if (db.users.length > 0) return db;

  const adminHash = await bcrypt.hash(env.initialAdmin.password, 10);
  const userHash = await bcrypt.hash(env.initialUser.password, 10);

  db.users.push({
    id: makeId('USR'),
    username: env.initialAdmin.username,
    fullName: env.initialAdmin.fullName,
    role: 'admin',
    passwordHash: adminHash,
    createdAt: new Date().toISOString()
  });

  db.users.push({
    id: makeId('USR'),
    username: env.initialUser.username,
    fullName: env.initialUser.fullName,
    role: 'user',
    passwordHash: userHash,
    createdAt: new Date().toISOString()
  });

  return db;
}

async function initDb() {
  await fs.ensureDir(path.dirname(dbPath));
  if (!(await fs.pathExists(dbPath))) {
    const db = await seedUsers(defaultDb());
    await fs.writeJson(dbPath, db, { spaces: 2 });
    return db;
  }

  const db = await fs.readJson(dbPath);
  if (!db.users) db.users = [];
  if (!db.sanggahan) db.sanggahan = [];
  await seedUsers(db);
  await fs.writeJson(dbPath, db, { spaces: 2 });
  return db;
}

function readDb() {
  if (!fs.existsSync(dbPath)) return defaultDb();
  const db = fs.readJsonSync(dbPath);
  db.users = db.users || [];
  db.sanggahan = db.sanggahan || [];
  return db;
}

function writeDb(db) {
  fs.writeJsonSync(dbPath, db, { spaces: 2 });
  return db;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

module.exports = {
  initDb,
  readDb,
  writeDb,
  publicUser
};

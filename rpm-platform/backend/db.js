// db.js — SQLite persistence layer (better-sqlite3, synchronous).
// Creates the schema and seeds demo data on first run. The DB file is rpm.db.

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const seed = require('./seed');

// DB path is configurable so tests can use an in-memory database (RPM_DB=':memory:').
const dbPath = process.env.RPM_DB || path.join(__dirname, 'rpm.db');
const db = new Database(dbPath);
if (dbPath !== ':memory:') db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    sex TEXT,
    conditions TEXT            -- JSON array
  );
  CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL REFERENCES patients(id),
    takenAt TEXT NOT NULL,
    systolic REAL, diastolic REAL, heartRate REAL, spo2 REAL,
    glucose REAL, temperature REAL, weight REAL,
    status TEXT,
    metricStatus TEXT,          -- JSON object
    flags TEXT                  -- JSON array
  );
  CREATE INDEX IF NOT EXISTS idx_readings_patient ON readings(patientId, takenAt);
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL,         -- 'provider' | 'patient'
    displayName TEXT,
    patientId TEXT REFERENCES patients(id)   -- set for patient users
  );
`);

// ---- Seed on first run ----
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM patients').get().n;
  if (count > 0) return;

  const insPatient = db.prepare(
    'INSERT INTO patients (id, name, age, sex, conditions) VALUES (?, ?, ?, ?, ?)'
  );
  const insReading = db.prepare(`
    INSERT INTO readings (id, patientId, takenAt, systolic, diastolic, heartRate, spo2, glucose, temperature, weight, status, metricStatus, flags)
    VALUES (@id, @patientId, @takenAt, @systolic, @diastolic, @heartRate, @spo2, @glucose, @temperature, @weight, @status, @metricStatus, @flags)
  `);
  const insUser = db.prepare(
    'INSERT INTO users (id, username, passwordHash, role, displayName, patientId) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const patients = seed.build();
  const tx = db.transaction(() => {
    for (const p of patients) {
      insPatient.run(p.id, p.name, p.age, p.sex, JSON.stringify(p.conditions));
      for (const r of p.readings) {
        insReading.run({
          id: r.id, patientId: p.id, takenAt: r.takenAt,
          systolic: r.systolic ?? null, diastolic: r.diastolic ?? null, heartRate: r.heartRate ?? null,
          spo2: r.spo2 ?? null, glucose: r.glucose ?? null, temperature: r.temperature ?? null, weight: r.weight ?? null,
          status: r.status, metricStatus: JSON.stringify(r.metricStatus), flags: JSON.stringify(r.flags)
        });
      }
      // one patient login per patient (username = patientId, password = 'patient123')
      insUser.run(`u-${p.id}`, p.id, bcrypt.hashSync('patient123', 10), 'patient', p.name, p.id);
    }
    // provider account
    insUser.run('u-provider', 'dr.chen', bcrypt.hashSync('provider123', 10), 'provider', 'Dr. Grace Chen', null);
  });
  tx();
  console.log(`Seeded ${patients.length} patients + users into SQLite.`);
}
seedIfEmpty();

// ---- Row mappers ----
function mapPatient(row) {
  return { id: row.id, name: row.name, age: row.age, sex: row.sex, conditions: JSON.parse(row.conditions || '[]') };
}
function mapReading(row) {
  return {
    id: row.id, takenAt: row.takenAt,
    systolic: row.systolic, diastolic: row.diastolic, heartRate: row.heartRate, spo2: row.spo2,
    glucose: row.glucose, temperature: row.temperature, weight: row.weight,
    status: row.status, metricStatus: JSON.parse(row.metricStatus || '{}'), flags: JSON.parse(row.flags || '[]')
  };
}

// ---- Queries ----
const q = {
  allPatients: db.prepare('SELECT * FROM patients ORDER BY name'),
  patientById: db.prepare('SELECT * FROM patients WHERE id = ?'),
  readingsFor: db.prepare('SELECT * FROM readings WHERE patientId = ? ORDER BY takenAt ASC'),
  latestFor: db.prepare('SELECT * FROM readings WHERE patientId = ? ORDER BY takenAt DESC LIMIT 1'),
  insertReading: db.prepare(`
    INSERT INTO readings (id, patientId, takenAt, systolic, diastolic, heartRate, spo2, glucose, temperature, weight, status, metricStatus, flags)
    VALUES (@id, @patientId, @takenAt, @systolic, @diastolic, @heartRate, @spo2, @glucose, @temperature, @weight, @status, @metricStatus, @flags)
  `),
  countReadings: db.prepare('SELECT COUNT(*) AS n FROM readings WHERE patientId = ?'),
  userByUsername: db.prepare('SELECT * FROM users WHERE username = ?')
};

module.exports = {
  db,
  listPatients: () => q.allPatients.all().map(mapPatient),
  getPatient: (id) => { const r = q.patientById.get(id); return r ? mapPatient(r) : null; },
  getReadings: (id) => q.readingsFor.all(id).map(mapReading),
  getLatest: (id) => { const r = q.latestFor.get(id); return r ? mapReading(r) : null; },
  countReadings: (id) => q.countReadings.get(id).n,
  addReading: (rec) => q.insertReading.run(rec),
  getUser: (username) => q.userByUsername.get(username)
};

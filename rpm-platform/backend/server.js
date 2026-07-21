// server.js — Remote Patient Monitoring API (SQLite + JWT auth + roles).
//
// Roles:
//   provider  → sees all patients, alerts, and any patient detail.
//   patient   → sees/submits only their own record.

const express = require('express');
const cors = require('cors');
const { evaluate, VITAL_DEFS } = require('./vitals');
const store = require('./db');
const { verifyPassword, issueToken, requireAuth, requireRole } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

// Attach latest reading + summary fields to a patient record.
function summarize(p) {
  const last = store.getLatest(p.id);
  return {
    id: p.id, name: p.name, age: p.age, sex: p.sex, conditions: p.conditions,
    latest: last,
    status: last ? last.status : 'normal',
    readingCount: store.countReadings(p.id)
  };
}

// ---------- Auth ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = store.getUser(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = issueToken(user);
  res.json({
    token,
    user: { username: user.username, role: user.role, displayName: user.displayName, patientId: user.patientId || null }
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const { username, role, displayName, patientId } = req.user;
  res.json({ username, role, displayName, patientId });
});

// ---------- Reference ----------
app.get('/api/vital-defs', requireAuth, (_req, res) => res.json(VITAL_DEFS));

// ---------- Provider-only ----------
app.get('/api/patients', requireAuth, requireRole('provider'), (_req, res) => {
  const list = store.listPatients().map(summarize);
  const rank = { critical: 0, warning: 1, normal: 2 };
  list.sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
  res.json(list);
});

app.get('/api/alerts', requireAuth, requireRole('provider'), (_req, res) => {
  const alerts = [];
  for (const p of store.listPatients()) {
    const last = store.getLatest(p.id);
    if (last && last.status !== 'normal') {
      alerts.push({ patientId: p.id, patientName: p.name, status: last.status, takenAt: last.takenAt, flags: last.flags });
    }
  }
  const rank = { critical: 0, warning: 1 };
  alerts.sort((a, b) => rank[a.status] - rank[b.status]);
  res.json(alerts);
});

// ---------- Patient detail (provider OR the patient themselves) ----------
function canAccessPatient(req, id) {
  return req.user.role === 'provider' || req.user.patientId === id;
}

app.get('/api/patients/:id', requireAuth, (req, res) => {
  if (!canAccessPatient(req, req.params.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const p = store.getPatient(req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json({ ...p, readings: store.getReadings(p.id) });
});

app.post('/api/patients/:id/vitals', requireAuth, (req, res) => {
  if (!canAccessPatient(req, req.params.id)) return res.status(403).json({ error: 'Insufficient permissions' });
  const p = store.getPatient(req.params.id);
  if (!p) return res.status(404).json({ error: 'Patient not found' });

  const reading = {};
  for (const k of Object.keys(VITAL_DEFS)) {
    const v = req.body?.[k];
    if (v !== undefined && v !== null && v !== '') {
      const num = Number(v);
      if (Number.isNaN(num)) return res.status(400).json({ error: `Invalid value for ${k}` });
      reading[k] = num;
    }
  }
  if (Object.keys(reading).length === 0) return res.status(400).json({ error: 'At least one vital sign is required' });

  const evalr = evaluate(reading);
  const record = {
    id: `${p.id}-r${Date.now()}`,
    patientId: p.id,
    takenAt: new Date().toISOString(),
    systolic: reading.systolic ?? null, diastolic: reading.diastolic ?? null, heartRate: reading.heartRate ?? null,
    spo2: reading.spo2 ?? null, glucose: reading.glucose ?? null, temperature: reading.temperature ?? null, weight: reading.weight ?? null,
    status: evalr.overall,
    metricStatus: JSON.stringify(evalr.metrics),
    flags: JSON.stringify(evalr.flags)
  };
  store.addReading(record);
  res.status(201).json({ ...record, metricStatus: evalr.metrics, flags: evalr.flags });
});

// ---------- Health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Start the server only when run directly (so tests can import `app`).
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`RPM API listening on http://localhost:${PORT}`));
}

module.exports = app;

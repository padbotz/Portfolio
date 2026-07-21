// seed.js — generates in-memory demo patients with ~14 days of readings each.
// Deterministic-ish so the dashboard looks realistic on every boot.

const { evaluate } = require('./vitals');

const PATIENTS = [
  { id: 'pt-1001', name: 'Elena Ramirez',  age: 67, sex: 'F', conditions: ['Hypertension', 'Type 2 diabetes'], profile: 'htn' },
  { id: 'pt-1002', name: 'Marcus Bell',    age: 58, sex: 'M', conditions: ['CHF'],                          profile: 'chf' },
  { id: 'pt-1003', name: 'Aiko Tanaka',    age: 72, sex: 'F', conditions: ['COPD'],                         profile: 'copd' },
  { id: 'pt-1004', name: 'David Okoro',    age: 45, sex: 'M', conditions: ['Type 2 diabetes'],              profile: 'dm' },
  { id: 'pt-1005', name: 'Sofia Martinez', age: 61, sex: 'F', conditions: ['Post-op monitoring'],           profile: 'stable' },
  { id: 'pt-1006', name: 'James Wu',       age: 54, sex: 'M', conditions: ['Hypertension'],                 profile: 'htn' }
];

const rnd = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;

// Per-profile baseline generators. Some profiles trend toward abnormal recent readings.
function genReading(profile, dayOffset) {
  const recent = dayOffset <= 2; // last couple of days can spike for some profiles
  switch (profile) {
    case 'htn': return {
      systolic: rnd(recent ? 150 : 128, recent ? 168 : 142), diastolic: rnd(recent ? 92 : 78, recent ? 104 : 90),
      heartRate: rnd(66, 84), spo2: rnd(96, 99), glucose: rnd(95, 135), temperature: rnd(36.3, 37.1), weight: rnd(82, 84)
    };
    case 'chf': return {
      systolic: rnd(108, 128), diastolic: rnd(68, 82), heartRate: rnd(recent ? 96 : 74, recent ? 118 : 92),
      spo2: rnd(recent ? 89 : 93, recent ? 93 : 97), glucose: rnd(90, 120), temperature: rnd(36.4, 37.0),
      weight: rnd(recent ? 90 : 86, recent ? 93 : 88)
    };
    case 'copd': return {
      systolic: rnd(118, 134), diastolic: rnd(72, 84), heartRate: rnd(78, 96),
      spo2: rnd(recent ? 87 : 91, recent ? 91 : 94), glucose: rnd(92, 128), temperature: rnd(36.5, 37.4), weight: rnd(64, 66)
    };
    case 'dm': return {
      systolic: rnd(120, 134), diastolic: rnd(74, 86), heartRate: rnd(68, 88),
      spo2: rnd(96, 99), glucose: rnd(recent ? 190 : 130, recent ? 260 : 175), temperature: rnd(36.4, 37.0), weight: rnd(96, 98)
    };
    case 'stable': return {
      systolic: rnd(112, 126), diastolic: rnd(70, 82), heartRate: rnd(64, 82),
      spo2: rnd(97, 100), glucose: rnd(88, 118), temperature: rnd(36.4, 37.0), weight: rnd(70, 71)
    };
    default: return {
      systolic: rnd(115, 135), diastolic: rnd(72, 86), heartRate: rnd(66, 88),
      spo2: rnd(95, 99), glucose: rnd(90, 140), temperature: rnd(36.4, 37.2), weight: rnd(75, 78)
    };
  }
}

function build() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const patients = PATIENTS.map(p => {
    const readings = [];
    for (let d = 13; d >= 0; d--) {
      const r = genReading(p.profile, d);
      const evalr = evaluate(r);
      readings.push({
        id: `${p.id}-r${13 - d}`,
        takenAt: new Date(now - d * DAY).toISOString(),
        ...r,
        status: evalr.overall,
        metricStatus: evalr.metrics,
        flags: evalr.flags
      });
    }
    const { profile, ...clean } = p;
    return { ...clean, readings };
  });
  return patients;
}

module.exports = { build };

// vitals.js — vital-sign definitions and threshold/alert logic.
// Central place that defines what "normal / warning / critical" means for each metric.

const VITAL_DEFS = {
  systolic:  { label: 'Systolic BP',  unit: 'mmHg', warn: [90, 140], crit: [80, 160] },
  diastolic: { label: 'Diastolic BP', unit: 'mmHg', warn: [60, 90],  crit: [50, 100] },
  heartRate: { label: 'Heart Rate',   unit: 'bpm',  warn: [50, 100], crit: [40, 120] },
  spo2:      { label: 'SpO₂',         unit: '%',    warn: [92, 100], crit: [88, 100] },
  glucose:   { label: 'Blood Glucose',unit: 'mg/dL',warn: [70, 180], crit: [54, 250] },
  temperature:{label: 'Temperature',  unit: '°C',   warn: [36.1, 37.8], crit: [35, 39.4] },
  weight:    { label: 'Weight',       unit: 'kg',   warn: null, crit: null } // tracked, not alerted
};

// Return 'normal' | 'warning' | 'critical' for a single metric value.
function statusFor(metric, value) {
  const def = VITAL_DEFS[metric];
  if (!def || def.warn == null || value == null) return 'normal';
  const [wLo, wHi] = def.warn;
  const [cLo, cHi] = def.crit;
  if (value < cLo || value > cHi) return 'critical';
  if (value < wLo || value > wHi) return 'warning';
  return 'normal';
}

const RANK = { normal: 0, warning: 1, critical: 2 };

// Evaluate a full reading -> per-metric statuses + overall + human-readable flags.
function evaluate(reading) {
  const metrics = {};
  const flags = [];
  let overall = 'normal';
  for (const key of Object.keys(VITAL_DEFS)) {
    if (reading[key] == null) continue;
    const s = statusFor(key, reading[key]);
    metrics[key] = s;
    if (RANK[s] > RANK[overall]) overall = s;
    if (s !== 'normal') {
      const def = VITAL_DEFS[key];
      flags.push(`${def.label} ${reading[key]}${def.unit} (${s})`);
    }
  }
  return { metrics, overall, flags };
}

module.exports = { VITAL_DEFS, statusFor, evaluate };

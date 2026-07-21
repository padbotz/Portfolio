// Pure unit tests for the threshold/alert engine — no DB or network needed.
const { statusFor, evaluate, VITAL_DEFS } = require('../vitals');

describe('statusFor', () => {
  test('normal values are normal', () => {
    expect(statusFor('systolic', 120)).toBe('normal');
    expect(statusFor('spo2', 98)).toBe('normal');
    expect(statusFor('heartRate', 72)).toBe('normal');
  });

  test('values just outside the warn band are warnings', () => {
    expect(statusFor('systolic', 145)).toBe('warning');   // > 140, <= 160
    expect(statusFor('spo2', 90)).toBe('warning');        // < 92, >= 88
    expect(statusFor('heartRate', 45)).toBe('warning');   // < 50, >= 40
  });

  test('values outside the critical band are critical', () => {
    expect(statusFor('systolic', 170)).toBe('critical');  // > 160
    expect(statusFor('spo2', 85)).toBe('critical');       // < 88
    expect(statusFor('glucose', 300)).toBe('critical');   // > 250
  });

  test('weight has no thresholds and is always normal', () => {
    expect(statusFor('weight', 250)).toBe('normal');
  });

  test('boundary values are inclusive of the normal range', () => {
    expect(statusFor('systolic', 140)).toBe('normal');
    expect(statusFor('systolic', 90)).toBe('normal');
    expect(statusFor('spo2', 92)).toBe('normal');
  });
});

describe('evaluate', () => {
  test('overall status is the worst metric', () => {
    const r = evaluate({ systolic: 120, spo2: 85, heartRate: 72 });
    expect(r.overall).toBe('critical');
    expect(r.metrics['spo2']).toBe('critical');
    expect(r.metrics['systolic']).toBe('normal');
  });

  test('produces human-readable flags for out-of-range metrics only', () => {
    const r = evaluate({ systolic: 150, diastolic: 80, spo2: 98 });
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0]).toMatch(/Systolic BP 150mmHg \(warning\)/);
  });

  test('all-normal reading has no flags', () => {
    const r = evaluate({ systolic: 118, diastolic: 76, heartRate: 70, spo2: 99 });
    expect(r.overall).toBe('normal');
    expect(r.flags).toEqual([]);
  });

  test('ignores metrics that are not provided', () => {
    const r = evaluate({ heartRate: 72 });
    expect(Object.keys(r.metrics)).toEqual(['heartRate']);
  });
});

describe('VITAL_DEFS', () => {
  test('every alertable vital defines both warn and crit ranges', () => {
    for (const [key, def] of Object.entries(VITAL_DEFS)) {
      if (key === 'weight') continue;
      expect(Array.isArray(def.warn)).toBe(true);
      expect(Array.isArray(def.crit)).toBe(true);
      // critical band is wider than the warn band
      expect(def.crit[0]).toBeLessThanOrEqual(def.warn[0]);
      expect(def.crit[1]).toBeGreaterThanOrEqual(def.warn[1]);
    }
  });
});

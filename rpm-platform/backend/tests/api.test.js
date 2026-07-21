// API integration tests (supertest). Runs against an in-memory SQLite DB
// seeded on import — set via RPM_DB=:memory: in the test script.
const request = require('supertest');
const app = require('../server');

async function login(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res;
}

describe('auth', () => {
  test('valid provider login returns a token and role', async () => {
    const res = await login('dr.chen', 'provider123');
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('provider');
  });

  test('wrong password is rejected', async () => {
    const res = await login('dr.chen', 'nope');
    expect(res.status).toBe(401);
  });

  test('protected route without a token is 401', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});

describe('provider access', () => {
  let token;
  beforeAll(async () => { token = (await login('dr.chen', 'provider123')).body.token; });

  test('can list patients, sickest first', async () => {
    const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    const rank = { critical: 0, warning: 1, normal: 2 };
    const ranks = res.body.map(p => rank[p.status]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test('can read the alerts feed', async () => {
    const res = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('can read any patient detail with history', async () => {
    const res = await request(app).get('/api/patients/pt-1001').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.readings.length).toBeGreaterThan(0);
  });
});

describe('patient access scoping', () => {
  let token;
  beforeAll(async () => { token = (await login('pt-1002', 'patient123')).body.token; });

  test('patient cannot list all patients (403)', async () => {
    const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('patient can read their own record', async () => {
    const res = await request(app).get('/api/patients/pt-1002').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('pt-1002');
  });

  test('patient cannot read another patient (403)', async () => {
    const res = await request(app).get('/api/patients/pt-1001').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('submitting vitals', () => {
  let token;
  beforeAll(async () => { token = (await login('pt-1002', 'patient123')).body.token; });

  test('a critical reading is graded and flagged', async () => {
    const res = await request(app)
      .post('/api/patients/pt-1002/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({ spo2: 85, heartRate: 130 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('critical');
    expect(res.body.flags.length).toBeGreaterThan(0);
  });

  test('an empty submission is rejected', async () => {
    const res = await request(app)
      .post('/api/patients/pt-1002/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});

const request = require('supertest');

jest.mock('../lib/gitconfig');
jest.mock('../lib/github');
jest.mock('../lib/setup');

const app = require('../server');
const { readConfigForPath } = require('../lib/gitconfig');
const { verifyToken } = require('../lib/github');
const { applySetup } = require('../lib/setup');

describe('GET /api/browse', () => {
  it('returns dirs for a real path', async () => {
    const res = await request(app).get('/api/browse?path=/tmp');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('path', '/tmp');
    expect(Array.isArray(res.body.dirs)).toBe(true);
  });

  it('returns 400 for a non-existent path', async () => {
    const res = await request(app).get('/api/browse?path=/nonexistent-xyz-path');
    expect(res.status).toBe(400);
  });

  it('defaults to home dir when no path given', async () => {
    const res = await request(app).get('/api/browse');
    expect(res.status).toBe(200);
    expect(res.body.path).toBeTruthy();
  });
});

describe('GET /api/config', () => {
  it('returns 400 when path is missing', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(400);
  });

  it('returns { configured: false } when path not in gitconfig', async () => {
    readConfigForPath.mockReturnValue(null);
    const res = await request(app).get('/api/config?path=~/Repo/unknown');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ configured: false });
  });

  it('returns existing config when path is configured', async () => {
    readConfigForPath.mockReturnValue({ configured: true, name: 'Kipper', email: 'k@example.com', username: 'kb' });
    const res = await request(app).get('/api/config?path=~/Repo/test');
    expect(res.body.configured).toBe(true);
    expect(res.body.name).toBe('Kipper');
  });
});

describe('POST /api/verify-token', () => {
  it('returns 400 when fields missing', async () => {
    const res = await request(app).post('/api/verify-token').send({});
    expect(res.status).toBe(400);
  });

  it('returns verification result from github module', async () => {
    verifyToken.mockResolvedValue({ valid: true, login: 'kb', match: true, orgs: ['myorg'] });
    const res = await request(app).post('/api/verify-token').send({ token: 'ghp_test', username: 'kb' });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.match).toBe(true);
  });
});

describe('POST /api/apply', () => {
  it('returns 400 when any field is missing', async () => {
    const res = await request(app).post('/api/apply').send({ path: '~/Repo/test' });
    expect(res.status).toBe(400);
  });

  it('calls applySetup and streams SSE', async () => {
    applySetup.mockImplementation((_data, emit) => {
      emit('step', 'doing thing');
      emit('done', 'cd ~/Repo/test && git config user.email');
    });
    const res = await request(app)
      .post('/api/apply')
      .send({ path: '~/Repo/test', name: 'A', email: 'a@b.com', username: 'ab', token: 'tok' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('"type":"step"');
    expect(res.text).toContain('"type":"done"');
  });
});

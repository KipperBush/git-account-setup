const https = require('https');
const { EventEmitter } = require('events');
const { verifyToken } = require('../lib/github');

jest.mock('https');

function mockGet(responses) {
  let callCount = 0;
  https.get.mockImplementation((options, callback) => {
    const { status, body } = responses[callCount++] || { status: 200, body: [] };
    const res = new EventEmitter();
    res.statusCode = status;
    callback(res);
    res.emit('data', JSON.stringify(body));
    res.emit('end');
    return { on: jest.fn() };
  });
}

describe('verifyToken', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns valid: false for non-200 user response', async () => {
    mockGet([{ status: 401, body: { message: 'Bad credentials' } }]);
    const result = await verifyToken('bad', 'user');
    expect(result.valid).toBe(false);
    expect(result.login).toBeNull();
  });

  it('returns login and match: true when username matches', async () => {
    mockGet([
      { status: 200, body: { login: 'testuser' } },
      { status: 200, body: [{ login: 'myorg' }] }
    ]);
    const result = await verifyToken('ghp_valid', 'testuser');
    expect(result.valid).toBe(true);
    expect(result.login).toBe('testuser');
    expect(result.match).toBe(true);
    expect(result.orgs).toEqual(['myorg']);
  });

  it('returns match: false when login differs from expected username', async () => {
    mockGet([
      { status: 200, body: { login: 'other-user' } },
      { status: 200, body: [] }
    ]);
    const result = await verifyToken('ghp_valid', 'testuser');
    expect(result.match).toBe(false);
  });
});

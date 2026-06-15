const https = require('https');

function apiGet(urlPath, token) {
  return new Promise((resolve, reject) => {
    https.get(
      { hostname: 'api.github.com', path: urlPath, headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'git-account-setup' } },
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    ).on('error', reject);
  });
}

async function verifyToken(token, expectedUsername) {
  const { status, body } = await apiGet('/user', token);
  if (status !== 200) return { valid: false, login: null, match: false, orgs: [] };

  const login = body.login;
  const orgsResult = await apiGet('/user/orgs', token);
  const orgs = orgsResult.status === 200 ? orgsResult.body.map(o => o.login) : [];

  return { valid: true, login, match: login === expectedUsername, orgs };
}

module.exports = { verifyToken };

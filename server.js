const express = require('express');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { readConfigForPath } = require('./lib/gitconfig');
const { verifyToken } = require('./lib/github');
const { applySetup } = require('./lib/setup');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  const repoPath = req.query.path;
  if (!repoPath) return res.status(400).json({ error: 'path required' });
  const config = readConfigForPath(repoPath);
  res.json(config ?? { configured: false });
});

app.post('/api/verify-token', async (req, res) => {
  const { token, username } = req.body;
  if (!token || !username) return res.status(400).json({ error: 'token and username required' });
  try {
    res.json(await verifyToken(token, username));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apply', (req, res) => {
  const { path: repoPath, name, email, username, token } = req.body;
  if (!repoPath || !name || !email || !username || !token) {
    return res.status(400).json({ error: 'all fields required' });
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const emit = (type, data) => res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  try {
    applySetup({ path: repoPath, name, email, username, token }, emit);
  } catch (err) {
    emit('error', err.message);
  }
  res.end();
});

app.post('/api/done', (req, res) => {
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 100);
});

function findFreePort() {
  return new Promise(resolve => {
    const s = net.createServer();
    s.listen(0, () => { const port = s.address().port; s.close(() => resolve(port)); });
  });
}

async function start() {
  const port = await findFreePort();
  const portFile = process.env.PORT_FILE;
  app.listen(port, () => {
    if (portFile) fs.writeFileSync(portFile, String(port));
  });
}

if (require.main === module) start();

module.exports = app;

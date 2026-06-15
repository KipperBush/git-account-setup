const { existsSync, readFileSync, writeFileSync, chmodSync } = require('fs');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

function toSlug(username) {
  return username
    .replace(/([a-z])([A-Z])/g, '$1-$2')  // camelCase → camel-Case
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
}

function expandPath(p) {
  if (!p) return p;
  return p.replace(/^~/, os.homedir());
}

// Returns existing config for a repo path, or null if not configured.
function readConfigForPath(repoPath) {
  const expanded = expandPath(repoPath);
  const normalized = expanded.endsWith('/') ? expanded : `${expanded}/`;
  const gitconfigPath = path.join(os.homedir(), '.gitconfig');

  if (!existsSync(gitconfigPath)) return null;

  const lines = readFileSync(gitconfigPath, 'utf8').split('\n');
  let identityFilePath = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`gitdir:${normalized}`)) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next.startsWith('path =')) {
          identityFilePath = expandPath(next.slice('path ='.length).trim());
          break;
        }
        if (next.startsWith('[')) break;
      }
      break;
    }
  }

  if (!identityFilePath || !existsSync(identityFilePath)) return null;

  const identity = readFileSync(identityFilePath, 'utf8');
  const name = identity.match(/^\s*name\s*=\s*(.+)$/m)?.[1]?.trim() ?? '';
  const email = identity.match(/^\s*email\s*=\s*(.+)$/m)?.[1]?.trim() ?? '';

  // Extract username from credential script path listed in identity file
  let username = '';
  const credMatch = identity.match(/helper\s*=\s*!([^\n]+\.git-credential[^\n]+)/m);
  if (credMatch) {
    const credPath = expandPath(credMatch[1].trim());
    if (existsSync(credPath)) {
      const credContent = readFileSync(credPath, 'utf8');
      username = credContent.match(/echo username=(.+)/)?.[1]?.trim() ?? '';
    }
  }

  return { configured: true, name, email, username };
}

function hasIncludeIf(repoPath) {
  const expanded = expandPath(repoPath);
  const normalized = expanded.endsWith('/') ? expanded : `${expanded}/`;
  const gitconfigPath = path.join(os.homedir(), '.gitconfig');
  if (!existsSync(gitconfigPath)) return false;
  return readFileSync(gitconfigPath, 'utf8').includes(`gitdir:${normalized}`);
}

function writeCredentialScript(slug, username) {
  const ghPath = execSync('which gh').toString().trim();
  const credPath = path.join(os.homedir(), `.git-credential-${slug}`);
  writeFileSync(credPath, `#!/bin/sh\necho username=${username}\necho password=$(${ghPath} auth token --user ${username})\n`);
  chmodSync(credPath, '755');
  return credPath;
}

function writeIdentityFile(slug, { name, email }) {
  const credPath = path.join(os.homedir(), `.git-credential-${slug}`);
  const identityPath = path.join(os.homedir(), `.gitconfig-${slug}`);
  writeFileSync(identityPath, `[user]\n    name = ${name}\n    email = ${email}\n[credential "https://github.com"]\n    helper =\n    helper = !${credPath}\n`);
  return identityPath;
}

function addIncludeIf(repoPath, slug) {
  if (hasIncludeIf(repoPath)) return;
  const expanded = expandPath(repoPath);
  const normalized = expanded.endsWith('/') ? expanded : `${expanded}/`;
  const identityPath = path.join(os.homedir(), `.gitconfig-${slug}`);
  execSync(`git config --global "includeIf.gitdir:${normalized}.path" "${identityPath}"`);
}

module.exports = { toSlug, expandPath, readConfigForPath, hasIncludeIf, writeCredentialScript, writeIdentityFile, addIncludeIf };

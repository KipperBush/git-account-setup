const { execSync } = require('child_process');
const { toSlug, writeCredentialScript, writeIdentityFile, addIncludeIf } = require('./gitconfig');

// emit(type, message) — types: 'step', 'success', 'error', 'done'
function applySetup({ path, name, email, username, token }, emit) {
  const slug = toSlug(username);

  emit('step', 'Storing token in macOS Keychain via gh...');
  execSync('gh auth login --with-token --hostname github.com', { input: token, stdio: ['pipe', 'pipe', 'pipe'] });
  emit('success', 'Token stored in Keychain');

  emit('step', `Writing ~/.git-credential-${slug}...`);
  writeCredentialScript(slug, username);
  emit('success', 'Credential script created');

  emit('step', `Writing ~/.gitconfig-${slug}...`);
  writeIdentityFile(slug, { name, email });
  emit('success', 'Identity file created');

  emit('step', 'Updating ~/.gitconfig with includeIf...');
  addIncludeIf(path, slug);
  emit('success', 'gitconfig updated');

  emit('done', `cd ${path} && git config user.email`);
}

module.exports = { applySetup };

const os = require('os');
const fs = require('fs');
const path = require('path');
const { toSlug, expandPath } = require('../lib/gitconfig');

let tmpDir;
let homeSpy;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitconfig-test-'));
  homeSpy = jest.spyOn(os, 'homedir').mockReturnValue(tmpDir);
});

afterEach(() => {
  homeSpy.mockRestore();
  fs.rmSync(tmpDir, { recursive: true });
});

describe('toSlug', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(toSlug('MyOrgUser')).toBe('my-org-user');
  });
  it('preserves hyphens', () => {
    expect(toSlug('nevo-kb')).toBe('nevo-kb');
  });
  it('replaces dots', () => {
    expect(toSlug('user.name')).toBe('user-name');
  });
});

describe('expandPath', () => {
  it('expands ~ to home dir', () => {
    expect(expandPath('~/Repo/test')).toBe(`${os.homedir()}/Repo/test`);
  });
  it('passes through absolute paths unchanged', () => {
    expect(expandPath('/absolute/path')).toBe('/absolute/path');
  });
  it('handles null', () => {
    expect(expandPath(null)).toBeNull();
  });
});

describe('hasIncludeIf', () => {
  const { hasIncludeIf } = require('../lib/gitconfig');

  it('returns false when .gitconfig does not exist', () => {
    expect(hasIncludeIf('~/Repo/test')).toBe(false);
  });

  it('returns true when path is present in .gitconfig', () => {
    const repoPath = path.join(tmpDir, 'Repo', 'test');
    fs.writeFileSync(path.join(tmpDir, '.gitconfig'),
      `[includeIf "gitdir:${repoPath}/"]\n    path = ${tmpDir}/.gitconfig-test\n`);
    expect(hasIncludeIf(repoPath)).toBe(true);
  });

  it('returns false when a different path is in .gitconfig', () => {
    fs.writeFileSync(path.join(tmpDir, '.gitconfig'),
      `[includeIf "gitdir:${tmpDir}/Repo/other/"]\n    path = ${tmpDir}/.gitconfig-other\n`);
    expect(hasIncludeIf('~/Repo/test')).toBe(false);
  });
});

describe('writeCredentialScript', () => {
  const { writeCredentialScript } = require('../lib/gitconfig');

  it('creates an executable shell script with the correct content', () => {
    writeCredentialScript('test-slug', 'testuser');
    const credPath = path.join(tmpDir, '.git-credential-test-slug');
    expect(fs.existsSync(credPath)).toBe(true);
    const content = fs.readFileSync(credPath, 'utf8');
    expect(content).toContain('echo username="testuser"');
    expect(content).toContain('--user "testuser"');
    const stat = fs.statSync(credPath);
    expect(stat.mode & 0o755).toBe(0o755);
  });

  it('throws on invalid username', () => {
    expect(() => writeCredentialScript('slug', 'user;injection')).toThrow('Invalid GitHub username');
  });
});

describe('writeIdentityFile', () => {
  const { writeIdentityFile } = require('../lib/gitconfig');

  it('creates a gitconfig identity file with user and credential sections', () => {
    // Create the credential script first so the path exists
    fs.writeFileSync(path.join(tmpDir, '.git-credential-test-slug'), '#!/bin/sh\n');
    writeIdentityFile('test-slug', { name: 'Test User', email: 'test@example.com' });
    const identityPath = path.join(tmpDir, '.gitconfig-test-slug');
    expect(fs.existsSync(identityPath)).toBe(true);
    const content = fs.readFileSync(identityPath, 'utf8');
    expect(content).toContain('name = Test User');
    expect(content).toContain('email = test@example.com');
    expect(content).toContain('[credential "https://github.com"]');
  });
});

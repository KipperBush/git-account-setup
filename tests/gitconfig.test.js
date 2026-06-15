const os = require('os');
const path = require('path');
const { toSlug, expandPath } = require('../lib/gitconfig');

describe('toSlug', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(toSlug('RealfinityKipper')).toBe('realfinity-kipper');
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

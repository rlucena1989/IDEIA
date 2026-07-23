import { VERSION, NAME, getCoreVersion } from '../src/index';

describe('@ideia/core exports', () => {
  it('should export VERSION as a non-empty string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });

  it('should export NAME as the correct package name', () => {
    expect(NAME).toBe('@ideia/core');
    expect(typeof NAME).toBe('string');
  });

  it('should export getCoreVersion as a function', () => {
    expect(typeof getCoreVersion).toBe('function');
  });

  it('should return version string from getCoreVersion', () => {
    const v = getCoreVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });

  it('should return consistent version between VERSION and getCoreVersion()', () => {
    expect(getCoreVersion()).toBe(VERSION);
  });
});

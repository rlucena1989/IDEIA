import { getCoreVersion } from '../index';

describe('@ideia/core', () => {
  it('should return version string', () => {
    const v = getCoreVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });
});

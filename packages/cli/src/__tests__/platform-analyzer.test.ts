import { getPlatformInfo, validatePlatform } from '../runtime/platform-analyzer';

describe('platform-analyzer', () => {
  it('should return platform info', () => {
    const info = getPlatformInfo();
    expect(info.os).toBeDefined();
    expect(info.arch).toBeDefined();
    expect(info.nodeVersion).toBeDefined();
    expect(typeof info.isWindows).toBe('boolean');
    expect(typeof info.isLinux).toBe('boolean');
  });

  it('should validate platform', () => {
    const info = getPlatformInfo();
    const validation = validatePlatform(info);
    expect(validation.passed).toBeGreaterThanOrEqual(0);
    expect(validation.score).toBeGreaterThanOrEqual(0);
    expect(validation.summary).toContain('Plataforma');
  });

  it('should detect node >= 18', () => {
    const info = getPlatformInfo();
    const validation = validatePlatform(info);
    const nodeRule = validation.rules.find(r => r.id === 'PLATFORM-NODE-VERSION');
    expect(nodeRule).toBeDefined();
    expect(nodeRule!.pass).toBe(true);
  });
});
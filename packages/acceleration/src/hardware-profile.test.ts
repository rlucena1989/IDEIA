import { tierFromHardware } from './hardware-profile';
import type { HardwareProfile } from './types';

describe('hardware-profile', () => {
  const createProfile = (partial: Partial<HardwareProfile>): HardwareProfile => ({
    cpuCores: 4,
    cpuUsage: 0.5,
    ramTotalGb: 16,
    ramFreeGb: 8,
    diskFreeGb: 100,
    nodeVersion: '20.0.0',
    platform: 'linux',
    ...partial
  });

  it('should return low tier for basic hardware', () => {
    expect(tierFromHardware(createProfile({ cpuCores: 2, ramTotalGb: 4, diskFreeGb: 10 }))).toBe('low');
  });

  it('should return medium tier', () => {
    expect(tierFromHardware(createProfile({ cpuCores: 8, ramTotalGb: 8, diskFreeGb: 50 }))).toBe('medium');
  });

  it('should return high tier for powerful hardware', () => {
    expect(tierFromHardware(createProfile({ cpuCores: 20, ramTotalGb: 32, diskFreeGb: 200 }))).toBe('high');
  });

  it('should compute score boundary correctly', () => {
    expect(tierFromHardware(createProfile({ cpuCores: 8, ramTotalGb: 10, diskFreeGb: 60 }))).toBe('medium');
    expect(tierFromHardware(createProfile({ cpuCores: 20, ramTotalGb: 20, diskFreeGb: 200 }))).toBe('high');
  });
});
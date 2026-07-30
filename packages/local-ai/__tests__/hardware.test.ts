import { describe, it, expect } from '@jest/globals';
import { HardwareDetector } from '../src/hardware';

describe('HardwareDetector', () => {
  it('detects hardware info', () => {
    const detector = new HardwareDetector();
    const info = detector.detect();
    expect(info).toBeDefined();
    expect(info.platform).toBeDefined();
    expect(info.cpuCores).toBeGreaterThan(0);
    expect(info.totalMemoryGb).toBeGreaterThan(0);
  });

  it('cpu is always available', () => {
    const detector = new HardwareDetector();
    expect(detector.isBackendAvailable('cpu')).toBe(true);
  });
});

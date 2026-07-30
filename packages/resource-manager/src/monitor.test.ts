import { ResourceMonitor } from './monitor';
import { DEFAULT_RESOURCE_BUDGET } from './types';

const mockTotalMem = 16 * 1024 * 1024 * 1024;
const mockFreeMem = 4 * 1024 * 1024 * 1024;
const mockLoadAvg: [number, number, number] = [2.5, 2.0, 1.5];
const mockCpus = 8;
const mockUptime = 12345;
const mockPlatform = 'win32';

jest.mock('os', () => ({
  totalmem: jest.fn(() => mockTotalMem),
  freemem: jest.fn(() => mockFreeMem),
  loadavg: jest.fn(() => mockLoadAvg),
  cpus: jest.fn(() => Array.from({ length: mockCpus }, () => ({}))),
  uptime: jest.fn(() => mockUptime),
  platform: jest.fn(() => mockPlatform),
}));

describe('ResourceMonitor', () => {
  let monitor: ResourceMonitor;
  let mockDate: jest.SpyInstance;
  let memoryUsageSpy: jest.SpyInstance;
  const baseTime = 1000000;

  beforeEach(() => {
    mockDate = jest.spyOn(Date, 'now').mockReturnValue(baseTime);
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 300 * 1024 * 1024,
      heapTotal: 512 * 1024 * 1024,
      rss: 600 * 1024 * 1024,
      external: 50 * 1024 * 1024,
      arrayBuffers: 0,
    });
    monitor = new ResourceMonitor(12, 60000);
  });

  afterEach(() => {
    mockDate.mockRestore();
    memoryUsageSpy.mockRestore();
  });

  it('snapshot returns a valid ResourceSnapshot', () => {
    const snap = monitor.snapshot();

    expect(snap.timestamp).toBe(baseTime);
    expect(snap.memory.totalMB).toBe(16384);
    expect(snap.memory.freeMB).toBe(4096);
    expect(snap.memory.usedPercent).toBe(75);
    expect(snap.memory.processHeapUsedMB).toBe(300);
    expect(snap.memory.processRSSMB).toBe(600);
    expect(snap.memory.processExternalMB).toBe(50);
    expect(snap.cpu.loadAvg1m).toBe(2.5);
    expect(snap.cpu.loadAvg5m).toBe(2.0);
    expect(snap.cpu.loadAvg15m).toBe(1.5);
    expect(snap.cpu.cores).toBe(8);
    expect(snap.cpu.percentEstimate).toBe(31);
    expect(snap.uptime).toBe(12345);
    expect(snap.platform).toBe('win32');
  });

  it('getSamples returns a copy of samples array', () => {
    monitor.snapshot();
    const samples = monitor.getSamples();
    expect(samples).toHaveLength(1);
    samples.length = 0;
    expect(monitor.getSamples()).toHaveLength(1);
  });

  it('getLastSnapshot returns latest snapshot or null', () => {
    expect(monitor.getLastSnapshot()).toBeNull();
    monitor.snapshot();
    expect(monitor.getLastSnapshot()).not.toBeNull();
    expect(monitor.getLastSnapshot()!.timestamp).toBe(baseTime);
  });

  it('snapshot prunes samples outside the window', () => {
    for (let i = 0; i < 5; i++) {
      mockDate.mockReturnValue(baseTime - 120000 + i * 1000);
      monitor.snapshot();
    }
    mockDate.mockReturnValue(baseTime);
    monitor.snapshot();
    const samples = monitor.getSamples();
    for (const s of samples) {
      expect(s.timestamp).toBeGreaterThanOrEqual(baseTime - 60000);
    }
  });

  it('analyzeMemoryTrend returns no leak when fewer than 3 samples', () => {
    monitor.snapshot();
    const trend = monitor.analyzeMemoryTrend();
    expect(trend.isLeaking).toBe(false);
    expect(trend.leakRateMBperMin).toBe(0);
    expect(trend.projectedOOMminutes).toBeNull();
  });

  it('analyzeMemoryTrend detects leak with increasing heap', () => {
    const wideMonitor = new ResourceMonitor(12, 300000);
    for (let i = 0; i < 10; i++) {
      mockDate.mockReturnValue(baseTime + i * 60000);
      memoryUsageSpy.mockReturnValue({
        heapUsed: (200 + i * 100) * 1024 * 1024,
        heapTotal: 512 * 1024 * 1024,
        rss: 600 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 0,
      });
      wideMonitor.snapshot();
    }
    const trend = wideMonitor.analyzeMemoryTrend();
    expect(trend.isLeaking).toBe(true);
    expect(trend.leakRateMBperMin).toBeGreaterThan(1);
    expect(trend.projectedOOMminutes).not.toBeNull();
  });

  it('checkBudget returns ok when within limits', () => {
    monitor.snapshot();
    const result = monitor.checkBudget(DEFAULT_RESOURCE_BUDGET);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('checkBudget returns violations when memory exceeds limit', () => {
    const os = jest.requireMock('os');
    os.totalmem.mockReturnValue(2 * 1024 * 1024 * 1024);
    os.freemem.mockReturnValue(100 * 1024 * 1024);
    memoryUsageSpy.mockReturnValue({
      heapUsed: 4000 * 1024 * 1024,
      heapTotal: 5000 * 1024 * 1024,
      rss: 6000 * 1024 * 1024,
      external: 50 * 1024 * 1024,
      arrayBuffers: 0,
    });

    monitor.snapshot();
    const result = monitor.checkBudget({ ...DEFAULT_RESOURCE_BUDGET, maxMemoryPercent: 50 });
    expect(result.ok).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.violations[0]).toContain('Memory');
  });

  it('reset clears all samples', () => {
    monitor.snapshot();
    expect(monitor.getSamples()).toHaveLength(1);
    monitor.reset();
    expect(monitor.getSamples()).toHaveLength(0);
    expect(monitor.getLastSnapshot()).toBeNull();
  });
});

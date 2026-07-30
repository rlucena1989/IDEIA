import { DefaultResourceMonitor } from './resources';

describe('DefaultResourceMonitor', () => {
  it('should apply default limits when none provided', () => {
    const monitor = new DefaultResourceMonitor();
    expect(monitor.getMemoryUsage()).toBeGreaterThan(0);
    expect(monitor.getCpuUsage()).toBe(0);
  });

  it('should accept custom limits', () => {
    const monitor = new DefaultResourceMonitor({ maxMemory: 10 * 1024 * 1024 * 1024, maxCpu: 90, maxProcesses: 10, timeout: 5000 });
    expect(monitor.isWithinLimits()).toBe(true);
  });

  it('should fire onResourceWarning when memory exceeds limit', () => {
    const monitor = new DefaultResourceMonitor({ maxMemory: 1 });
    const warning = jest.fn();
    monitor.onResourceWarning(warning);

    const result = monitor.isWithinLimits();
    expect(result).toBe(false);
    expect(warning).toHaveBeenCalledWith(expect.objectContaining({ maxMemory: 1 }));
  });

  it('should fire onResourceWarning when CPU exceeds limit', () => {
    const monitor = new DefaultResourceMonitor({ maxMemory: 10 * 1024 * 1024 * 1024, maxCpu: -1 });
    const warning = jest.fn();
    monitor.onResourceWarning(warning);

    const result = monitor.isWithinLimits();
    expect(result).toBe(false);
    expect(warning).toHaveBeenCalled();
  });

  it('should return true when usage is within limits', () => {
    const monitor = new DefaultResourceMonitor({ maxMemory: 10 * 1024 * 1024 * 1024, maxCpu: 100 });
    expect(monitor.isWithinLimits()).toBe(true);
  });
});

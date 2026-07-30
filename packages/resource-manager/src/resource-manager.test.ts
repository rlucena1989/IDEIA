import { ResourceManager, createResourceManager } from './resource-manager';
import { ResourceMonitor } from './monitor';
import { SelfHealer } from './self-healing';
import { DEFAULT_CONFIG, ResourceSnapshot } from './types';

jest.mock('@ideia/event-bus', () => ({
  EventBus: jest.fn().mockImplementation(() => ({
    emit: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn().mockImplementation(() => ({
    append: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@ideia/control-tower', () => ({
  ControlTower: jest.fn().mockImplementation(() => ({
    updateHealth: jest.fn(),
  })),
}));

jest.mock('@ideia/safety-circuit', () => ({
  SafetyCircuit: jest.fn().mockImplementation(() => ({
    evaluate: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@ideia/resilience-engine', () => ({
  DegradationManager: jest.fn().mockImplementation(() => ({
    mode: 'normal',
    setMode: jest.fn(),
  })),
}));

jest.mock('@ideia/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockSnapshot: ResourceSnapshot = {
  timestamp: 1000,
  memory: {
    totalMB: 16384,
    freeMB: 8192,
    usedPercent: 50,
    processHeapUsedMB: 200,
    processHeapTotalMB: 512,
    processRSSMB: 400,
    processExternalMB: 30,
  },
  cpu: {
    loadAvg1m: 1,
    loadAvg5m: 0.8,
    loadAvg15m: 0.6,
    cores: 8,
    percentEstimate: 12,
  },
  uptime: 3600,
  platform: 'linux',
};

describe('ResourceManager', () => {
  let eventBus: { emit: ReturnType<typeof jest.fn> };
  let auditTrail: { append: ReturnType<typeof jest.fn> };
  let controlTower: { updateHealth: ReturnType<typeof jest.fn> };
  let safetyCircuit: { evaluate: ReturnType<typeof jest.fn> };
  let degradation: { mode: string; setMode: ReturnType<typeof jest.fn> };
  let manager: ResourceManager;

  beforeEach(() => {
    jest.useFakeTimers();
    eventBus = { emit: jest.fn().mockResolvedValue(undefined) };
    auditTrail = { append: jest.fn().mockResolvedValue(undefined) };
    controlTower = { updateHealth: jest.fn() };
    safetyCircuit = { evaluate: jest.fn().mockResolvedValue(undefined) };
    degradation = { mode: 'normal', setMode: jest.fn() };
    jest.spyOn(ResourceMonitor.prototype, 'snapshot').mockReturnValue(mockSnapshot);
    jest.spyOn(ResourceMonitor.prototype, 'getLastSnapshot').mockReturnValue(mockSnapshot);
    jest.spyOn(ResourceMonitor.prototype, 'getSamples').mockReturnValue([mockSnapshot]);
    jest.spyOn(ResourceMonitor.prototype, 'checkBudget').mockReturnValue({ ok: true, violations: [] });
    jest.spyOn(ResourceMonitor.prototype, 'analyzeMemoryTrend').mockReturnValue({
      slope: 0,
      intercept: 200,
      recentSamples: [mockSnapshot],
      isLeaking: false,
      leakRateMBperMin: 0,
      projectedOOMminutes: null,
    });
    jest.spyOn(SelfHealer.prototype, 'executeAction').mockResolvedValue({ ok: true, message: 'done' });
    manager = new ResourceManager(eventBus as any, auditTrail as any, controlTower as any, safetyCircuit as any, degradation as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    manager.stop();
  });

  it('constructor applies default config when none given', () => {
    const m = new ResourceManager(eventBus as any, auditTrail as any, controlTower as any, safetyCircuit as any, degradation as any);
    const cfg = m.getConfig();
    expect(cfg.monitorIntervalMs).toBe(DEFAULT_CONFIG.monitorIntervalMs);
    expect(cfg.autoDegrade).toBe(true);
  });

  it('constructor merges partial config', () => {
    const m = new ResourceManager(eventBus as any, auditTrail as any, controlTower as any, safetyCircuit as any, degradation as any, {
      monitorIntervalMs: 10000,
      autoDegrade: false,
    });
    const cfg = m.getConfig();
    expect(cfg.monitorIntervalMs).toBe(10000);
    expect(cfg.autoDegrade).toBe(false);
    expect(cfg.memoryTrendSampleSize).toBe(DEFAULT_CONFIG.memoryTrendSampleSize);
  });

  it('start begins monitoring and sets running flag', () => {
    manager.start();
    expect(manager.isRunning()).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resource-manager.started', source: 'resource-manager' }),
    );
  });

  it('start is idempotent', () => {
    manager.start();
    manager.start();
    expect(ResourceMonitor.prototype.snapshot).toHaveBeenCalledTimes(1);
  });

  it('stop halts monitoring', () => {
    manager.start();
    manager.stop();
    expect(manager.isRunning()).toBe(false);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resource-manager.stopped', source: 'resource-manager' }),
    );
  });

  it('updateConfig recreates monitor and healer with new values', () => {
    jest.restoreAllMocks();
    const m = new ResourceManager(eventBus as any, auditTrail as any, controlTower as any, safetyCircuit as any, degradation as any);
    m.updateConfig({ memoryTrendSampleSize: 20, selfHealing: { ...DEFAULT_CONFIG.selfHealing, cooldownMs: 5000 } });
    const cfg = m.getConfig();
    expect(cfg.memoryTrendSampleSize).toBe(20);
    expect(cfg.selfHealing.cooldownMs).toBe(5000);
  });

  it('cycle handles budget violations and triggers safety circuit', async () => {
    const checkBudgetSpy = jest.spyOn(ResourceMonitor.prototype, 'checkBudget').mockReturnValue({
      ok: false,
      violations: ['Memory 85% > 80%', 'CPU 95% > 90%'],
    });
    manager.start();
    await jest.advanceTimersByTimeAsync(DEFAULT_CONFIG.monitorIntervalMs);
    expect(manager.getTotalActions()).toBeGreaterThanOrEqual(1);
    expect(safetyCircuit.evaluate).toHaveBeenCalled();
    expect(manager.getLastTrigger()).not.toBeNull();
    checkBudgetSpy.mockRestore();
  });

  it('cycle handles memory leak detection', async () => {
    const trendSpy = jest.spyOn(ResourceMonitor.prototype, 'analyzeMemoryTrend').mockReturnValue({
      slope: 5,
      intercept: 200,
      recentSamples: [mockSnapshot],
      isLeaking: true,
      leakRateMBperMin: 60,
      projectedOOMminutes: 42,
    });
    manager.start();
    await jest.advanceTimersByTimeAsync(DEFAULT_CONFIG.monitorIntervalMs);
    expect(manager.getLastTrigger()).not.toBeNull();
    expect(manager.getLastTrigger()!.reason).toContain('memory_leak');
    trendSpy.mockRestore();
  });

  it('handleAutoDegradation transitions from normal to degraded on budget fail', async () => {
    const checkBudgetSpy = jest.spyOn(ResourceMonitor.prototype, 'checkBudget').mockReturnValue({
      ok: false,
      violations: ['Memory 85% > 80%'],
    });
    manager.start();
    await jest.advanceTimersByTimeAsync(DEFAULT_CONFIG.monitorIntervalMs);
    expect(degradation.setMode).toHaveBeenCalledWith('degraded');
    checkBudgetSpy.mockRestore();
  });

  it('handleAutoDegradation transitions to emergency on high resource usage', async () => {
    const highSnap: ResourceSnapshot = {
      ...mockSnapshot,
      memory: { ...mockSnapshot.memory, usedPercent: 96 },
      cpu: { ...mockSnapshot.cpu, percentEstimate: 97 },
    };
    jest.spyOn(ResourceMonitor.prototype, 'getLastSnapshot').mockReturnValue(highSnap);
    jest.spyOn(ResourceMonitor.prototype, 'snapshot').mockReturnValue(highSnap);
    manager.start();
    await jest.advanceTimersByTimeAsync(DEFAULT_CONFIG.monitorIntervalMs);
    expect(degradation.setMode).toHaveBeenCalledWith('emergency');
  });

  it('getStatus returns complete state object', () => {
    manager.start();
    const status = manager.getStatus();
    expect(status).toHaveProperty('running', true);
    expect(status).toHaveProperty('config');
    expect(status).toHaveProperty('lastSnapshot');
    expect(status).toHaveProperty('memoryTrend');
    expect(status).toHaveProperty('budgetOk');
    expect(status).toHaveProperty('budgetViolations');
    expect(status).toHaveProperty('degradationMode', 'normal');
    expect(status).toHaveProperty('totalActions');
    expect(status).toHaveProperty('lastTrigger');
  });

  it('createResourceManager factory returns a ResourceManager instance', () => {
    const rm = createResourceManager(eventBus as any, auditTrail as any, controlTower as any, safetyCircuit as any, degradation as any);
    expect(rm).toBeInstanceOf(ResourceManager);
  });

  it('cycle errors are caught and logged', async () => {
    jest.restoreAllMocks();
    jest.spyOn(ResourceMonitor.prototype, 'snapshot').mockReturnValue(mockSnapshot);
    manager.start();
    jest.spyOn(ResourceMonitor.prototype, 'snapshot').mockImplementation(() => {
      throw new Error('snapshot failure');
    });
    await expect(jest.advanceTimersByTimeAsync(DEFAULT_CONFIG.monitorIntervalMs)).resolves.toBeUndefined();
  });
});

import { SafetyCircuit, createSafetyCircuit } from '../src/safety-circuit';
import { CircuitBreakerManager } from '../src/circuit-breaker-manager';
import { EmergencyStop, createEmergencyStop } from '../src/e-stop';
import { SafetyArchitecture } from '../src/safety-architecture';
import { SafetyReportGenerator } from '../src/safety-report';

describe('Chaos Safety Tests', () => {
  describe('Loop Detection', () => {
    it('should allow first auto-fixes and pause after threshold', async () => {
      const sc = createSafetyCircuit();
      let paused = false;

      for (let i = 0; i < 10; i++) {
        const decision = await sc.evaluate({ type: 'loop-detection', file: 'test.ts', details: `Iteration ${i}` });
        if (decision.action === 'pause') paused = true;
      }

      expect(paused).toBe(true);
      const status = sc.getStatus();
      expect(status.activeTriggers.length).toBeGreaterThan(0);
    });

    it('should reset loop counter after window expires', async () => {
      const sc = createSafetyCircuit();
      const file = 'test-reset.ts';

      for (let i = 0; i < 6; i++) {
        const decision = await sc.evaluate({ type: 'loop-detection', file, details: `Iteration ${i}` });
        if (i < 5) expect(decision.action).toBe('allow');
      }

      sc.reset('loop-detection');
      const decision = await sc.evaluate({ type: 'loop-detection', file, details: 'After reset' });
      expect(decision.action).toBe('allow');
    });
  });

  describe('Regression Spike', () => {
    it('should trigger rollback on significant coverage drop', async () => {
      const sc = createSafetyCircuit();

      await sc.evaluate({ type: 'regression-spike', metadata: { coverage: 80 } });
      const decision = await sc.evaluate({ type: 'regression-spike', metadata: { coverage: 70 } });

      expect(decision.action).toBe('rollback');
      expect(decision.severity).toBe('critical');
    });

    it('should allow minor coverage fluctuations', async () => {
      const sc = createSafetyCircuit();

      await sc.evaluate({ type: 'regression-spike', metadata: { coverage: 80 } });
      const decision = await sc.evaluate({ type: 'regression-spike', metadata: { coverage: 78 } });

      expect(decision.action).toBe('allow');
    });
  });

  describe('Breakage Chain', () => {
    it('should trigger pause after 3 consecutive contract breaks', async () => {
      const sc = createSafetyCircuit();
      let paused = false;

      for (let i = 0; i < 5; i++) {
        const decision = await sc.evaluate({ type: 'breakage-chain', details: `Contract break ${i}` });
        if (decision.action === 'pause') paused = true;
      }

      expect(paused).toBe(true);
      const status = sc.getStatus();
      expect(status.breakageChainCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Resource Exhaustion', () => {
    it('should enter degraded mode on high memory usage', async () => {
      const sc = createSafetyCircuit();

      const decision = await sc.evaluate({
        type: 'resource-exhaustion',
        metadata: { memoryPercent: 95, cpuPercent: 30 },
      });

      expect(decision.action).toBe('degraded');
      expect(decision.severity).toBe('critical');
    });

    it('should enter degraded mode on high CPU usage', async () => {
      const sc = createSafetyCircuit();

      const decision = await sc.evaluate({
        type: 'resource-exhaustion',
        metadata: { memoryPercent: 50, cpuPercent: 95 },
      });

      expect(decision.action).toBe('degraded');
    });

    it('should allow normal resource levels', async () => {
      const sc = createSafetyCircuit();

      const decision = await sc.evaluate({
        type: 'resource-exhaustion',
        metadata: { memoryPercent: 40, cpuPercent: 30 },
      });

      expect(decision.action).toBe('allow');
    });
  });

  describe('User Override', () => {
    it('should stop on user override', async () => {
      const sc = createSafetyCircuit();

      const decision = await sc.evaluate({ type: 'user-override', details: 'User requested stop' });

      expect(decision.action).toBe('stop');
      expect(decision.severity).toBe('critical');
    });
  });

  describe('Circuit Breaker', () => {
    it('should trip when error rate exceeds threshold', async () => {
      const bus = { emit: jest.fn().mockResolvedValue({}), subscribe: jest.fn().mockResolvedValue('sub-id'), unsubscribe: jest.fn().mockResolvedValue(true), getHistory: jest.fn().mockResolvedValue([]), clearHistory: jest.fn().mockResolvedValue(undefined), subscriberCount: jest.fn().mockResolvedValue(0), subscribeOnce: jest.fn().mockResolvedValue('sub-id') };
      const cbm = new CircuitBreakerManager(bus as any, undefined, [
        { type: 'error-rate', enabled: true, threshold: 1, cooldownMs: 5000, action: 'stop' },
      ]);

      const result = await cbm.evaluateSingle('error-rate', 5);
      expect(result.tripped).toBe(true);
      expect(result.action).toBe('stop');
    });

    it('should reset after trip', async () => {
      const bus = { emit: jest.fn().mockResolvedValue({}), subscribe: jest.fn().mockResolvedValue('sub-id'), unsubscribe: jest.fn().mockResolvedValue(true), getHistory: jest.fn().mockResolvedValue([]), clearHistory: jest.fn().mockResolvedValue(undefined), subscriberCount: jest.fn().mockResolvedValue(0), subscribeOnce: jest.fn().mockResolvedValue('sub-id') };
      const cbm = new CircuitBreakerManager(bus as any, undefined, [
        { type: 'error-rate', enabled: true, threshold: 1, cooldownMs: 5000, action: 'stop' },
      ]);

      await cbm.evaluateSingle('error-rate', 5);
      const beforeReset = cbm.getStates().find(s => s.type === 'error-rate')!;
      expect(beforeReset.tripped).toBe(true);

      cbm.resetBreaker('error-rate');
      const afterReset = cbm.getStates().find(s => s.type === 'error-rate')!;
      expect(afterReset.tripped).toBe(false);
    });

    it('should evaluate all breakers', async () => {
      const bus = { emit: jest.fn().mockResolvedValue({}), subscribe: jest.fn().mockResolvedValue('sub-id'), unsubscribe: jest.fn().mockResolvedValue(true), getHistory: jest.fn().mockResolvedValue([]), clearHistory: jest.fn().mockResolvedValue(undefined), subscriberCount: jest.fn().mockResolvedValue(0), subscribeOnce: jest.fn().mockResolvedValue('sub-id') };
      const cbm = new CircuitBreakerManager(bus as any);

      const results = await cbm.evaluateAll();
      expect(results.length).toBe(5);
    });
  });

  describe('Emergency Stop', () => {
    it('should engage and disengage', async () => {
      const estop = createEmergencyStop();

      expect(estop.isEngaged()).toBe(false);
      await estop.engage('cli', 'Test emergency stop', 'test-user');
      expect(estop.isEngaged()).toBe(true);

      const mode = await estop.recover('resume');
      expect(estop.isEngaged()).toBe(false);
      expect(mode).toBe('normal');
    });

    it('should register listeners and notify on engage', async () => {
      const estop = createEmergencyStop();
      const listener = jest.fn();

      const dispose = estop.onEstop(listener);
      await estop.engage('cli', 'Test');
      expect(listener).toHaveBeenCalled();

      dispose();
      listener.mockClear();
      await estop.engage('cli', 'Test after dispose');
    });
  });

  describe('Safety Architecture — 7 Layers', () => {
    it('should initialize all 7 layers as healthy', async () => {
      const bus = { emit: jest.fn().mockResolvedValue({}), subscribe: jest.fn().mockResolvedValue('sub-id'), unsubscribe: jest.fn().mockResolvedValue(true), getHistory: jest.fn().mockResolvedValue([]), clearHistory: jest.fn().mockResolvedValue(undefined), subscriberCount: jest.fn().mockResolvedValue(0), subscribeOnce: jest.fn().mockResolvedValue('sub-id') };
      const estop = createEmergencyStop(bus as any);
      const sc = createSafetyCircuit(bus as any);
      const cbm = new CircuitBreakerManager(bus as any);
      const arch = new SafetyArchitecture(undefined, bus as any, cbm, estop, sc);

      await arch.initialize();
      const statuses = arch.getAllStatuses();

      expect(statuses).toHaveLength(7);
      expect(statuses.every(s => s.status !== 'failed')).toBe(true);
    });

    it('should enable and disable individual layers', async () => {
      const arch = new SafetyArchitecture();

      arch.disableLayer('sandbox');
      const sandboxStatus = arch.getLayerStatus('sandbox');
      expect(sandboxStatus!.enabled).toBe(false);

      arch.enableLayer('sandbox');
      const sandboxStatus2 = arch.getLayerStatus('sandbox');
      expect(sandboxStatus2!.enabled).toBe(true);
    });
  });

  describe('Safety Report', () => {
    it('should generate comprehensive report', async () => {
      const bus = { emit: jest.fn().mockResolvedValue({}), subscribe: jest.fn().mockResolvedValue('sub-id'), unsubscribe: jest.fn().mockResolvedValue(true), getHistory: jest.fn().mockResolvedValue([]), clearHistory: jest.fn().mockResolvedValue(undefined), subscriberCount: jest.fn().mockResolvedValue(0), subscribeOnce: jest.fn().mockResolvedValue('sub-id') };
      const estop = createEmergencyStop(bus as any);
      const sc = createSafetyCircuit(bus as any);
      const cbm = new CircuitBreakerManager(bus as any);
      const arch = new SafetyArchitecture(undefined, bus as any, cbm, estop, sc);
      await arch.initialize();

      const reportGen = new SafetyReportGenerator();
      const report = reportGen.generateReport(arch.getAllStatuses(), cbm.getStates(), sc.getStatus());

      expect(report.layers).toHaveLength(7);
      expect(report.circuitBreakers).toHaveLength(5);
      expect(report.summary.totalLayers).toBe(7);
      expect(reportGen.formatAsText(report).length).toBeGreaterThan(0);
    });
  });
});

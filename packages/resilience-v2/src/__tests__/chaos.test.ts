import {
  ChaosEngine,
  ChaosScenario,
  BUILTIN_SCENARIOS,
} from '../chaos';

describe('ChaosEngine', () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    engine = new ChaosEngine();
  });

  it('should start inactive', () => {
    expect(engine.isActive()).toBe(false);
  });

  describe('injectLatency', () => {
    it('should activate engine', () => {
      engine.injectLatency('nats', 1000);
      expect(engine.isActive()).toBe(true);
    });

    it('should track active faults', () => {
      engine.injectLatency('nats', 2000);
      const faults = engine.getActiveFaults();
      expect(faults).toHaveLength(1);
      expect(faults[0].type).toBe('latency');
      expect(faults[0].service).toBe('nats');
    });
  });

  describe('injectCrash', () => {
    it('should activate engine', () => {
      engine.injectCrash('llm');
      expect(engine.isActive()).toBe(true);
    });

    it('should track crash fault', () => {
      engine.injectCrash('filesystem');
      const faults = engine.getActiveFaults();
      expect(faults.some(f => f.type === 'crash')).toBe(true);
    });
  });

  describe('injectPartition', () => {
    it('should activate engine', () => {
      engine.injectPartition('nats');
      expect(engine.isActive()).toBe(true);
    });

    it('should track partition fault', () => {
      engine.injectPartition('search');
      const faults = engine.getActiveFaults();
      expect(faults.some(f => f.type === 'partition')).toBe(true);
    });
  });

  describe('injectError', () => {
    it('should activate engine', () => {
      engine.injectError('llm', 'timeout');
      expect(engine.isActive()).toBe(true);
    });

    it('should store error message', () => {
      engine.injectError('llm', 'connection refused');
      const faults = engine.getActiveFaults();
      expect(faults[0].config.error).toBe('connection refused');
    });
  });

  describe('stop', () => {
    it('should clear all faults', () => {
      engine.injectLatency('nats', 1000);
      engine.injectCrash('llm');
      expect(engine.isActive()).toBe(true);
      engine.stop();
      expect(engine.isActive()).toBe(false);
      expect(engine.getActiveFaults()).toHaveLength(0);
    });
  });

  describe('runScenario', () => {
    it('should run a scenario and clear faults after duration', async () => {
      const scenario: ChaosScenario = {
        name: 'test-scenario',
        description: 'test',
        faults: [{ type: 'latency', service: 'nats', config: { ms: 10 } }],
        duration: 50,
        expectedOutcome: 'ok',
      };
      await engine.runScenario(scenario);
      expect(engine.isActive()).toBe(false);
    });

    it('should inject all faults in scenario', async () => {
      const scenario: ChaosScenario = {
        name: 'multi-fault',
        description: 'multiple faults',
        faults: [
          { type: 'latency', service: 'nats', config: { ms: 100 } },
          { type: 'crash', service: 'llm', config: {} },
          { type: 'partition', service: 'search', config: {} },
          { type: 'error', service: 'git', config: { error: 'injected' } },
        ],
        duration: 10,
        expectedOutcome: 'ok',
      };
      await engine.runScenario(scenario);
      expect(engine.isActive()).toBe(false);
    });
  });
});

describe('BUILTIN_SCENARIOS', () => {
  it('should have nats-failover-test scenario', () => {
    const scenario = BUILTIN_SCENARIOS.find(s => s.name === 'nats-failover-test');
    expect(scenario).toBeDefined();
    expect(scenario!.faults.length).toBeGreaterThan(0);
    expect(scenario!.expectedOutcome).toContain('fallback');
  });

  it('should have llm-timeout-test scenario', () => {
    const scenario = BUILTIN_SCENARIOS.find(s => s.name === 'llm-timeout-test');
    expect(scenario).toBeDefined();
    expect(scenario!.faults.some(f => f.type === 'latency')).toBe(true);
  });

  it('should have fs-unavailable-test scenario', () => {
    const scenario = BUILTIN_SCENARIOS.find(s => s.name === 'fs-unavailable-test');
    expect(scenario).toBeDefined();
    expect(scenario!.faults.some(f => f.type === 'crash')).toBe(true);
  });

  it('should have full-system-test scenario', () => {
    const scenario = BUILTIN_SCENARIOS.find(s => s.name === 'full-system-test');
    expect(scenario).toBeDefined();
    expect(scenario!.faults.length).toBe(3);
  });

  it('all scenarios should have required fields', () => {
    for (const s of BUILTIN_SCENARIOS) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.faults.length).toBeGreaterThan(0);
      expect(s.duration).toBeGreaterThan(0);
      expect(s.expectedOutcome).toBeTruthy();
    }
  });
});

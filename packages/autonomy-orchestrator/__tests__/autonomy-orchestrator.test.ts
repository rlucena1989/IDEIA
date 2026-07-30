import { AutonomyOrchestrator } from '../src/autonomy-orchestrator';

describe('AutonomyOrchestrator', () => {
  let orchestrator: AutonomyOrchestrator;

  beforeEach(() => {
    orchestrator = new AutonomyOrchestrator();
  });

  it('should start at default N2 level', () => {
    expect(orchestrator.getLevel()).toBe('N2');
  });

  it('should change level manually', () => {
    expect(orchestrator.setLevel('N3')).toBe(true);
    expect(orchestrator.getLevel()).toBe('N3');
  });

  it('should reject levels above max', () => {
    expect(orchestrator.setLevel('N4')).toBe(true);
    expect(orchestrator.setLevel('N4')).toBe(true);
  });

  it('should track history', () => {
    orchestrator.setLevel('N1');
    const history = orchestrator.getHistory();
    expect(history.events).toHaveLength(1);
    expect(history.currentLevel).toBe('N1');
  });

  it('should suggest N0 on high error rate', () => {
    const suggestion = orchestrator.suggestLevel({ errorRate: 0.5, throughput: 100, latency: 100 });
    expect(suggestion).toBe('N0');
  });

  it('should suggest N0 on high latency', () => {
    const suggestion = orchestrator.suggestLevel({ errorRate: 0.01, throughput: 100, latency: 10000 });
    expect(suggestion).toBe('N0');
  });

  it('should suggest N1 on low throughput', () => {
    const suggestion = orchestrator.suggestLevel({ errorRate: 0.01, throughput: 5, latency: 100 });
    expect(suggestion).toBe('N1');
  });

  it('should suggest N3 on excellent metrics', () => {
    const suggestion = orchestrator.suggestLevel({ errorRate: 0.01, throughput: 100, latency: 500 });
    expect(suggestion).toBe('N3');
  });

  it('should engage and disengage safety', () => {
    orchestrator.engageSafety('Emergency stop');
    expect(orchestrator.isSafetyEngaged()).toBe(true);
    expect(orchestrator.getLevel()).toBe('N0');

    orchestrator.disengageSafety();
    expect(orchestrator.isSafetyEngaged()).toBe(false);
  });
});

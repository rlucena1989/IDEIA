import { describe, it, expect } from '@jest/globals';
import { SloMonitor } from '../src/slo-monitor';
import { ContractVerifier } from '../src/contract-verifier';
import { SLO_TARGETS } from '../src/types';

describe('slo-monitor', () => {
  it('SloMonitor can be constructed with no deps', () => {
    const monitor = new SloMonitor();
    expect(monitor).toBeDefined();
  });

  it('recordMetric and checkSLO work', () => {
    const monitor = new SloMonitor();
    monitor.recordMetric('C1', { latencyP50: 50, availability: 99.95 });
    const result = monitor.checkSLO('C1');
    expect(result).toBeDefined();
    expect(typeof result.status).toBe('string');
    expect(result.contract).toBe('C1');
  });

  it('getDashboard returns dashboard data', () => {
    const monitor = new SloMonitor();
    const dashboard = monitor.getDashboard();
    expect(dashboard).toBeDefined();
    expect(typeof dashboard.totalContracts).toBe('number');
  });

  it('ContractVerifier can be constructed', () => {
    const monitor = new SloMonitor();
    const verifier = new ContractVerifier(monitor);
    expect(verifier).toBeDefined();
  });

  it('SLO_TARGETS is defined', () => {
    expect(SLO_TARGETS).toBeDefined();
    expect(typeof SLO_TARGETS).toBe('object');
    expect(Object.keys(SLO_TARGETS).length).toBeGreaterThan(0);
  });
});

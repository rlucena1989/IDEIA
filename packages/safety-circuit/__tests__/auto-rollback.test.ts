import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AutoRollbackCircuit, createAutoRollbackCircuit } from '../src/auto-rollback';

jest.mock('@ideia/audit-trail', () => ({
  AuditTrail: jest.fn(() => ({ append: jest.fn() })),
}));

describe('AutoRollbackCircuit', () => {
  let circuit: AutoRollbackCircuit;

  beforeEach(() => {
    jest.clearAllMocks();
    circuit = new AutoRollbackCircuit();
  });

  it('first call records baseline and returns ignored', () => {
    const result = circuit.evaluate(100, 2, 500);
    expect(result.action).toBe('ignored');
    expect(result.reason).toBe('Baseline measurement');
    expect(result.trigger).toBeNull();
  });

  it('throughput drop over 20% triggers revert', () => {
    circuit.evaluate(100, 2, 500);
    const result = circuit.evaluate(70, 2, 500);
    expect(result.action).toBe('reverted');
    expect(result.trigger?.type).toBe('throughput-drop');
    expect(result.reason).toContain('auto-reverting');
  });

  it('error rate rise over 5 triggers notify', () => {
    circuit.evaluate(100, 2, 500);
    const result = circuit.evaluate(100, 10, 500);
    expect(result.action).toBe('notified');
    expect(result.trigger?.type).toBe('error-rise');
    expect(result.reason).toContain('notifying');
  });

  it('latency doubling triggers notify', () => {
    circuit.evaluate(100, 2, 500);
    const result = circuit.evaluate(100, 2, 1100);
    expect(result.action).toBe('notified');
    expect(result.trigger?.type).toBe('latency-double');
  });

  it('no anomaly returns ignored', () => {
    circuit.evaluate(100, 2, 500);
    const result = circuit.evaluate(95, 2, 520);
    expect(result.action).toBe('ignored');
    expect(result.reason).toBe('No anomaly detected');
  });

  it('throughput drop takes priority over other anomalies', () => {
    circuit.evaluate(100, 2, 500);
    const result = circuit.evaluate(50, 10, 1200);
    expect(result.action).toBe('reverted');
    expect(result.trigger?.type).toBe('throughput-drop');
  });

  it('getHistory returns all past evaluations', () => {
    circuit.evaluate(100, 2, 500);
    circuit.evaluate(60, 5, 500);
    const history = circuit.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].action).toBe('ignored');
    expect(history[1].action).toBe('reverted');
  });

  it('createAutoRollbackCircuit factory works', () => {
    const instance = createAutoRollbackCircuit();
    expect(instance).toBeInstanceOf(AutoRollbackCircuit);
  });
});

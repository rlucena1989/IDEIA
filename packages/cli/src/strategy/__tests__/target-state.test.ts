import { describe, it, expect } from '@jest/globals';
import { createTargetState } from '../target-state';

describe('target-state', () => {
  it('should create target with defaults', () => {
    const target = createTargetState({ name: 'MVP', description: 'Minimal viable' });
    expect(target.name).toBe('MVP');
    expect(target.description).toBe('Minimal viable');
    expect(target.targetId).toBeDefined();
    expect(target.capabilities).toEqual([]);
    expect(target.successCriteria).toEqual([]);
    expect(target.constraints).toEqual([]);
    expect(target.dependencies).toEqual([]);
    expect(target.riskLevel).toBe('medium');
  });

  it('should accept all optional fields', () => {
    const target = createTargetState({
      name: 'V2',
      description: 'Full version',
      capabilities: [{ id: 'c1', name: 'Auth', description: 'Auth system', required: true }],
      successCriteria: ['All tests pass'],
      constraints: ['Budget < $10k'],
      dependencies: ['Auth library'],
      riskLevel: 'high',
    });
    expect(target.capabilities).toHaveLength(1);
    expect(target.capabilities[0].name).toBe('Auth');
    expect(target.successCriteria).toContain('All tests pass');
    expect(target.constraints).toContain('Budget < $10k');
    expect(target.dependencies).toContain('Auth library');
    expect(target.riskLevel).toBe('high');
  });

  it('should generate unique targetId each time', () => {
    const t1 = createTargetState({ name: 'A', description: '' });
    const t2 = createTargetState({ name: 'B', description: '' });
    expect(t1.targetId).not.toBe(t2.targetId);
  });

  it('should handle critical risk level', () => {
    const target = createTargetState({ name: 'Critical', description: '', riskLevel: 'critical' });
    expect(target.riskLevel).toBe('critical');
  });

  it('should handle low risk level', () => {
    const target = createTargetState({ name: 'Low', description: '', riskLevel: 'low' });
    expect(target.riskLevel).toBe('low');
  });

  it('should create capability with required false', () => {
    const target = createTargetState({
      name: 'Test', description: '',
      capabilities: [{ id: 'c1', name: 'Optional', description: 'Optional cap', required: false }],
    });
    expect(target.capabilities[0].required).toBe(false);
  });
});

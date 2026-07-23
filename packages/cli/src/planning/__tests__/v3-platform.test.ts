import { describe, it, expect } from '@jest/globals';
import {
  prioritizeForV3,
  classifyBoundaries,
  buildMigrationPlan,
  type V3Capability,
  type PlatformBoundary,
} from '../v3-platform';

function makeCapability(overrides: Partial<V3Capability> & { id: string }): V3Capability {
  return {
    title: 'Test Capability',
    description: 'A test capability',
    contract: 'test-contract',
    requiredInputs: [],
    requiredOutputs: [],
    persistenceRequired: false,
    ...overrides,
  };
}

describe('prioritizeForV3', () => {
  it('should return capabilities sorted by priority score', () => {
    const caps = [
      makeCapability({ id: 'low', persistenceRequired: false, multiAgent: false, requiredInputs: [] }),
      makeCapability({ id: 'high', persistenceRequired: true, multiAgent: true, requiredInputs: ['a', 'b'] }),
      makeCapability({ id: 'medium', persistenceRequired: true, multiAgent: false, requiredInputs: ['a'] }),
    ];
    const sorted = prioritizeForV3(caps);
    expect(sorted[0].id).toBe('high');
    expect(sorted[1].id).toBe('medium');
    expect(sorted[2].id).toBe('low');
  });

  it('should give higher score to capabilities with persistence', () => {
    const caps = [
      makeCapability({ id: 'a', persistenceRequired: true, requiredInputs: [] }),
      makeCapability({ id: 'b', persistenceRequired: false, requiredInputs: [] }),
    ];
    const sorted = prioritizeForV3(caps);
    expect(sorted[0].id).toBe('a');
  });

  it('should give higher score to multi-agent capabilities', () => {
    const caps = [
      makeCapability({ id: 'a', multiAgent: true, persistenceRequired: false, requiredInputs: [] }),
      makeCapability({ id: 'b', multiAgent: false, persistenceRequired: false, requiredInputs: [] }),
    ];
    const sorted = prioritizeForV3(caps);
    expect(sorted[0].id).toBe('a');
  });

  it('should consider requiredInputs count in scoring', () => {
    const caps = [
      makeCapability({ id: 'a', persistenceRequired: false, multiAgent: false, requiredInputs: ['a', 'b', 'c'] }),
      makeCapability({ id: 'b', persistenceRequired: false, multiAgent: false, requiredInputs: ['a'] }),
    ];
    const sorted = prioritizeForV3(caps);
    expect(sorted[0].id).toBe('a');
  });

  it('should not mutate the original array', () => {
    const caps = [
      makeCapability({ id: 'a', persistenceRequired: false, multiAgent: false, requiredInputs: [] }),
      makeCapability({ id: 'b', persistenceRequired: true, multiAgent: true, requiredInputs: ['a'] }),
    ];
    const copy = [...caps];
    prioritizeForV3(caps);
    expect(caps).toEqual(copy);
  });

  it('should handle empty array', () => {
    expect(prioritizeForV3([])).toEqual([]);
  });
});

describe('classifyBoundaries', () => {
  it('should classify known modules correctly', () => {
    const boundaries = classifyBoundaries(['governance', 'cli', 'contracts']);
    expect(boundaries).toHaveLength(3);

    const gov = boundaries.find(b => b.module === 'governance')!;
    expect(gov.refactorNeeded).toBe(true);
    expect(gov.replaceInV3).toBe(false);

    const cli = boundaries.find(b => b.module === 'cli')!;
    expect(cli.refactorNeeded).toBe(false);
    expect(cli.replaceInV3).toBe(true);

    const contracts = boundaries.find(b => b.module === 'contracts')!;
    expect(contracts.keepAsIs).toBe(true);
  });

  it('should filter out unknown modules', () => {
    const boundaries = classifyBoundaries(['unknown-module', 'governance']);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].module).toBe('governance');
  });

  it('should include a reason for each boundary', () => {
    const boundaries = classifyBoundaries(['governance', 'cli', 'runtime']);
    for (const b of boundaries) {
      expect(b.reason.length).toBeGreaterThan(10);
    }
  });

  it('should classify all known modules', () => {
    const knownModules = [
      'governance', 'planning', 'coverage', 'cli', 'extension',
      'runtime', 'contracts', 'security', 'adapters', 'plugins',
      'localAi', 'release', 'generators',
    ];
    const boundaries = classifyBoundaries(knownModules);
    expect(boundaries).toHaveLength(knownModules.length);
  });
});

describe('buildMigrationPlan', () => {
  it('should return a MigrationPlan with phase pre-v3', () => {
    const boundaries = classifyBoundaries(['governance', 'cli']);
    const plan = buildMigrationPlan(boundaries);
    expect(plan.phase).toBe('pre-v3');
  });

  it('should include risks', () => {
    const boundaries = classifyBoundaries(['governance']);
    const plan = buildMigrationPlan(boundaries);
    expect(plan.risks.length).toBeGreaterThan(0);
    for (const risk of plan.risks) {
      expect(typeof risk).toBe('string');
      expect(risk.length).toBeGreaterThan(10);
    }
  });

  it('should include recommended order', () => {
    const boundaries = classifyBoundaries(['governance', 'cli', 'contracts']);
    const plan = buildMigrationPlan(boundaries);
    expect(plan.recommendedOrder.length).toBeGreaterThan(0);
  });

  it('should put refactor boundaries before replace boundaries in order', () => {
    const boundaries = classifyBoundaries(['cli', 'governance']);
    const plan = buildMigrationPlan(boundaries);
    const refactorIndex = plan.recommendedOrder.findIndex(o => o.startsWith('refactor'));
    const replaceIndex = plan.recommendedOrder.findIndex(o => o.startsWith('replace'));
    expect(refactorIndex).toBeLessThan(replaceIndex);
  });

  it('should put keep boundaries last', () => {
    const boundaries = classifyBoundaries(['contracts', 'governance', 'cli']);
    const plan = buildMigrationPlan(boundaries);
    const lastOrder = plan.recommendedOrder[plan.recommendedOrder.length - 1];
    expect(lastOrder.startsWith('keep')).toBe(true);
  });

  it('should store boundaries in the plan', () => {
    const boundaries = classifyBoundaries(['governance', 'planning']);
    const plan = buildMigrationPlan(boundaries);
    expect(plan.boundaries).toEqual(boundaries);
  });
});

import { DEFAULT_EVOLUTION_POLICY } from '../evolution-policy';
import type { EvolutionPolicy } from '../evolution-policy';

describe('DEFAULT_EVOLUTION_POLICY', () => {
  it('has default min consistency score of 70', () => {
    expect(DEFAULT_EVOLUTION_POLICY.minConsistencyScore).toBe(70);
  });

  it('has default min hardening score of 70', () => {
    expect(DEFAULT_EVOLUTION_POLICY.minHardeningScore).toBe(70);
  });

  it('has default min generation score of 70', () => {
    expect(DEFAULT_EVOLUTION_POLICY.minGenerationScore).toBe(70);
  });

  it('blocks on critical delta by default', () => {
    expect(DEFAULT_EVOLUTION_POLICY.blockOnCriticalDelta).toBe(true);
  });

  it('requires approval on repair by default', () => {
    expect(DEFAULT_EVOLUTION_POLICY.requireApprovalOnRepair).toBe(true);
  });
});

describe('EvolutionPolicy interface', () => {
  it('constructs a custom policy', () => {
    const policy: EvolutionPolicy = {
      minConsistencyScore: 80,
      minHardeningScore: 75,
      minGenerationScore: 90,
      blockOnCriticalDelta: false,
      requireApprovalOnRepair: false,
    };
    expect(policy.minConsistencyScore).toBe(80);
    expect(policy.blockOnCriticalDelta).toBe(false);
  });
});

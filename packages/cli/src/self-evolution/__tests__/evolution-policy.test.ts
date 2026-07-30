import { DEFAULT_SELF_EVOLUTION_POLICY } from '../evolution-policy';
import type { SelfEvolutionPolicy } from '../evolution-policy';

describe('DEFAULT_SELF_EVOLUTION_POLICY', () => {
  it('has min health score of 60', () => {
    expect(DEFAULT_SELF_EVOLUTION_POLICY.minHealthScoreForChange).toBe(60);
  });

  it('does not require approval for enable', () => {
    expect(DEFAULT_SELF_EVOLUTION_POLICY.requireApprovalForEnable).toBe(false);
  });

  it('requires approval for disable', () => {
    expect(DEFAULT_SELF_EVOLUTION_POLICY.requireApprovalForDisable).toBe(true);
  });

  it('enables rollback by default', () => {
    expect(DEFAULT_SELF_EVOLUTION_POLICY.enableRollback).toBe(true);
  });
});

describe('SelfEvolutionPolicy interface', () => {
  it('constructs a custom policy', () => {
    const policy: SelfEvolutionPolicy = {
      minHealthScoreForChange: 80,
      requireApprovalForEnable: true,
      requireApprovalForDisable: true,
      enableRollback: false,
    };
    expect(policy.minHealthScoreForChange).toBe(80);
    expect(policy.enableRollback).toBe(false);
  });
});

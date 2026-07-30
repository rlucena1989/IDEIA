import { DEFAULT_CONTEXT_POLICY } from '../context-policy';
import type { ContextPolicy } from '../context-policy';

describe('DEFAULT_CONTEXT_POLICY', () => {
  it('does not allow blocked publication by default', () => {
    expect(DEFAULT_CONTEXT_POLICY.allowBlockedPublication).toBe(false);
  });

  it('requires validation before publish by default', () => {
    expect(DEFAULT_CONTEXT_POLICY.requireValidationBeforePublish).toBe(true);
  });

  it('limits max active contexts to 5', () => {
    expect(DEFAULT_CONTEXT_POLICY.maxActiveContexts).toBe(5);
  });
});

describe('ContextPolicy interface', () => {
  it('constructs a custom policy', () => {
    const policy: ContextPolicy = {
      allowBlockedPublication: true,
      requireValidationBeforePublish: false,
      maxActiveContexts: 10,
    };
    expect(policy.allowBlockedPublication).toBe(true);
    expect(policy.maxActiveContexts).toBe(10);
  });
});

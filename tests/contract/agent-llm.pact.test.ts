import { describe, it, expect } from '@jest/globals';
import { buildAgentLlmContract } from '../../packages/contract-cdc/tests/contract/agent-llm.pact';

describe('Contract: agent-runtime → llm-provider (Pact CDC)', () => {
  it('builds contract with consumer, provider, and cdc', () => {
    const { consumer, provider, cdc } = buildAgentLlmContract();
    expect(consumer).toBeDefined();
    expect(provider).toBeDefined();
    expect(cdc).toBeDefined();
  });

  it('registers expectations with correct consumer and provider names', () => {
    const { consumer: _consumer, provider: _provider, cdc } = buildAgentLlmContract();
    const expectations = cdc.getExpectations('agent-runtime', 'llm-integration');
    expect(expectations.length).toBeGreaterThan(0);
    for (const exp of expectations) {
      expect(exp.consumer).toBe('agent-runtime');
      expect(exp.provider).toBe('llm-integration');
    }
  });

  it('consumer pact has interactions', () => {
    const { consumer } = buildAgentLlmContract();
    const pact = consumer.build();
    expect(pact.consumer).toBe('agent-runtime');
    expect(pact.provider).toBe('llm-integration');
    expect(pact.interactions.length).toBeGreaterThan(0);
  });
});

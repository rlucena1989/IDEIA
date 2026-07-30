import { describe, it, expect } from '@jest/globals';
import { createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import { createAgentRuntimePolicyPactConsumer, createAgentRuntimePolicyPactProvider } from '../../packages/contract-cdc/tests/contract/agent-runtime-policy.pact';

describe('Contract: agent-runtime → policy-engine (Pact CDC)', () => {
  it('consumer defines 3 expectations for policy evaluation', () => {
    const cdc = createContractCDC();
    const consumer = createAgentRuntimePolicyPactConsumer(cdc);
    consumer.register();
    const expectations = cdc.getExpectations('agent-runtime', 'policy-engine');
    expect(expectations.length).toBe(3);
    for (const exp of expectations) {
      expect(exp.consumer).toBe('agent-runtime');
      expect(exp.provider).toBe('policy-engine');
    }
  });

  it('consumer pact has allowed and blocked interactions', () => {
    const cdc = createContractCDC();
    const consumer = createAgentRuntimePolicyPactConsumer(cdc);
    const pact = consumer.build();
    expect(pact.consumer).toBe('agent-runtime');
    const postEval = pact.interactions.find(i => i.request.method === 'POST' && i.request.path === '/policy/evaluate');
    expect(postEval).toBeDefined();
  });

  it('provider contracts have same interaction count', () => {
    const cdc = createContractCDC();
    const consumer = createAgentRuntimePolicyPactConsumer(cdc);
    const provider = createAgentRuntimePolicyPactProvider(cdc);
    const consumerPact = consumer.build();
    const providerContract = provider.createContractForConsumer('agent-runtime', '1.0.0');
    expect(consumerPact.interactions.length).toBe(providerContract.interactions.length);
  });

  it('publishes contract successfully', () => {
    const cdc = createContractCDC();
    const consumer = createAgentRuntimePolicyPactConsumer(cdc);
    consumer.register();
    const published = cdc.publishContracts();
    expect(published.length).toBe(1);
    expect(published[0].consumer).toBe('agent-runtime');
  });
});

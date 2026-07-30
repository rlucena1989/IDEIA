import { describe, it, expect } from '@jest/globals';
import { createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import { createCliPolicyPactConsumer, createCliPolicyPactProvider } from '../../packages/contract-cdc/tests/contract/cli-policy.pact';

describe('Contract: cli → policy-engine (Pact CDC)', () => {
  it('consumer defines 3 expectations for policy evaluation', () => {
    const cdc = createContractCDC();
    const consumer = createCliPolicyPactConsumer(cdc);
    consumer.register();
    const expectations = cdc.getExpectations('cli', 'policy-engine');
    expect(expectations.length).toBe(3);
    for (const exp of expectations) {
      expect(exp.consumer).toBe('cli');
      expect(exp.provider).toBe('policy-engine');
    }
  });

  it('consumer pact handles allowed, blocked, and compliance interactions', () => {
    const cdc = createContractCDC();
    const consumer = createCliPolicyPactConsumer(cdc);
    const pact = consumer.build();
    expect(pact.consumer).toBe('cli');
    const blockedInteraction = pact.interactions.find(i => i.response.status === 403);
    expect(blockedInteraction).toBeDefined();
    expect(blockedInteraction!.request.body).toMatchObject({ resource: 'system:delete-all' });
  });

  it('provider contract has same interaction count', () => {
    const cdc = createContractCDC();
    const consumer = createCliPolicyPactConsumer(cdc);
    const provider = createCliPolicyPactProvider(cdc);
    const consumerPact = consumer.build();
    const providerContract = provider.createContractForConsumer('cli', '1.0.0');
    expect(consumerPact.interactions.length).toBe(providerContract.interactions.length);
  });
});

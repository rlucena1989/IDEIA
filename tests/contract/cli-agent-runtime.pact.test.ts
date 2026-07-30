import { describe, it, expect } from '@jest/globals';
import { createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import { createCliAgentRuntimePactConsumer, createCliAgentRuntimePactProvider } from '../../packages/contract-cdc/tests/contract/cli-agent-runtime.pact';

describe('Contract: cli → agent-runtime (Pact CDC)', () => {
  it('consumer defines 4 expectations for task execution', () => {
    const cdc = createContractCDC();
    const consumer = createCliAgentRuntimePactConsumer(cdc);
    consumer.register();
    const expectations = cdc.getExpectations('cli', 'agent-runtime');
    expect(expectations.length).toBe(4);
    for (const exp of expectations) {
      expect(exp.consumer).toBe('cli');
      expect(exp.provider).toBe('agent-runtime');
    }
  });

  it('consumer pact includes execute, status, list, cancel interactions', () => {
    const cdc = createContractCDC();
    const consumer = createCliAgentRuntimePactConsumer(cdc);
    const pact = consumer.build();
    expect(pact.consumer).toBe('cli');
    expect(pact.provider).toBe('agent-runtime');
    const descriptions = pact.interactions.map(i => i.description);
    expect(descriptions).toContain('a request to execute a task');
    expect(descriptions).toContain('a request to get execution status');
    expect(descriptions).toContain('a request to list running executions');
    expect(descriptions).toContain('a request to cancel a running execution');
  });

  it('provider contract matches consumer contract count', () => {
    const cdc = createContractCDC();
    const consumer = createCliAgentRuntimePactConsumer(cdc);
    const provider = createCliAgentRuntimePactProvider(cdc);
    const consumerPact = consumer.build();
    const providerContract = provider.createContractForConsumer('cli', '1.0.0');
    expect(consumerPact.interactions.length).toBe(providerContract.interactions.length);
  });

  it('publishes contract for cli-agent-runtime pair', () => {
    const cdc = createContractCDC();
    const consumer = createCliAgentRuntimePactConsumer(cdc);
    consumer.register();
    const published = cdc.publishContracts();
    expect(published.length).toBe(1);
    expect(published[0].consumer).toBe('cli');
    expect(published[0].provider).toBe('agent-runtime');
  });
});

import { describe, it, expect } from '@jest/globals';
import { createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import { createEventBusMemoryPactConsumer, createEventBusMemoryPactProvider } from '../../packages/contract-cdc/tests/contract/event-bus-memory.pact';

describe('Contract: event-bus → memory-store (Pact CDC)', () => {
  it('consumer defines 3 expectations for memory operations', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusMemoryPactConsumer(cdc);
    consumer.register();
    const expectations = cdc.getExpectations('event-bus', 'memory-store');
    expect(expectations.length).toBe(3);
    for (const exp of expectations) {
      expect(exp.consumer).toBe('event-bus');
      expect(exp.provider).toBe('memory-store');
    }
  });

  it('consumer pact includes store, retrieve, and search interactions', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusMemoryPactConsumer(cdc);
    const pact = consumer.build();
    const descriptions = pact.interactions.map(i => i.description);
    expect(descriptions).toContain('a request to store a memory entry');
    expect(descriptions).toContain('a request to retrieve a memory entry by key');
    expect(descriptions).toContain('a request to search memory entries by vector similarity');
  });

  it('provider contract matches consumer contract count', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusMemoryPactConsumer(cdc);
    const provider = createEventBusMemoryPactProvider(cdc);
    const consumerPact = consumer.build();
    const providerContract = provider.createContractForConsumer('event-bus', '1.0.0');
    expect(consumerPact.interactions.length).toBe(providerContract.interactions.length);
  });
});

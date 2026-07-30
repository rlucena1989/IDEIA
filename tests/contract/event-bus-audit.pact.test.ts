import { describe, it, expect } from '@jest/globals';
import { createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import { createEventBusAuditPactConsumer, createEventBusAuditPactProvider } from '../../packages/contract-cdc/tests/contract/event-bus-audit.pact';

describe('Contract: event-bus → audit-trail (Pact CDC)', () => {
  it('consumer defines 3 expectations for audit events', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusAuditPactConsumer(cdc);
    consumer.register();
    const expectations = cdc.getExpectations('event-bus', 'audit-trail');
    expect(expectations.length).toBe(3);
    for (const exp of expectations) {
      expect(exp.consumer).toBe('event-bus');
      expect(exp.provider).toBe('audit-trail');
    }
  });

  it('consumer builds pact with correct metadata', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusAuditPactConsumer(cdc);
    const pact = consumer.build();
    expect(pact.consumer).toBe('event-bus');
    expect(pact.provider).toBe('audit-trail');
    expect(pact.metadata?.interactionCount).toBe(3);
  });

  it('provider creates contract with same interactions as consumer', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusAuditPactConsumer(cdc);
    const provider = createEventBusAuditPactProvider(cdc);
    const consumerPact = consumer.build();
    const providerContract = provider.createContractForConsumer('event-bus', '1.0.0');
    expect(consumerPact.interactions.length).toBe(providerContract.interactions.length);
  });

  it('cdc publishes and retrieves contracts', () => {
    const cdc = createContractCDC();
    const consumer = createEventBusAuditPactConsumer(cdc);
    consumer.register();
    const published = cdc.publishContracts();
    expect(published.length).toBe(1);
    expect(published[0].consumer).toBe('event-bus');
    expect(published[0].provider).toBe('audit-trail');
  });
});

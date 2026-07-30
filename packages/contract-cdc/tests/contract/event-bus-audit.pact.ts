import { PactConsumer, createPactConsumer } from '../../src/pact-consumer';
import { createLogger } from '@ideia/logger';
import { PactProvider, createPactProvider } from '../../src/pact-provider';
import { ContractCDC, createContractCDC } from '../../src/contract-cdc';
const logger = createLogger('event-bus-audit.pact');

const EVENT_BUS_AUDIT_PACT_VERSION = '1.0.0';

export function createEventBusAuditPactConsumer(cdc: ContractCDC): PactConsumer {
  const consumer = createPactConsumer({
    consumerName: 'event-bus',
    providerName: 'audit-trail',
    version: EVENT_BUS_AUDIT_PACT_VERSION,
    contractCDC: cdc,
  });

  consumer
    .uponReceiving('a request to log an audit event')
    .withRequest('POST', '/audit/events', {
      headers: { 'Content-Type': 'application/json' },
      body: { type: 'policy.evaluated', source: 'event-bus', severity: 'info', payload: {} },
    })
    .willRespondWith(201, {
      headers: { 'Content-Type': 'application/json' },
      body: { id: 'audit-uuid-123', status: 'logged', timestamp: '2026-01-01T00:00:00.000Z' },
    });

  consumer
    .uponReceiving('a request to query audit events by type')
    .withRequest('GET', '/audit/events', {
      headers: { 'Content-Type': 'application/json' },
      query: { type: 'policy.evaluated', limit: '50' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { events: [], total: 0, page: 1 },
    });

  consumer
    .uponReceiving('a request to verify audit chain integrity')
    .withRequest('GET', '/audit/chain/verify', {
      headers: { 'Content-Type': 'application/json' },
      query: { from: '2026-01-01', to: '2026-01-02' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { valid: true, checkedBlocks: 100, firstHash: 'abc', lastHash: 'def' },
    });

  return consumer;
}

export function createEventBusAuditPactProvider(cdc: ContractCDC): PactProvider {
  const provider = createPactProvider({
    providerName: 'audit-trail',
    version: EVENT_BUS_AUDIT_PACT_VERSION,
    contractCDC: cdc,
  });

  provider.registerState('audit trail is active', {
    setup: () => Promise.resolve(),
  });

  provider.registerHandler('a request to log an audit event', (request) => {
    const body = request.body as { type?: string; source?: string } | undefined;
    return {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: {
        id: `audit-${Date.now()}`,
        status: 'logged',
        timestamp: new Date().toISOString(),
        type: body?.type ?? 'unknown',
        source: body?.source ?? 'unknown',
      },
    };
  });

  provider.registerHandler('a request to query audit events by type', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { events: [], total: 0, page: 1 },
  }));

  provider.registerHandler('a request to verify audit chain integrity', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { valid: true, checkedBlocks: 100, firstHash: 'abc', lastHash: 'def' },
  }));

  return provider;
}

export function buildEventBusAuditContract(): { consumer: PactConsumer; provider: PactProvider; cdc: ContractCDC } {
  const cdc = createContractCDC();
  const consumer = createEventBusAuditPactConsumer(cdc);
  const provider = createEventBusAuditPactProvider(cdc);
  consumer.register();
  return { consumer, provider, cdc };
}

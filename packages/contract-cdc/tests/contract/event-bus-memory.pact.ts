import { PactConsumer, createPactConsumer } from '../../src/pact-consumer';
import { createLogger } from '@ideia/logger';
import { PactProvider, createPactProvider } from '../../src/pact-provider';
import { ContractCDC, createContractCDC } from '../../src/contract-cdc';
const logger = createLogger('event-bus-memory.pact');

const EVENT_BUS_MEMORY_PACT_VERSION = '1.0.0';

export function createEventBusMemoryPactConsumer(cdc: ContractCDC): PactConsumer {
  const consumer = createPactConsumer({
    consumerName: 'event-bus',
    providerName: 'memory-store',
    version: EVENT_BUS_MEMORY_PACT_VERSION,
    contractCDC: cdc,
  });

  consumer
    .uponReceiving('a request to store a memory entry')
    .withRequest('POST', '/memory/store', {
      headers: { 'Content-Type': 'application/json' },
      body: { key: 'decision:plan-001', value: { action: 'create_file', status: 'approved' }, ttl: 86400 },
    })
    .willRespondWith(201, {
      headers: { 'Content-Type': 'application/json' },
      body: { id: 'mem-uuid-123', stored: true, key: 'decision:plan-001' },
    });

  consumer
    .uponReceiving('a request to retrieve a memory entry by key')
    .withRequest('GET', '/memory/decision:plan-001', {
      headers: { 'Content-Type': 'application/json' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { key: 'decision:plan-001', value: { action: 'create_file', status: 'approved' }, ttl: 86400, createdAt: '2026-01-01T00:00:00.000Z' },
    });

  consumer
    .uponReceiving('a request to search memory entries by vector similarity')
    .withRequest('POST', '/memory/search', {
      headers: { 'Content-Type': 'application/json' },
      body: { query: 'find decisions about file creation', limit: 10, threshold: 0.8 },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { results: [], total: 0 },
    });

  return consumer;
}

export function createEventBusMemoryPactProvider(cdc: ContractCDC): PactProvider {
  const provider = createPactProvider({
    providerName: 'memory-store',
    version: EVENT_BUS_MEMORY_PACT_VERSION,
    contractCDC: cdc,
  });

  provider.registerState('memory store is active', {
    setup: () => Promise.resolve(),
  });

  provider.registerHandler('a request to store a memory entry', () => ({
    status: 201,
    headers: { 'Content-Type': 'application/json' },
    body: { id: `mem-${Date.now()}`, stored: true, key: 'decision:plan-001' },
  }));

  provider.registerHandler('a request to retrieve a memory entry by key', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { key: 'decision:plan-001', value: { action: 'create_file', status: 'approved' }, ttl: 86400, createdAt: new Date().toISOString() },
  }));

  provider.registerHandler('a request to search memory entries by vector similarity', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { results: [], total: 0 },
  }));

  return provider;
}

export function buildEventBusMemoryContract(): { consumer: PactConsumer; provider: PactProvider; cdc: ContractCDC } {
  const cdc = createContractCDC();
  const consumer = createEventBusMemoryPactConsumer(cdc);
  const provider = createEventBusMemoryPactProvider(cdc);
  consumer.register();
  return { consumer, provider, cdc };
}

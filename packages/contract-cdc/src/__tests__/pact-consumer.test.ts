import { PactConsumer, createPactConsumer } from '../pact-consumer';
import { ContractCDC } from '../contract-cdc';
import type { PactConsumerConfig } from '../pact-consumer';

function makeConfig(overrides?: Partial<PactConsumerConfig>): PactConsumerConfig {
  return {
    consumerName: 'web-app',
    providerName: 'user-api',
    version: '1.0.0',
    contractCDC: new ContractCDC(),
    ...overrides,
  };
}

describe('PactConsumer', () => {
  it('should create via factory', () => {
    const consumer = createPactConsumer(makeConfig());
    expect(consumer).toBeInstanceOf(PactConsumer);
  });

  it('should build a pact contract with multiple interactions', () => {
    const consumer = createPactConsumer(makeConfig());
    consumer
      .uponReceiving('a request to get user')
      .withRequest('GET', '/users/1')
      .willRespondWith(200, { body: { id: 1, name: 'Alice' } });
    consumer
      .uponReceiving('a request to create user')
      .withRequest('POST', '/users', { body: { name: 'Bob' } })
      .willRespondWith(201, { body: { id: 2, name: 'Bob' } });

    const pact = consumer.build();

    expect(pact.consumer).toBe('web-app');
    expect(pact.provider).toBe('user-api');
    expect(pact.interactions).toHaveLength(2);
    expect(pact.version).toBe('1.0.0');
    expect(pact.metadata?.interactionCount).toBe(2);
  });

  it('should set request method, path, headers, query and body', () => {
    const consumer = createPactConsumer(makeConfig());
    consumer
      .uponReceiving('a search request')
      .withRequest('GET', '/search', {
        headers: { Authorization: 'Bearer token' },
        query: { q: 'test', page: '1' },
        body: undefined,
      });

    const pact = consumer.build();
    const req = pact.interactions[0].request;

    expect(req.method).toBe('GET');
    expect(req.path).toBe('/search');
    expect(req.headers).toEqual({ Authorization: 'Bearer token' });
    expect(req.query).toEqual({ q: 'test', page: '1' });
  });

  it('should set response status, headers and body', () => {
    const consumer = createPactConsumer(makeConfig());
    consumer
      .uponReceiving('a response with headers')
      .willRespondWith(200, {
        headers: { 'X-Request-Id': 'abc-123' },
        body: { success: true },
      });

    const pact = consumer.build();
    const res = pact.interactions[0].response;

    expect(res.status).toBe(200);
    expect(res.headers).toEqual({ 'X-Request-Id': 'abc-123' });
    expect(res.body).toEqual({ success: true });
  });

  it('should associate providerState with the last interaction via given', () => {
    const consumer = createPactConsumer(makeConfig());
    consumer
      .uponReceiving('a request with state')
      .given('user exists with id 1')
      .withRequest('GET', '/users/1')
      .willRespondWith(200);

    const pact = consumer.build();
    expect(pact.interactions[0].providerState).toBe('user exists with id 1');
  });

  it('should register pact and return expectations', () => {
    const cdc = new ContractCDC();
    const consumer = createPactConsumer(makeConfig({ contractCDC: cdc }));
    consumer
      .uponReceiving('health check')
      .withRequest('GET', '/health')
      .willRespondWith(200, { body: { status: 'ok' } });

    const expectations = consumer.register();

    expect(expectations).toHaveLength(1);
    expect(expectations[0].consumer).toBe('web-app');
    expect(expectations[0].provider).toBe('user-api');
    expect(expectations[0].verified).toBe(false);

    const pacts = cdc.listPacts();
    expect(pacts).toHaveLength(1);
    expect(pacts[0].consumer).toBe('web-app');
  });

  it('should clear all interactions', () => {
    const consumer = createPactConsumer(makeConfig());
    consumer.uponReceiving('first interaction').willRespondWith(200);
    consumer.uponReceiving('second interaction').willRespondWith(201);

    expect(consumer.build().interactions).toHaveLength(2);

    consumer.clear();

    expect(consumer.build().interactions).toHaveLength(0);
  });
});

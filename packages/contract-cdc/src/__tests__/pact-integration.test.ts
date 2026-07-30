import { createPactConsumer } from '../pact-consumer';
import { createPactProvider } from '../pact-provider';
import { ContractCDC } from '../contract-cdc';
import type { PactConsumerConfig } from '../pact-consumer';
import type { PactProviderConfig } from '../pact-provider';
import type { PactContract, PactFileV2, BrokerConfig } from '../types';

function makeConsumerConfig(overrides?: Partial<PactConsumerConfig>): PactConsumerConfig {
  return {
    consumerName: 'web-app',
    providerName: 'user-api',
    version: '1.0.0',
    contractCDC: new ContractCDC(),
    pactSpecVersion: '2.0.0',
    ...overrides,
  };
}

function makeProviderConfig(overrides?: Partial<PactProviderConfig>): PactProviderConfig {
  return {
    providerName: 'user-api',
    version: '1.0.0',
    contractCDC: new ContractCDC(),
    ...overrides,
  };
}

describe('Pact Integration', () => {
  describe('Pact File Export (PactFileV2 Format)', () => {
    it('should export pact in PactFileV2 format with consumer/provider objects', () => {
      const consumer = createPactConsumer(makeConsumerConfig());
      consumer
        .uponReceiving('a request to get user')
        .given('user exists with id 1')
        .withRequest('GET', '/users/1')
        .willRespondWith(200, { body: { id: 1, name: 'Alice' } });

      const pactFile = consumer.exportPactJson();

      expect(pactFile.consumer).toEqual({ name: 'web-app' });
      expect(pactFile.provider).toEqual({ name: 'user-api' });
      expect(pactFile.metadata.pactSpecification.version).toBe('2.0.0');
    });

    it('should export all interactions with provider states', () => {
      const consumer = createPactConsumer(makeConsumerConfig());
      consumer
        .uponReceiving('get user')
        .given('user exists with id 1')
        .withRequest('GET', '/users/1')
        .willRespondWith(200, { body: { id: 1, name: 'Alice' } });
      consumer
        .uponReceiving('create user')
        .given('user does not exist')
        .withRequest('POST', '/users', { body: { name: 'Bob' } })
        .willRespondWith(201, { body: { id: 2, name: 'Bob' } });

      const pactFile = consumer.exportPactJson();

      expect(pactFile.interactions).toHaveLength(2);
      expect(pactFile.interactions[0].providerStates).toEqual([{ name: 'user exists with id 1' }]);
      expect(pactFile.interactions[1].providerStates).toEqual([{ name: 'user does not exist' }]);
    });

    it('should include request details in export', () => {
      const consumer = createPactConsumer(makeConsumerConfig());
      consumer
        .uponReceiving('search users')
        .withRequest('GET', '/search', {
          query: { q: 'alice', page: '1' },
          headers: { Authorization: 'Bearer token' },
        })
        .willRespondWith(200);

      const pactFile = consumer.exportPactJson();

      expect(pactFile.interactions[0].request.method).toBe('GET');
      expect(pactFile.interactions[0].request.path).toBe('/search');
      expect(pactFile.interactions[0].request.query).toEqual({ q: 'alice', page: '1' });
      expect(pactFile.interactions[0].request.headers).toEqual({ Authorization: 'Bearer token' });
    });

    it('should include response details in export', () => {
      const consumer = createPactConsumer(makeConsumerConfig());
      consumer
        .uponReceiving('create user')
        .withRequest('POST', '/users', { body: { name: 'Test' } })
        .willRespondWith(201, {
          headers: { 'X-Resource-Id': '123' },
          body: { id: 123, name: 'Test' },
        });

      const pactFile = consumer.exportPactJson();

      expect(pactFile.interactions[0].response.status).toBe(201);
      expect(pactFile.interactions[0].response.headers).toEqual({ 'X-Resource-Id': '123' });
      expect(pactFile.interactions[0].response.body).toEqual({ id: 123, name: 'Test' });
    });

    it('should handle pact spec version configuration', () => {
      const consumer = createPactConsumer(makeConsumerConfig({ pactSpecVersion: '3.0.0' }));
      consumer
        .uponReceiving('health check')
        .withRequest('GET', '/health')
        .willRespondWith(200);

      const pactFile = consumer.exportPactJson();

      expect(pactFile.metadata.pactSpecification.version).toBe('3.0.0');
    });
  });

  describe('HTTP Mock Server', () => {
    it('should start and stop a mock server', async () => {
      const provider = createPactProvider(makeProviderConfig());
      provider.registerHandler('health check', () => ({ status: 200, body: { ok: true } }));

      const port = await provider.startMockServer({ port: 0 });
      expect(port).toBeGreaterThan(0);
      expect(provider.isMockServerRunning()).toBe(true);

      await provider.stopMockServer();
      expect(provider.isMockServerRunning()).toBe(false);
    });

    it('should handle real HTTP requests via mock server', async () => {
      const provider = createPactProvider(makeProviderConfig());
      provider.registerHandler('get user', () => ({
        status: 200,
        body: { id: 1, name: 'Alice' },
      }));

      const port = await provider.startMockServer({ port: 0 });
      const http = await import('http');

      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${port}/users/1`, { method: 'GET' }, (res) => {
          let data = '';
          res.on('data', (chunk: string) => { data += chunk; });
          res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.status).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ id: 1, name: 'Alice' });

      await provider.stopMockServer();
    });

    it('should return 404 for unhandled routes', async () => {
      const provider = createPactProvider(makeProviderConfig());
      const port = await provider.startMockServer({ port: 0 });
      const http = await import('http');

      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(`http://127.0.0.1:${port}/unhandled`, { method: 'GET' }, (res) => {
          let data = '';
          res.on('data', (chunk: string) => { data += chunk; });
          res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
        });
        req.on('error', reject);
        req.end();
      });

      expect(response.status).toBe(404);

      await provider.stopMockServer();
    });

    it('should reject starting a second mock server', async () => {
      const provider = createPactProvider(makeProviderConfig());
      await provider.startMockServer({ port: 0 });
      await expect(provider.startMockServer({ port: 0 })).rejects.toThrow('already running');
      await provider.stopMockServer();
    });
  });

  describe('Real Request Verification', () => {
    it('should verify real HTTP interactions against pact expectations', async () => {
      const provider = createPactProvider(makeProviderConfig());
      provider.registerHandler('get user', () => ({
        status: 200,
        body: { id: 1, name: 'Alice' },
      }));

      const port = await provider.startMockServer({ port: 0 });

      const pact: PactContract = {
        consumer: 'web-app',
        provider: 'user-api',
        version: '1.0.0',
        interactions: [{
          description: 'get user',
          type: 'request-response',
          request: { method: 'GET', path: '/users/1' },
          response: { status: 200, body: { id: 1, name: 'Alice' } },
        }],
      };

      const results = await provider.verifyWithRealRequests(port, pact);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(true);
      expect(results[0].expectedStatus).toBe(200);
      expect(results[0].actualStatus).toBe(200);

      await provider.stopMockServer();
    });

    it('should detect real request verification failures', async () => {
      const provider = createPactProvider(makeProviderConfig());
      provider.registerHandler('get user', () => ({
        status: 404,
        body: { error: 'Not found' },
      }));

      const port = await provider.startMockServer({ port: 0 });

      const pact: PactContract = {
        consumer: 'web-app',
        provider: 'user-api',
        version: '1.0.0',
        interactions: [{
          description: 'get user',
          type: 'request-response',
          request: { method: 'GET', path: '/users/1' },
          response: { status: 200, body: { id: 1, name: 'Alice' } },
        }],
      };

      const results = await provider.verifyWithRealRequests(port, pact);

      expect(results).toHaveLength(1);
      expect(results[0].passed).toBe(false);
      expect(results[0].actualStatus).toBe(404);

      await provider.stopMockServer();
    });
  });

  describe('Broker Integration', () => {
    it('should publish to broker and return error on failed connection', async () => {
      const provider = createPactProvider(makeProviderConfig());
      const pactFile: PactFileV2 = {
        consumer: { name: 'web-app' },
        provider: { name: 'user-api' },
        interactions: [{
          description: 'health check',
          request: { method: 'GET', path: '/health' },
          response: { status: 200 },
        }],
        metadata: { pactSpecification: { version: '2.0.0' } },
      };

      const brokerConfig: BrokerConfig = {
        baseUrl: 'http://localhost:29999',
        authToken: 'test-token',
        timeout: 1000,
      };

      const result = await provider.publishToBroker(pactFile, brokerConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should retrieve from broker and return error on failed connection', async () => {
      const provider = createPactProvider(makeProviderConfig());

      const brokerConfig: BrokerConfig = {
        baseUrl: 'http://localhost:29999',
        authToken: 'test-token',
      };

      const result = await provider.retrieveFromBroker('web-app', 'user-api', brokerConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should retrieve all from broker and return error on failed connection', async () => {
      const provider = createPactProvider(makeProviderConfig());

      const brokerConfig: BrokerConfig = {
        baseUrl: 'http://localhost:29999',
      };

      const result = await provider.retrieveAllFromBroker(brokerConfig, 'user-api');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
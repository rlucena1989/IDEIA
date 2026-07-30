import { PactProvider, createPactProvider } from '../pact-provider';
import { ContractCDC } from '../contract-cdc';
import type { PactProviderConfig } from '../pact-provider';
import type { PactContract } from '../types';

function makeConfig(overrides?: Partial<PactProviderConfig>): PactProviderConfig {
  return {
    providerName: 'user-api',
    version: '1.0.0',
    contractCDC: new ContractCDC(),
    ...overrides,
  };
}

function samplePact(consumer: string, overrides?: Partial<PactContract>): PactContract {
  return {
    consumer,
    provider: 'user-api',
    version: '1.0.0',
    interactions: [
      {
        description: 'get user by id',
        type: 'request-response',
        request: { method: 'GET', path: '/users/1' },
        response: { status: 200, body: { id: 1, name: 'Alice' } },
      },
    ],
    ...overrides,
  };
}

describe('PactProvider', () => {
  it('should create via factory', () => {
    const provider = createPactProvider(makeConfig());
    expect(provider).toBeInstanceOf(PactProvider);
  });

  it('should register and invoke provider states during verification', async () => {
    const cdc = new ContractCDC();
    const provider = createPactProvider(makeConfig({ contractCDC: cdc }));
    const setup = jest.fn().mockResolvedValue(undefined);
    const teardown = jest.fn().mockResolvedValue(undefined);

    provider.registerState('user exists with id 1', { setup, teardown });
    provider.registerHandler('get user by id', () => ({
      status: 200,
      body: { id: 1, name: 'Alice' },
    }));

    const pact = samplePact('web-app', {
      interactions: [
        {
          description: 'get user by id',
          type: 'request-response',
          providerState: 'user exists with id 1',
          request: { method: 'GET', path: '/users/1' },
          response: { status: 200, body: { id: 1, name: 'Alice' } },
        },
      ],
    });

    const result = await provider.verify(pact);

    expect(setup).toHaveBeenCalled();
    expect(teardown).toHaveBeenCalled();
    expect(result.passed).toBe(true);
  });

  it('should register handlers and return expected responses', async () => {
    const cdc = new ContractCDC();
    const provider = createPactProvider(makeConfig({ contractCDC: cdc }));

    provider.registerHandler('get user by id', () => ({
      status: 200,
      body: { id: 1, name: 'Alice' },
    }));

    const pact = samplePact('web-app');
    const result = await provider.verify(pact);

    expect(result.passed).toBe(true);
    expect(result.summary.total).toBe(1);
    expect(result.summary.passed).toBe(1);
    expect(result.summary.failed).toBe(0);
  });

  it('should detect status mismatch between expected and actual response', async () => {
    const cdc = new ContractCDC();
    const provider = createPactProvider(makeConfig({ contractCDC: cdc }));

    provider.registerHandler('get user by id', () => ({
      status: 404,
      body: { error: 'Not found' },
    }));

    const pact = samplePact('web-app');
    const result = await provider.verify(pact);

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toContain('Status mismatch');
  });

  it('should detect response body mismatch', async () => {
    const cdc = new ContractCDC();
    const provider = createPactProvider(makeConfig({ contractCDC: cdc }));

    provider.registerHandler('get user by id', () => ({
      status: 200,
      body: { id: 999, name: 'Wrong' },
    }));

    const pact = samplePact('web-app');
    const result = await provider.verify(pact);

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toBe('Response body mismatch');
  });

  it('should report missing handler as failure', async () => {
    const cdc = new ContractCDC();
    const provider = createPactProvider(makeConfig({ contractCDC: cdc }));

    const pact = samplePact('web-app');
    const result = await provider.verify(pact);

    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toContain('No handler registered');
  });

  it('should create a contract for a consumer based on registered handlers', () => {
    const cdc = new ContractCDC();
    const provider = createPactProvider(makeConfig({ contractCDC: cdc }));

    provider.registerHandler('health check', () => ({ status: 200 }));
    provider.registerHandler('metrics', () => ({ status: 200 }));

    const contract = provider.createContractForConsumer('monitor', '0.1.0');

    expect(contract.consumer).toBe('monitor');
    expect(contract.provider).toBe('user-api');
    expect(contract.version).toBe('0.1.0');
    expect(contract.interactions).toHaveLength(2);
    expect(contract.interactions.map(i => i.description)).toEqual(['health check', 'metrics']);
  });
});

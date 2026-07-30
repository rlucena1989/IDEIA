import { ContractCDC, createContractCDC } from '../../packages/contract-cdc/src/contract-cdc';
import type { PactContract, CDCContract } from '../../packages/contract-cdc/src/types';

function pactInteraction(desc: string, method: string, path: string, status = 200, body?: unknown) {
  return {
    description: desc,
    type: 'request-response' as const,
    request: { method, path },
    response: { status, body },
  };
}

function endpoint(method: string, path: string, req: Record<string, unknown> = {}, res: Record<string, unknown> = {}) {
  return { method, path, request: req, response: res };
}

describe('Contract CDC — Pact-based Verification', () => {
  let cdc: ContractCDC;

  beforeEach(() => {
    cdc = createContractCDC();
  });

  it('should register and verify provider contracts', () => {
    const pact: PactContract = {
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      interactions: [
        pactInteraction('health check', 'GET', '/health', 200, { status: 'ok' }),
        pactInteraction('get user', 'GET', '/users/1', 200, { id: 1, name: 'Alice' }),
      ],
    };
    cdc.registerPact(pact);

    const actualContracts: PactContract[] = [{
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      interactions: [
        pactInteraction('health check', 'GET', '/health', 200, { status: 'ok' }),
        pactInteraction('get user', 'GET', '/users/1', 200, { id: 1, name: 'Alice' }),
      ],
    }];

    const result = cdc.verifyProvider('user-api', actualContracts);
    expect(result.passed).toBe(true);
    expect(result.summary.passed).toBe(2);
    expect(result.summary.total).toBe(2);
  });

  it('should detect provider contract mismatches', () => {
    cdc.registerPact({
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      interactions: [pactInteraction('health check', 'GET', '/health', 200, { status: 'ok' })],
    });

    const actualContracts: PactContract[] = [{
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      interactions: [pactInteraction('health check', 'GET', '/health', 500, { error: 'down' })],
    }];

    const result = cdc.verifyProvider('user-api', actualContracts);
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toContain('Status mismatch');
  });

  it('should generate compatibility matrix with multiple providers', () => {
    cdc.register({ consumer: 'web-app', provider: 'user-api', version: '1.0.0', endpoints: [endpoint('GET', '/users')] });
    cdc.register({ consumer: 'web-app', provider: 'payment-api', version: '2.0.0', endpoints: [endpoint('POST', '/charge')] });
    cdc.register({ consumer: 'mobile-app', provider: 'user-api', version: '1.0.0', endpoints: [endpoint('GET', '/users')] });

    const matrix = cdc.getCompatibilityMatrix();
    expect(matrix.consumers).toContain('web-app');
    expect(matrix.consumers).toContain('mobile-app');
    expect(matrix.providers).toContain('user-api');
    expect(matrix.providers).toContain('payment-api');

    const entry = matrix.matrix['web-app']?.['user-api'];
    expect(entry).toBeDefined();
    expect(entry.status).toBe('compatible');
  });

  it('should distinguish between CDCContract and Pact verification flows', () => {
    const cdcContract: CDCContract = {
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      endpoints: [endpoint('GET', '/users', {}, { users: 'array' })],
    };
    cdc.register(cdcContract);

    const pact: PactContract = {
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      interactions: [pactInteraction('list users', 'GET', '/users', 200, { users: [] })],
    };
    cdc.registerPact(pact);

    const compat = cdc.testContract('web-app', 'user-api', cdcContract);
    expect(compat.compatible).toBe(true);

    const providerResult = cdc.verifyProvider('user-api', [pact]);
    expect(providerResult.passed).toBe(true);
  });

  it('should register pact and verify provider', () => {
    cdc.registerPact({
      consumer: 'cli',
      provider: 'agent-runtime',
      version: '1.0.0',
      interactions: [pactInteraction('health check', 'GET', '/health', 200, { status: 'ok' })],
    });
    const pact = cdc.getPact('cli', 'agent-runtime');
    expect(pact).toBeDefined();
    expect(pact?.consumer).toBe('cli');

    const result = cdc.verifyProvider('agent-runtime', [pact!]);
    expect(result.passed).toBe(true);
  });

  it('should publish contracts and verify checksum integrity', () => {
    cdc.registerPact({
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      interactions: [pactInteraction('health', 'GET', '/health')],
    });

    const published = cdc.publishContracts();
    expect(published).toHaveLength(1);
    expect(published[0].checksum).toBeTruthy();
    expect(published[0].checksum.length).toBe(64);
  });

  it('should diff CDC contracts and suggest version bumps', () => {
    const v1: CDCContract = {
      consumer: 'a', provider: 'b', version: '1.0.0',
      endpoints: [endpoint('GET', '/users')],
    };
    const v2: CDCContract = {
      consumer: 'a', provider: 'b', version: '1.0.0',
      endpoints: [endpoint('GET', '/users'), endpoint('POST', '/users')],
    };
    cdc.register(v1);

    const diff = cdc.diff(v1, v2);
    expect(diff.classification).toBe('minor');

    const suggestion = cdc.suggestVersion('1.0.0', diff);
    expect(suggestion.suggested).toBe('1.1.0');
  });
});

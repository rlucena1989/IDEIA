import { createContractTester } from '../contract-tester';
import type { CDCContract } from '../types';

function endpoint(method: string, path: string, req: Record<string, unknown> = {}, res: Record<string, unknown> = {}) {
  return { method, path, request: req, response: res };
}

function contract(consumer: string, provider: string, version = '1.0.0', endpoints?: Array<ReturnType<typeof endpoint>>): CDCContract {
  return {
    consumer,
    provider,
    version,
    endpoints: endpoints ?? [endpoint('GET', '/ping')],
  };
}

describe('ContractTester Advanced', () => {
  it('should report no drift when no history exists yet', () => {
    const tester = createContractTester();
    const c = contract('web', 'api', '1.0.0', [
      endpoint('GET', '/users', {}, { id: 'number' }),
      endpoint('POST', '/users', { name: 'string' }, { id: 'number' }),
    ]);

    const results = tester.detectDrift([c]);
    expect(results).toHaveLength(1);
    expect(results[0].drifted).toBe(false);
    expect(results[0].severity).toBe('none');
  });

  it('should report no drift for first-time contract registration', () => {
    const tester = createContractTester();
    const c = contract('first', 'service');

    const results = tester.detectDrift([c]);

    expect(results).toHaveLength(1);
    expect(results[0].drifted).toBe(false);
    expect(results[0].severity).toBe('none');
    expect(results[0].changes).toHaveLength(0);
  });

  it('should return failure for unregistered consumer in verifyConsumer', () => {
    const tester = createContractTester();
    const c = contract('unknown', 'api');

    const result = tester.verifyConsumer('unknown', c);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.stringContaining('No registered contract')])
    );
    expect(result.suggestion).toBe('Register the base contract first');
  });

  it('should propagate breaking changes through verifyConsumer', () => {
    const tester = createContractTester();
    const base = contract('app', 'db', '2.0.0', [
      endpoint('GET', '/records', { id: 'string' }, { data: 'object' }),
    ]);
    tester.registerProvider('db', base);

    const modified = contract('app', 'db', '2.0.0', [
      endpoint('GET', '/records', { id: 'string' }, { data: 'number' }),
    ]);

    const result = tester.verifyConsumer('app', modified);

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toContain('breaking');
  });

  it('should validate consumer via validateConsumer alias', () => {
    const tester = createContractTester();
    const base = contract('app', 'svc', '1.0.0', [
      endpoint('GET', '/items', {}, { list: 'array' }),
    ]);
    tester.registerProvider('svc', base);

    const result = tester.validateConsumer('app', base);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should handle empty contract list in detectDrift', () => {
    const tester = createContractTester();

    const results = tester.detectDrift([]);

    expect(results).toHaveLength(0);
  });

  it('should handle multiple contracts in detectDrift', () => {
    const tester = createContractTester();
    const c1 = contract('app', 'svc', '1.0.0');
    const c2 = contract('app2', 'svc2', '1.0.0');

    const results = tester.detectDrift([c1, c2]);
    expect(results).toHaveLength(2);
    expect(results[0].drifted).toBe(false);
    expect(results[1].drifted).toBe(false);
  });
});

import { ContractCDC, createContractCDC } from '../src/contract-cdc';
import { createContractTester } from '../src/contract-tester';

describe('ContractCDC C17 — Enhanced', () => {
  const ep = (m: string, p: string, req?: Record<string,unknown>, res?: Record<string,unknown>) => ({
    method: m, path: p,
    request: req ?? { body: 'string' },
    response: res ?? { ok: 'boolean' },
  });

  const pactInteraction = (desc: string, m: string, p: string, status?: number, body?: unknown) => ({
    description: desc,
    type: 'request-response' as const,
    request: { method: m, path: p },
    response: { status: status ?? 200, body },
  });

  const baseContract = () => ({
    consumer: 'cli',
    provider: 'agent-runtime',
    version: '1.0.0',
    endpoints: [
      ep('GET', '/health'),
      ep('POST', '/execute', { command: 'string' }, { result: 'string' }),
    ],
  });

  it('should create via factory', () => {
    const cdc = createContractCDC();
    expect(cdc).toBeDefined();
  });

  it('should register, retrieve, and list', () => {
    const cdc = new ContractCDC();
    cdc.register(baseContract());
    expect(cdc.get('cli', 'agent-runtime')).toBeDefined();
    expect(cdc.list()).toHaveLength(1);
  });

  it('should return undefined for unknown contract', () => {
    const cdc = new ContractCDC();
    expect(cdc.get('unknown', 'unknown')).toBeUndefined();
  });

  it('should detect breaking endpoint removal', () => {
    const cdc = new ContractCDC();
    const v1 = baseContract();
    const v2 = baseContract();
    v2.endpoints = v2.endpoints.filter(e => e.method !== 'POST');
    const diff = cdc.diff(v1, v2);
    expect(diff.breaking).toBe(true);
    expect(diff.classification).toBe('major');
  });

  it('should suggest version bumps correctly', () => {
    const cdc = new ContractCDC();
    const v1 = baseContract();
    const v2 = baseContract();
    v2.endpoints = v2.endpoints.filter(e => e.method !== 'POST');
    const breakingDiff = cdc.diff(v1, v2);
    expect(cdc.suggestVersion('1.0.0', breakingDiff).bump).toBe('major');
    expect(cdc.suggestVersion('1.0.0', breakingDiff).suggested).toBe('2.0.0');

    const v3 = baseContract();
    v3.endpoints.push(ep('DELETE', '/cleanup'));
    const minorDiff = cdc.diff(v1, v3);
    expect(cdc.suggestVersion('1.0.0', minorDiff).bump).toBe('minor');
    expect(cdc.suggestVersion('1.0.0', minorDiff).suggested).toBe('1.1.0');
  });

  it('should test contract compatibility', () => {
    const cdc = new ContractCDC();
    cdc.register(baseContract());
    const good = cdc.testContract('cli', 'agent-runtime', baseContract());
    expect(good.compatible).toBe(true);

    const bad = cdc.testContract('cli', 'agent-runtime', {
      ...baseContract(),
      endpoints: [{ method: 'GET', path: '/other', request: {}, response: {} }],
    });
    expect(bad.compatible).toBe(false);
  });

  it('should build compatibility matrix', () => {
    const cdc = new ContractCDC();
    cdc.register({ consumer: 'a', provider: 'x', version: '1.0.0', endpoints: [ep('GET', '/test')] });
    const matrix = cdc.getCompatibilityMatrix();
    expect(matrix.consumers).toContain('a');
  });

  it('should register pact contracts', () => {
    const cdc = new ContractCDC();
    cdc.registerPact({
      consumer: 'cli', provider: 'agent-runtime', version: '1.0.0',
      interactions: [pactInteraction('health check', 'GET', '/health')],
      metadata: { generatedAt: new Date().toISOString() },
    });
    expect(cdc.listPacts()).toHaveLength(1);
  });

  it('should verify provider against pacts', () => {
    const cdc = new ContractCDC();
    cdc.registerPact({
      consumer: 'cli', provider: 'agent-runtime', version: '1.0.0',
      interactions: [pactInteraction('health check', 'GET', '/health', 200, { ok: true })],
      metadata: { generatedAt: new Date().toISOString() },
    });
    const result = cdc.verifyProvider('agent-runtime', [
      {
        consumer: 'cli', provider: 'agent-runtime', version: '1.0.0',
        interactions: [pactInteraction('health check', 'GET', '/health', 200, { ok: true })],
      },
    ]);
    expect(result.passed).toBe(true);
    expect(result.summary.passed).toBe(1);
  });

  it('should detect pact verification failures', () => {
    const cdc = new ContractCDC();
    cdc.registerPact({
      consumer: 'cli', provider: 'agent-runtime', version: '1.0.0',
      interactions: [pactInteraction('health check', 'GET', '/health', 200, { ok: true })],
      metadata: { generatedAt: new Date().toISOString() },
    });
    const result = cdc.verifyProvider('agent-runtime', [
      {
        consumer: 'cli', provider: 'agent-runtime', version: '1.0.0',
        interactions: [pactInteraction('health check', 'GET', '/health', 500)],
      },
    ]);
    expect(result.passed).toBe(false);
  });

  it('should manage expectations', () => {
    const cdc = new ContractCDC();
    cdc.addExpectation('cli', 'agent-runtime', pactInteraction('execute cmd', 'POST', '/execute'));
    const exps = cdc.getExpectations('cli', 'agent-runtime');
    expect(exps).toHaveLength(1);
    expect(exps[0].consumer).toBe('cli');
  });
});

describe('ContractTester C17', () => {
  it('should create via factory', () => {
    const tester = createContractTester();
    expect(tester).toBeDefined();
  });

  it('should register providers and consumers', () => {
    const tester = createContractTester();
    tester.registerProvider('api', { consumer: 'cli', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/users', request: {}, response: {} }] });
    tester.registerConsumer('web', { consumer: 'web', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/users', request: {}, response: {} }] });
    expect(tester.list()).toHaveLength(2);
  });

  it('should detect drift', () => {
    const tester = createContractTester();
    const drift = tester.detectDrift([
      { consumer: 'web', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/users', request: {}, response: {} }] },
    ]);
    expect(drift).toHaveLength(1);
    expect(drift[0].drifted).toBe(false);
  });

  it('should verify consumer compatibility', () => {
    const tester = createContractTester();
    tester.registerProvider('api', { consumer: 'cli', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/users', request: {}, response: { name: 'string' } }] });
    const result = tester.verifyConsumer('cli', { consumer: 'cli', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/users', request: {}, response: { name: 'string' } }] });
    expect(result.valid).toBe(true);
  });

  it('should reject incompatible consumer', () => {
    const tester = createContractTester();
    tester.registerProvider('api', { consumer: 'cli', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/users', request: {}, response: { name: 'string' } }] });
    const result = tester.verifyConsumer('cli', { consumer: 'cli', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/different', request: {}, response: {} }] });
    expect(result.valid).toBe(false);
  });

  it('should expose compatibility matrix', () => {
    const tester = createContractTester();
    tester.registerProvider('api', { consumer: 'cli', provider: 'api', version: '1.0.0', endpoints: [{ method: 'GET', path: '/health', request: {}, response: {} }] });
    const matrix = tester.getCompatibilityMatrix();
    expect(matrix.providers).toContain('api');
  });

  it('should handle pact registration', () => {
    const tester = createContractTester();
    tester.registerPact({
      consumer: 'cli', provider: 'api', version: '1.0.0',
      interactions: [{ description: 'health', type: 'request-response', request: { method: 'GET', path: '/health' }, response: { status: 200 } }],
    });
    expect(tester.listPacts()).toHaveLength(1);
  });
});

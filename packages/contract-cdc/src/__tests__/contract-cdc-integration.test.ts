import { ContractCDC, createContractCDC } from '../contract-cdc';
import type { CDCContract, PactContract} from '../types';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(() => []),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFs = jest.requireMock('fs') as any;

function endpoint(method: string, path: string, req: Record<string, unknown> = {}, res: Record<string, unknown> = {}) {
  return { method, path, request: req, response: res };
}

function pactInteraction(desc: string, method: string, path: string, status = 200, body?: unknown) {
  return {
    description: desc,
    type: 'request-response' as const,
    request: { method, path },
    response: { status, body },
  };
}

describe('ContractCDC Integration', () => {
  let cdc: ContractCDC;

  beforeEach(() => {
    cdc = createContractCDC();
    jest.clearAllMocks();
  });

  it('should publish contracts and write files to the filesystem', () => {
    cdc.registerPact({
      consumer: 'cli',
      provider: 'agent-runtime',
      version: '1.0.0',
      interactions: [pactInteraction('health', 'GET', '/health')],
    });

    const published = cdc.publishContracts();

    expect(published).toHaveLength(1);
    expect(published[0].consumer).toBe('cli');
    expect(published[0].provider).toBe('agent-runtime');
    expect(published[0].checksum).toBeTruthy();
    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });

  it('should fetch contracts from filesystem', () => {
    const storedPact: PactContract = {
      consumer: 'cli',
      provider: 'agent-runtime',
      version: '1.0.0',
      interactions: [pactInteraction('health', 'GET', '/health', 200, { ok: true })],
    };

    mockFs.existsSync.mockReturnValue(true);
    (mockFs.readdirSync as jest.Mock).mockReturnValue(['cli--agent-runtime.json']);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      consumer: 'cli',
      provider: 'agent-runtime',
      version: '1.0.0',
      pact: storedPact,
      publishedAt: new Date().toISOString(),
      checksum: 'abc123',
    }));

    const fetched = cdc.fetchContracts();

    expect(fetched).toHaveLength(1);
    expect(fetched[0].consumer).toBe('cli');
    expect(fetched[0].provider).toBe('agent-runtime');
    expect(cdc.getPact('cli', 'agent-runtime')).toBeDefined();
  });

  it('should add expectations and support the full lifecycle', () => {
    const interaction = pactInteraction('create user', 'POST', '/users', 201, { id: 1 });
    const expectation = cdc.addExpectation('web-app', 'user-api', interaction);

    expect(expectation.consumer).toBe('web-app');
    expect(expectation.provider).toBe('user-api');
    expect(expectation.verified).toBe(false);
    expect(expectation.createdAt).toBeTruthy();

    expectation.verified = true;
    const retrieved = cdc.getExpectations('web-app', 'user-api');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].verified).toBe(true);
  });

  it('should build compatibility matrix with expectations', () => {
    cdc.register({
      consumer: 'web-app',
      provider: 'user-api',
      version: '1.0.0',
      endpoints: [endpoint('GET', '/users')],
    });
    cdc.addExpectation('web-app', 'user-api', pactInteraction('list users', 'GET', '/users'));

    const matrix = cdc.getCompatibilityMatrix();

    expect(matrix.consumers).toContain('web-app');
    expect(matrix.providers).toContain('user-api');
    const entry = matrix.matrix['web-app']['user-api'];
    expect(entry.status).toBe('compatible');
    expect(entry.compatible).toBe(false);
  });

  it('should detect field type changes in diff', () => {
    const v1: CDCContract = {
      consumer: 'a', provider: 'b', version: '1.0.0',
      endpoints: [endpoint('POST', '/submit', { name: 'string' }, { id: 'number' })],
    };
    const v2: CDCContract = {
      consumer: 'a', provider: 'b', version: '1.0.0',
      endpoints: [endpoint('POST', '/submit', { name: 'number' }, { id: 'number' })],
    };

    const result = cdc.diff(v1, v2);

    expect(result.breaking).toBe(true);
    expect(result.changes).toEqual(
      expect.arrayContaining([expect.stringMatching(/Request field.*type changed/)])
    );
  });

  it('should return empty changes for identical contracts', () => {
    const contract: CDCContract = {
      consumer: 'a', provider: 'b', version: '1.0.0',
      endpoints: [endpoint('GET', '/ping')],
    };

    const result = cdc.diff(contract, contract);

    expect(result.changes).toHaveLength(0);
    expect(result.breaking).toBe(false);
    expect(result.classification).toBe('patch');
  });

  it('should return empty list when fetch directory does not exist', () => {
    mockFs.existsSync.mockReturnValue(false);

    const contracts = cdc.fetchContracts();

    expect(contracts).toHaveLength(0);
  });
});

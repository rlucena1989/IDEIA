import { ContractCDC, createContractCDC } from '../src/contract-cdc';
import type { CDCContract, CDCEndpoint } from '../src/types';

function makeEndpoint(method: string, path: string, req: Record<string, unknown>, res: Record<string, unknown>): CDCEndpoint {
  return { method, path, request: req, response: res };
}

const CLI_AGENT_CONTRACT: CDCContract = {
  consumer: 'cli',
  provider: 'agent-runtime',
  version: '1.0.0',
  endpoints: [
    makeEndpoint('POST', '/agent/run', { message: 'string', actionType: 'string' }, { steps: 'array', decision: 'string', reason: 'string', actionId: 'string' }),
    makeEndpoint('POST', '/agent/confirm', { actionId: 'string', approved: 'boolean' }, { ok: 'boolean' }),
    makeEndpoint('GET', '/agent/status', {}, { status: 'string', sessionId: 'string' }),
  ],
};

describe('Pact CDC: CLI (consumer) → AgentRuntime (provider)', () => {

  describe('Consumer-side contract (CLI expects)', () => {
    let cdc: ContractCDC;

    beforeEach(() => {
      cdc = createContractCDC();
      cdc.register(CLI_AGENT_CONTRACT);
    });

    it('should register the CLI→AgentRuntime contract', () => {
      const contract = cdc.get('cli', 'agent-runtime');
      expect(contract).toBeDefined();
      expect(contract!.consumer).toBe('cli');
      expect(contract!.provider).toBe('agent-runtime');
    });

    it('should detect breaking change when endpoint is removed', () => {
      const modified: CDCContract = {
        ...CLI_AGENT_CONTRACT,
        endpoints: CLI_AGENT_CONTRACT.endpoints.filter(e => e.path !== '/agent/confirm'),
      };
      const diff = cdc.diff(CLI_AGENT_CONTRACT, modified);
      expect(diff.breaking).toBe(true);
      expect(diff.classification).toBe('major');
    });

    it('should detect non-breaking addition', () => {
      const modified: CDCContract = {
        ...CLI_AGENT_CONTRACT,
        endpoints: [...CLI_AGENT_CONTRACT.endpoints, makeEndpoint('DELETE', '/agent/cancel', { actionId: 'string' }, { ok: 'boolean' })],
      };
      const diff = cdc.diff(CLI_AGENT_CONTRACT, modified);
      expect(diff.breaking).toBe(false);
      expect(diff.classification).toBe('minor');
    });

    it('should suggest version 2.0.0 for breaking changes', () => {
      const cdc2 = createContractCDC();
      const modified: CDCContract = {
        ...CLI_AGENT_CONTRACT,
        endpoints: CLI_AGENT_CONTRACT.endpoints.filter(e => e.path !== '/agent/status'),
      };
      const diff = cdc2.diff(CLI_AGENT_CONTRACT, modified);
      const suggestion = cdc2.suggestVersion('1.0.0', diff);
      expect(suggestion.suggested).toBe('2.0.0');
    });

    it('should detect type change in response field', () => {
      const modified: CDCContract = JSON.parse(JSON.stringify(CLI_AGENT_CONTRACT));
      const runEndpoint = modified.endpoints.find(e => e.path === '/agent/run')!;
      runEndpoint.response = { steps: 'number', decision: 'string', reason: 'string', actionId: 'string' };
      const cdc2 = createContractCDC();
      const diff = cdc2.diff(CLI_AGENT_CONTRACT, modified);
      expect(diff.breaking).toBe(true);
    });
  });

  describe('Provider verification (AgentRuntime must satisfy CLI contract)', () => {
    it('should verify contract compatibility', () => {
      const cdc = createContractCDC();
      cdc.register(CLI_AGENT_CONTRACT);

      const actualProviderContract: CDCContract = {
        consumer: 'cli',
        provider: 'agent-runtime',
        version: '1.0.0',
        endpoints: [
          makeEndpoint('POST', '/agent/run', { message: 'string', actionType: 'string' }, { steps: 'array', decision: 'string', reason: 'string', actionId: 'string' }),
          makeEndpoint('POST', '/agent/confirm', { actionId: 'string', approved: 'boolean' }, { ok: 'boolean' }),
          makeEndpoint('GET', '/agent/status', {}, { status: 'string', sessionId: 'string' }),
        ],
      };

      const result = cdc.testContract('cli', 'agent-runtime', actualProviderContract);
      expect(result.compatible).toBe(true);
    });

    it('should reject provider that removes a required endpoint', () => {
      const cdc = createContractCDC();
      cdc.register(CLI_AGENT_CONTRACT);

      const incomplete: CDCContract = {
        consumer: 'cli',
        provider: 'agent-runtime',
        version: '1.0.0',
        endpoints: [
          makeEndpoint('POST', '/agent/run', { message: 'string', actionType: 'string' }, { steps: 'array', decision: 'string', reason: 'string', actionId: 'string' }),
        ],
      };

      const result = cdc.testContract('cli', 'agent-runtime', incomplete);
      expect(result.compatible).toBe(false);
      expect(result.diff).not.toBeNull();
      expect(result.diff!.breaking).toBe(true);
    });

    it('should reject provider response field type mismatch', () => {
      const cdc = createContractCDC();
      cdc.register(CLI_AGENT_CONTRACT);

      const mismatched: CDCContract = JSON.parse(JSON.stringify(CLI_AGENT_CONTRACT));
      const statusEndpoint = mismatched.endpoints.find(e => e.path === '/agent/status')!;
      statusEndpoint.response = { status: 'number', sessionId: 'string' };

      const result = cdc.testContract('cli', 'agent-runtime', mismatched);
      expect(result.compatible).toBe(false);
    });
  });

});

describe('Pact file format specification', () => {
  it('should define the Pact-like contract structure', () => {
    const pactFile = {
      consumer: { name: 'cli' },
      provider: { name: 'agent-runtime' },
      interactions: CLI_AGENT_CONTRACT.endpoints.map(e => ({
        description: `${e.method} ${e.path}`,
        request: { method: e.method, path: e.path, body: e.request },
        response: { status: 200, body: e.response },
      })),
      metadata: {
        pactSpecification: { version: '2.0.0' },
        contractVersion: CLI_AGENT_CONTRACT.version,
      },
    };

    expect(pactFile.consumer.name).toBe('cli');
    expect(pactFile.provider.name).toBe('agent-runtime');
    expect(pactFile.interactions).toHaveLength(3);
    expect(pactFile.metadata.pactSpecification.version).toBe('2.0.0');

    const runInteraction = pactFile.interactions.find(i => i.description === 'POST /agent/run')!;
    expect(runInteraction.request.body).toEqual({ message: 'string', actionType: 'string' });
    expect(runInteraction.response.body).toHaveProperty('steps');
    expect(runInteraction.response.body).toHaveProperty('decision');
  });
});

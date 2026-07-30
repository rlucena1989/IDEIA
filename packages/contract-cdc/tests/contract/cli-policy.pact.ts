import { PactConsumer, createPactConsumer } from '../../src/pact-consumer';
import { createLogger } from '@ideia/logger';
import { PactProvider, createPactProvider } from '../../src/pact-provider';
import { ContractCDC, createContractCDC } from '../../src/contract-cdc';
const logger = createLogger('cli-policy.pact');

const CLI_POLICY_PACT_VERSION = '1.0.0';

export function createCliPolicyPactConsumer(cdc: ContractCDC): PactConsumer {
  const consumer = createPactConsumer({
    consumerName: 'cli',
    providerName: 'policy-engine',
    version: CLI_POLICY_PACT_VERSION,
    contractCDC: cdc,
  });

  consumer
    .uponReceiving('a request to check CLI command policy')
    .withRequest('POST', '/policy/evaluate', {
      headers: { 'Content-Type': 'application/json' },
      body: { action: 'cli:run', resource: 'project:generate', principal: 'user-1' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { allowed: true, reason: 'Command allowed for user', rule: 'allow-cli-commands' },
    });

  consumer
    .uponReceiving('a request to check CLI restricted command policy')
    .withRequest('POST', '/policy/evaluate', {
      headers: { 'Content-Type': 'application/json' },
      body: { action: 'cli:run', resource: 'system:delete-all', principal: 'user-1' },
    })
    .willRespondWith(403, {
      headers: { 'Content-Type': 'application/json' },
      body: { allowed: false, reason: 'Destructive command requires approval', rule: 'require-approval-destructive' },
    });

  consumer
    .uponReceiving('a request to evaluate policy compliance for a command set')
    .withRequest('POST', '/policy/compliance', {
      headers: { 'Content-Type': 'application/json' },
      body: { commands: ['project:generate', 'file:write', 'system:delete-all'], principal: 'user-1' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: {
        summary: { total: 3, allowed: 2, blocked: 1 },
        results: [
          { command: 'project:generate', allowed: true },
          { command: 'file:write', allowed: true },
          { command: 'system:delete-all', allowed: false, reason: 'Requires approval' },
        ],
      },
    });

  return consumer;
}

export function createCliPolicyPactProvider(cdc: ContractCDC): PactProvider {
  const provider = createPactProvider({
    providerName: 'policy-engine',
    version: CLI_POLICY_PACT_VERSION,
    contractCDC: cdc,
  });

  provider.registerState('policy engine is active with CLI rules', {
    setup: () => Promise.resolve(),
  });

  provider.registerHandler('a request to check CLI command policy', (request) => {
    const body = request.body as { resource?: string } | undefined;
    if (body?.resource === 'system:delete-all') {
      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: { allowed: false, reason: 'Destructive command requires approval', rule: 'require-approval-destructive' },
      };
    }
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { allowed: true, reason: 'Command allowed for user', rule: 'allow-cli-commands' },
    };
  });

  provider.registerHandler('a request to check CLI restricted command policy', () => ({
    status: 403,
    headers: { 'Content-Type': 'application/json' },
    body: { allowed: false, reason: 'Destructive command requires approval', rule: 'require-approval-destructive' },
  }));

  provider.registerHandler('a request to evaluate policy compliance for a command set', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      summary: { total: 3, allowed: 2, blocked: 1 },
      results: [
        { command: 'project:generate', allowed: true },
        { command: 'file:write', allowed: true },
        { command: 'system:delete-all', allowed: false, reason: 'Requires approval' },
      ],
    },
  }));

  return provider;
}

export function buildCliPolicyContract(): { consumer: PactConsumer; provider: PactProvider; cdc: ContractCDC } {
  const cdc = createContractCDC();
  const consumer = createCliPolicyPactConsumer(cdc);
  const provider = createCliPolicyPactProvider(cdc);
  consumer.register();
  return { consumer, provider, cdc };
}

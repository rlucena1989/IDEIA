import { PactConsumer, createPactConsumer } from '../../src/pact-consumer';
import { createLogger } from '@ideia/logger';
import { PactProvider, createPactProvider } from '../../src/pact-provider';
import { ContractCDC, createContractCDC } from '../../src/contract-cdc';
const logger = createLogger('agent-runtime-policy.pact');

const AGENT_RUNTIME_POLICY_VERSION = '1.0.0';

export function createAgentRuntimePolicyPactConsumer(cdc: ContractCDC): PactConsumer {
  const consumer = createPactConsumer({
    consumerName: 'agent-runtime',
    providerName: 'policy-engine',
    version: AGENT_RUNTIME_POLICY_VERSION,
    contractCDC: cdc,
  });

  consumer
    .uponReceiving('a request to evaluate a policy for an action')
    .withRequest('POST', '/policy/evaluate', {
      headers: { 'Content-Type': 'application/json' },
      body: { action: 'file:write', resource: '/workspace/src/main.ts', principal: 'agent-1' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { allowed: true, reason: 'Policy允许', rule: 'allow-write-src' },
    });

  consumer
    .uponReceiving('a request to evaluate a restricted action')
    .withRequest('POST', '/policy/evaluate', {
      headers: { 'Content-Type': 'application/json' },
      body: { action: 'shell:exec', resource: 'rm -rf /', principal: 'agent-1' },
    })
    .willRespondWith(403, {
      headers: { 'Content-Type': 'application/json' },
      body: { allowed: false, reason: 'Action blocked by security policy', rule: 'block-destructive-commands' },
    });

  consumer
    .uponReceiving('a request to list applicable policies')
    .withRequest('GET', '/policy/list', {
      headers: { 'Content-Type': 'application/json' },
      query: { principal: 'agent-1' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { policies: ['allow-write-src', 'block-destructive-commands', 'require-approval'], total: 3 },
    });

  return consumer;
}

export function createAgentRuntimePolicyPactProvider(cdc: ContractCDC): PactProvider {
  const provider = createPactProvider({
    providerName: 'policy-engine',
    version: AGENT_RUNTIME_POLICY_VERSION,
    contractCDC: cdc,
  });

  provider.registerState('policy engine is active', {
    setup: () => Promise.resolve(),
  });

  provider.registerHandler('a request to evaluate a policy for an action', (request) => {
    const body = request.body as { action?: string } | undefined;
    if (body?.action === 'shell:exec') {
      return {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: { allowed: false, reason: 'Action blocked by security policy', rule: 'block-destructive-commands' },
      };
    }
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { allowed: true, reason: 'Policy允许', rule: 'allow-write-src' },
    };
  });

  provider.registerHandler('a request to evaluate a restricted action', () => ({
    status: 403,
    headers: { 'Content-Type': 'application/json' },
    body: { allowed: false, reason: 'Action blocked by security policy', rule: 'block-destructive-commands' },
  }));

  provider.registerHandler('a request to list applicable policies', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { policies: ['allow-write-src', 'block-destructive-commands', 'require-approval'], total: 3 },
  }));

  return provider;
}

export function buildAgentRuntimePolicyContract(): { consumer: PactConsumer; provider: PactProvider; cdc: ContractCDC } {
  const cdc = createContractCDC();
  const consumer = createAgentRuntimePolicyPactConsumer(cdc);
  const provider = createAgentRuntimePolicyPactProvider(cdc);
  consumer.register();
  return { consumer, provider, cdc };
}

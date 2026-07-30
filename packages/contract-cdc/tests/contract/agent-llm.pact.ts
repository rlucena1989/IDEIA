import { PactConsumer, createPactConsumer } from '../../src/pact-consumer';
import { createLogger } from '@ideia/logger';
import { PactProvider, createPactProvider } from '../../src/pact-provider';
import { ContractCDC, createContractCDC } from '../../src/contract-cdc';
const logger = createLogger('agent-llm.pact');

const AGENT_LLM_PACT_VERSION = '1.0.0';

export function createAgentLlmPactConsumer(cdc: ContractCDC): PactConsumer {
  const consumer = createPactConsumer({
    consumerName: 'agent-runtime',
    providerName: 'llm-integration',
    version: AGENT_LLM_PACT_VERSION,
    contractCDC: cdc,
  });

  consumer
    .uponReceiving('a request to generate a completion from LLM')
    .withRequest('POST', '/llm/complete', {
      headers: { 'Content-Type': 'application/json' },
      body: { model: 'default', prompt: 'Generate a plan for creating a user CRUD', temperature: 0.2, maxTokens: 2000 },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { id: 'llm-compl-001', content: 'Plan: 1. Create model 2. Create routes 3. Create tests', model: 'default', usage: { promptTokens: 15, completionTokens: 25 } },
    });

  consumer
    .uponReceiving('a request to stream a completion from LLM')
    .withRequest('POST', '/llm/stream', {
      headers: { 'Content-Type': 'application/json' },
      body: { model: 'default', prompt: 'Explain step by step', stream: true },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'text/event-stream' },
      body: { streamId: 'stream-001', status: 'connected' },
    });

  consumer
    .uponReceiving('a request to check LLM provider health')
    .withRequest('GET', '/llm/health', {
      headers: { 'Content-Type': 'application/json' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { status: 'healthy', provider: 'ollama', models: ['default', 'codellama'], latencyMs: 150 },
    });

  return consumer;
}

export function createAgentLlmPactProvider(cdc: ContractCDC): PactProvider {
  const provider = createPactProvider({
    providerName: 'llm-integration',
    version: AGENT_LLM_PACT_VERSION,
    contractCDC: cdc,
  });

  provider.registerState('LLM integration is active', {
    setup: () => Promise.resolve(),
  });

  provider.registerHandler('a request to generate a completion from LLM', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { id: `llm-compl-${Date.now()}`, content: 'Plan: 1. Create model 2. Create routes 3. Create tests', model: 'default', usage: { promptTokens: 15, completionTokens: 25 } },
  }));

  provider.registerHandler('a request to stream a completion from LLM', () => ({
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    body: { streamId: 'stream-001', status: 'connected' },
  }));

  provider.registerHandler('a request to check LLM provider health', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { status: 'healthy', provider: 'ollama', models: ['default', 'codellama'], latencyMs: 150 },
  }));

  return provider;
}

export function buildAgentLlmContract(): { consumer: PactConsumer; provider: PactProvider; cdc: ContractCDC } {
  const cdc = createContractCDC();
  const consumer = createAgentLlmPactConsumer(cdc);
  const provider = createAgentLlmPactProvider(cdc);
  consumer.register();
  return { consumer, provider, cdc };
}

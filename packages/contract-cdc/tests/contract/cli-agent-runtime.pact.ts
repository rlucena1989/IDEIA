import { PactConsumer, createPactConsumer } from '../../src/pact-consumer';
import { createLogger } from '@ideia/logger';
import { PactProvider, createPactProvider } from '../../src/pact-provider';
import { ContractCDC, createContractCDC } from '../../src/contract-cdc';
const logger = createLogger('cli-agent-runtime.pact');

const CLI_AGENT_RUNTIME_VERSION = '1.0.0';

export function createCliAgentRuntimePactConsumer(cdc: ContractCDC): PactConsumer {
  const consumer = createPactConsumer({
    consumerName: 'cli',
    providerName: 'agent-runtime',
    version: CLI_AGENT_RUNTIME_VERSION,
    contractCDC: cdc,
  });

  consumer
    .uponReceiving('a request to execute a task')
    .withRequest('POST', '/runtime/execute', {
      headers: { 'Content-Type': 'application/json' },
      body: { taskId: 'task-001', action: 'run', params: { command: 'test' } },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { executionId: 'exec-001', status: 'started', taskId: 'task-001' },
    });

  consumer
    .uponReceiving('a request to get execution status')
    .withRequest('GET', '/runtime/execution/exec-001', {
      headers: { 'Content-Type': 'application/json' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { executionId: 'exec-001', status: 'completed', taskId: 'task-001', result: { exitCode: 0, output: 'All tests passed' } },
    });

  consumer
    .uponReceiving('a request to list running executions')
    .withRequest('GET', '/runtime/executions', {
      headers: { 'Content-Type': 'application/json' },
      query: { status: 'running', limit: '10' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { executions: [], total: 0 },
    });

  consumer
    .uponReceiving('a request to cancel a running execution')
    .withRequest('POST', '/runtime/execution/exec-002/cancel', {
      headers: { 'Content-Type': 'application/json' },
      body: { reason: 'user requested cancellation' },
    })
    .willRespondWith(200, {
      headers: { 'Content-Type': 'application/json' },
      body: { executionId: 'exec-002', status: 'cancelled', cancelledAt: '2026-01-01T00:00:00.000Z' },
    });

  return consumer;
}

export function createCliAgentRuntimePactProvider(cdc: ContractCDC): PactProvider {
  const provider = createPactProvider({
    providerName: 'agent-runtime',
    version: CLI_AGENT_RUNTIME_VERSION,
    contractCDC: cdc,
  });

  provider.registerState('agent runtime is active', {
    setup: () => Promise.resolve(),
  });

  provider.registerHandler('a request to execute a task', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { executionId: `exec-${Date.now()}`, status: 'started', taskId: 'task-001' },
  }));

  provider.registerHandler('a request to get execution status', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      executionId: 'exec-001',
      status: 'completed',
      taskId: 'task-001',
      result: { exitCode: 0, output: 'All tests passed' },
    },
  }));

  provider.registerHandler('a request to list running executions', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { executions: [], total: 0 },
  }));

  provider.registerHandler('a request to cancel a running execution', () => ({
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { executionId: 'exec-002', status: 'cancelled', cancelledAt: new Date().toISOString() },
  }));

  return provider;
}

export function buildCliAgentRuntimeContract(): { consumer: PactConsumer; provider: PactProvider; cdc: ContractCDC } {
  const cdc = createContractCDC();
  const consumer = createCliAgentRuntimePactConsumer(cdc);
  const provider = createCliAgentRuntimePactProvider(cdc);
  consumer.register();
  return { consumer, provider, cdc };
}

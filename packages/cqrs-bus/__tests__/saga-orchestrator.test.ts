import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SagaOrchestrator, SagaStep, SagaStepError, SagaFailedError } from '../src/saga-orchestrator';
import { CommandBus } from '../src/command-bus';
import type { IMessageBus, IKvStore } from '../src/command-bus';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid',
}));

function createMockBus(): IMessageBus {
  return {
    publish: jest.fn() as any,
    request: jest.fn() as any,
  } as unknown as IMessageBus;
}

function createMockKv(): IKvStore {
  return {
    get: jest.fn() as any,
    put: jest.fn() as any,
  } as unknown as IKvStore;
}

const mkCmd = (type: string, aggId: string, corrId: string) => ({
  id: '', type, aggregateId: aggId, data: {},
  metadata: { agentId: 'sys', timestamp: Date.now(), correlationId: corrId },
});

describe('SagaOrchestrator', () => {
  let bus: IMessageBus;
  let kv: IKvStore;
  let commandBus: CommandBus;
  let saga: SagaOrchestrator;

  beforeEach(() => {
    bus = createMockBus();
    kv = createMockKv();
    commandBus = new CommandBus(bus, kv);
    saga = new SagaOrchestrator(commandBus, kv);
  });

  it('executes steps successfully', async () => {
    const steps: SagaStep[] = [
      { name: 'reserve', command: mkCmd('order.reserve', 'order-1', 'c1') },
      { name: 'charge', command: mkCmd('payment.charge', 'payment-1', 'c2') },
    ];
    await expect(saga.execute(steps, { id: 'saga-1' })).resolves.toBeUndefined();
  });

  it('compensates on failure', async () => {
    (bus.request as any).mockRejectedValueOnce(null);
    (bus.request as any).mockRejectedValueOnce(new Error('Step 2 failed'));
    const steps: SagaStep[] = [
      { name: 'step1', command: mkCmd('step1', 'a1', 'c1'), compensate: mkCmd('step1.undo', 'a1', 'c1') },
      { name: 'step2', command: mkCmd('step2', 'a2', 'c2') },
    ];
    await expect(saga.execute(steps, { id: 'saga-2' })).rejects.toThrow(SagaFailedError);
  });

  it('creates SagaStepError', () => {
    const err = new SagaStepError('charge', new Error('Insufficient funds'));
    expect(err.stepName).toBe('charge');
    expect(err.message).toContain('Insufficient funds');
  });

  it('creates SagaFailedError', () => {
    const err = new SagaFailedError('saga-1', ['step1', 'step2'], ['step1'], new Error('Failed'));
    expect(err.sagaId).toBe('saga-1');
    expect(err.executed).toEqual(['step1', 'step2']);
    expect(err.compensated).toEqual(['step1']);
  });

  it('retries on failure and succeeds', async () => {
    let attempts = 0;
    (bus.request as any).mockImplementation(async () => {
      attempts++;
      if (attempts < 2) throw new Error('Temporary');
      return { data: new TextEncoder().encode(JSON.stringify({ ok: true })) };
    });
    const steps: SagaStep[] = [
      { name: 'retry-step', command: mkCmd('test.retry', 'agg-1', 'c1'), retries: 3 },
    ];
    await expect(saga.execute(steps, { id: 'saga-3' })).resolves.toBeUndefined();
  });

  it('handles async steps', async () => {
    const steps: SagaStep[] = [
      { name: 'async-step', command: mkCmd('test.async', 'agg-1', 'c1'), async: true },
    ];
    await expect(saga.execute(steps, { id: 'saga-4' })).resolves.toBeUndefined();
    expect(bus.publish).toHaveBeenCalled();
  });
});

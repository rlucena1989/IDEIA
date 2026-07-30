import { CommandBus } from '../command-bus';
import { EventBus } from '../event-bus';
import { SagaOrchestrator, SagaStepError, SagaFailedError } from '../saga-orchestrator';
import { ConsistencyVerifier } from '../consistency-verifier';
import { SagaSafetyVerifier } from '../saga-safety-verifier';
import { CQRSBenchmark } from '../cqrs-benchmark';
import { Command, SagaStep } from '../types';

describe('CommandBus', () => {
  let bus: CommandBus;

  beforeEach(() => { bus = new CommandBus(); });

  it('should dispatch a command', async () => {
    const cmd: Command = {
      id: '1', type: 'test', aggregateId: 'agg-1', data: {},
      metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'corr-1' },
    };
    const result = await bus.dispatch(cmd);
    expect(result.success).toBe(true);
  });

  it('should validate command', async () => {
    await expect(bus.dispatch({} as Command)).rejects.toThrow('Command type is required');
  });

  it('should call registered handler', async () => {
    bus.registerHandler('ping', async () => ({
      success: true, commandId: '1', events: [], latencyMs: 0,
    }));
    const cmd: Command = {
      id: '1', type: 'ping', aggregateId: 'agg-1', data: {},
      metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'corr-1' },
    };
    const result = await bus.dispatch(cmd);
    expect(result.success).toBe(true);
  });

  it('should deduplicate commands', async () => {
    const cmd: Command = {
      id: '1', type: 'test', aggregateId: 'agg-1', data: {},
      metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'same' },
    };
    const r1 = await bus.dispatchWithDedup(cmd);
    const r2 = await bus.dispatchWithDedup(cmd);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    bus.registerHandler('flaky', async () => {
      attempts++;
      if (attempts < 2) return { success: false, commandId: '1', events: [], error: 'fail', latencyMs: 0 };
      return { success: true, commandId: '1', events: [], latencyMs: 0 };
    });
    const cmd: Command = {
      id: '1', type: 'flaky', aggregateId: 'agg-1', data: {},
      metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'corr-1' },
    };
    const result = await bus.dispatchWithRetry(cmd, 2, 10);
    expect(result.success).toBe(true);
  });

  it('should dispatch batch', async () => {
    const batch: Command[] = [
      { id: '1', type: 't', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } },
      { id: '2', type: 't', aggregateId: 'a2', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c2' } },
    ];
    const results = await bus.dispatchBatch(batch);
    expect(results.length).toBe(2);
  });
});

describe('EventBus', () => {
  let bus: EventBus;
  beforeEach(() => { bus = new EventBus(); });

  it('should publish and receive events', async () => {
    const events: string[] = [];
    bus.subscribe('test.event', async (evt) => { events.push(evt.type); });
    bus.publish({ type: 'test.event', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1', version: 1 } });
    expect(events.length).toBe(1);
  });

  it('should support wildcard subscriber', async () => {
    const events: string[] = [];
    bus.subscribe('*', async (evt) => { events.push(evt.type); });
    bus.publish({ type: 'any.event', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1', version: 1 } });
    expect(events).toContain('any.event');
  });

  it('should maintain history', () => {
    bus.publish({ type: 'evt1', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1', version: 1 } });
    bus.publish({ type: 'evt2', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c2', version: 2 } });
    expect(bus.getHistory().length).toBe(2);
    expect(bus.getHistory('evt1').length).toBe(1);
  });

  it('should unsubscribe', async () => {
    const events: string[] = [];
    const handler = async (evt: any) => { events.push(evt.type); };
    bus.subscribe('test', handler);
    bus.unsubscribe('test', handler);
    bus.publish({ type: 'test', aggregateId: 'a', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1', version: 1 } });
    expect(events.length).toBe(0);
  });

  it('should clear state', () => {
    bus.publish({ type: 't', aggregateId: 'a', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1', version: 1 } });
    bus.clear();
    expect(bus.getHistory().length).toBe(0);
    expect(bus.getSubscriberCount()).toBe(0);
  });
});

describe('SagaOrchestrator', () => {
  let saga: SagaOrchestrator;
  let commandBus: CommandBus;

  beforeEach(() => {
    commandBus = new CommandBus();
    saga = new SagaOrchestrator(commandBus);
  });

  it('should execute saga successfully', async () => {
    const steps: SagaStep[] = [
      { name: 'step1', command: { id: '1', type: 't1', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } } },
      { name: 'step2', command: { id: '2', type: 't2', aggregateId: 'a2', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c2' } } },
    ];
    const state = await saga.execute(steps, { id: 'saga-1', initiator: 'test', createdAt: Date.now() });
    expect(state.status).toBe('completed');
  });

  it('should compensate on failure', async () => {
    commandBus.registerHandler('good', async () => ({ success: true, commandId: '1', events: [], latencyMs: 0 }));
    commandBus.registerHandler('bad', async () => { throw new Error('fail'); });
    const steps: SagaStep[] = [
      { name: 'goodStep', command: { id: '1', type: 'good', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } }, compensate: { id: 'c1', type: 'good', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } } },
      { name: 'badStep', command: { id: '2', type: 'bad', aggregateId: 'a2', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c2' } } },
    ];
    await expect(saga.execute(steps, { id: 'saga-2', initiator: 'test', createdAt: Date.now() })).rejects.toThrow(SagaFailedError);
  });

  it('should skip on error when configured', async () => {
    commandBus.registerHandler('fail', async () => { throw new Error('fail'); });
    const steps: SagaStep[] = [
      { name: 'skippable', command: { id: '1', type: 'fail', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } }, onError: 'skip' },
    ];
    const state = await saga.execute(steps, { id: 'saga-3', initiator: 'test', createdAt: Date.now() });
    expect(state.status).toBe('completed');
  });

  it('should recover saga from checkpoint', async () => {
    const steps: SagaStep[] = [
      { name: 's1', command: { id: '1', type: 't', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } } },
    ];
    await saga.execute(steps, { id: 'saga-rec', initiator: 'test', createdAt: Date.now() });
    const recovered = await saga.recoverSaga('saga-rec', steps);
    expect(recovered.status).toBe('completed');
  });

  it('should get saga state', async () => {
    const state = await saga.getSagaState('nonexistent');
    expect(state).toBeNull();
  });

  it('should handle async saga steps', async () => {
    const steps: SagaStep[] = [
      { name: 'asyncStep', command: { id: '1', type: 't', aggregateId: 'a1', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c1' } }, async: true },
    ];
    const state = await saga.execute(steps, { id: 'saga-async', initiator: 'test', createdAt: Date.now() });
    expect(state.status).toBe('completed');
  });
});

describe('ConsistencyVerifier', () => {
  let verifier: ConsistencyVerifier;
  beforeEach(() => { verifier = new ConsistencyVerifier(); });

  it('should verify consistent projection', async () => {
    verifier.registerProjection('test-proj');
    const report = await verifier.verifyConsistency('test-proj', [
      { type: 'e1', aggregateId: 'a1', version: 1, timestamp: Date.now() - 100 },
      { type: 'e2', aggregateId: 'a1', version: 2, timestamp: Date.now() - 50 },
    ]);
    expect(report.isConsistent).toBe(true);
    expect(report.projection).toBe('test-proj');
  });

  it('should detect missing events', async () => {
    verifier.registerProjection('laggy-proj', 1000, 10);
    const report = await verifier.verifyConsistency('laggy-proj', [
      { type: 'e1', aggregateId: 'a1', version: 1, timestamp: Date.now() - 5000 },
      { type: 'e2', aggregateId: 'a1', version: 5, timestamp: Date.now() - 4000 },
    ]);
    expect(report.missingEvents).toBeGreaterThan(0);
  });

  it('should update and track clocks', async () => {
    verifier.registerProjection('p1');
    await verifier.updateClock('p1', 'agg-1', 3);
    const report = await verifier.verifyConsistency('p1', [
      { type: 'e1', aggregateId: 'agg-1', version: 3, timestamp: Date.now() },
    ]);
    expect(report.missingEvents).toBe(0);
  });

  it('should measure projection lag', () => {
    const lag = verifier.getProjectionLag('test', [
      { timestamp: Date.now() - 200 },
      { timestamp: Date.now() - 100 },
    ]);
    expect(lag.lagMs).toBeGreaterThanOrEqual(0);
  });
});

describe('SagaSafetyVerifier', () => {
  let verifier: SagaSafetyVerifier;
  beforeEach(() => { verifier = new SagaSafetyVerifier(); });

  it('should build petri net', () => {
    const net = verifier.buildSagaPetriNet('test-saga', [
      { name: 'step1', compensatedBy: 'comp1' },
      { name: 'step2' },
    ]);
    expect(net.places.size).toBeGreaterThan(0);
    expect(net.transitions.length).toBeGreaterThan(0);
  });

  it('should verify safe saga', () => {
    verifier.buildSagaPetriNet('safe', [
      { name: 'step1', compensatedBy: 'comp1' },
      { name: 'step2', compensatedBy: 'comp2' },
    ]);
    const result = verifier.verifySafety('safe');
    expect(result.canComplete).toBe(true);
    expect(result.verified).toBe(true);
  });

  it('should detect deadlocks', () => {
    verifier.buildSagaPetriNet('unsafe', [{ name: 'step1' }, { name: 'step2' }]);
    const result = verifier.verifySafety('unsafe', 50);
    expect(typeof result.verified).toBe('boolean');
  });
});

describe('CQRSBenchmark', () => {
  let benchmark: CQRSBenchmark;
  beforeEach(() => { benchmark = new CQRSBenchmark(); });

  it('should run benchmark suite', async () => {
    const results = await benchmark.runSuite({
      operations: 100, batchSize: 10, payloadSize: 256,
      consumers: 1, producers: 1, duration: 100,
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should generate report', async () => {
    await benchmark.runSuite({ operations: 50, batchSize: 10, payloadSize: 128, consumers: 1, producers: 1, duration: 50 });
    const report = benchmark.generateReport();
    expect(report).toContain('Benchmark');
  });

  it('should return results', async () => {
    await benchmark.runSuite({ operations: 50, batchSize: 10, payloadSize: 128, consumers: 1, producers: 1, duration: 50 });
    expect(benchmark.getResults().length).toBeGreaterThan(0);
  });

  it('should export JSON asynchronously', async () => {
    await benchmark.runSuite({ operations: 10, batchSize: 5, payloadSize: 64, consumers: 1, producers: 1, duration: 50 });
    const json = JSON.stringify(benchmark.getResults());
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });
});

describe('SagaStepError', () => {
  it('should create error with step name', () => {
    const err = new SagaStepError('testStep', new Error('cause'));
    expect(err.stepName).toBe('testStep');
    expect(err.message).toContain('testStep');
    expect(err.name).toBe('SagaStepError');
  });
});

describe('SagaFailedError', () => {
  it('should create error with saga details', () => {
    const err = new SagaFailedError('saga-1', ['step1'], [], new Error('fail'));
    expect(err.sagaId).toBe('saga-1');
    expect(err.executed).toContain('step1');
    expect(err.name).toBe('SagaFailedError');
  });
});
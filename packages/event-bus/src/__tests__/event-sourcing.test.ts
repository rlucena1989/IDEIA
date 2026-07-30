import { randomUUID } from 'crypto';
import { AggregateRoot } from '../aggregate-root';
import { InMemoryEventStore } from '../event-store';
import { InMemorySnapshotStore } from '../snapshot-store';
import { ProjectionEngine, AgentSessionProjection } from '../projection-engine';
import { SagaCoordinator } from '../saga-coordinator';
import {
  ConcurrencyError,
  type DomainEvent,
  type SagaDefinition,
  type SagaStepResult,
} from '../types-event-sourcing';

interface TestState {
  value: string;
  count: number;
}

class TestAggregate extends AggregateRoot<TestState> {
  private state: TestState = { value: '', count: 0 };

  doSomething(value: string, agentId?: string): void {
    this.addEvent('something_done', { value }, { agentId });
  }

  apply(event: DomainEvent): void {
    if (event.type === 'something_done') {
      this.state.value = event.data.value as string;
      this.state.count += 1;
    }
  }

  toState(): TestState {
    return { ...this.state };
  }
}

describe('AggregateRoot', () => {
  it('should add events and apply them', () => {
    const agg = new TestAggregate('test-1');
    expect(agg.version).toBe(0);
    expect(agg.id).toBe('test-1');

    agg.doSomething('hello');
    expect(agg.version).toBe(1);
    expect(agg.toState().value).toBe('hello');
    expect(agg.toState().count).toBe(1);

    const pending = agg.getPendingEvents();
    expect(pending).toHaveLength(1);
    expect(pending[0].type).toBe('something_done');
    expect(pending[0].version).toBe(1);
    expect(pending[0].aggregateId).toBe('test-1');
  });

  it('should clear pending events', () => {
    const agg = new TestAggregate('test-2');
    agg.doSomething('a');
    agg.doSomething('b');
    expect(agg.getPendingEvents()).toHaveLength(2);
    agg.clearPendingEvents();
    expect(agg.getPendingEvents()).toHaveLength(0);
  });

  it('should load from history', () => {
    const agg = new TestAggregate('test-3');
    const events: DomainEvent[] = [
      {
        id: randomUUID(),
        aggregateId: 'test-3',
        aggregateType: 'TestAggregate',
        type: 'something_done',
        version: 1,
        data: { value: 'from-history' },
        metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 100 },
      },
      {
        id: randomUUID(),
        aggregateId: 'test-3',
        aggregateType: 'TestAggregate',
        type: 'something_done',
        version: 2,
        data: { value: 'again' },
        metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 200 },
      },
    ];
    agg.loadFromHistory(events);
    expect(agg.version).toBe(2);
    expect(agg.toState().value).toBe('again');
    expect(agg.toState().count).toBe(2);
    expect(agg.getPendingEvents()).toHaveLength(0);
  });

  it('should include metadata in events', () => {
    const agg = new TestAggregate('test-4');
    agg.doSomething('meta-test', 'agent-42');
    const events = agg.getPendingEvents();
    expect(events[0].metadata.agentId).toBe('agent-42');
    expect(events[0].metadata.correlationId).toBeDefined();
    expect(events[0].metadata.timestamp).toBeGreaterThan(0);
  });
});

describe('InMemoryEventStore', () => {
  it('should append and load events', async () => {
    const store = new InMemoryEventStore();
    const events: DomainEvent[] = [
      {
        id: randomUUID(), aggregateId: 'agg-1', aggregateType: 'Test',
        type: 'created', version: 1, data: {},
        metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 1 },
      },
    ];

    await store.appendEvents('Test', 'agg-1', events, 0);
    const loaded = await store.loadEvents('Test', 'agg-1');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].version).toBe(1);
  });

  it('should throw ConcurrencyError on version mismatch', async () => {
    const store = new InMemoryEventStore();
    const ev1: DomainEvent = {
      id: randomUUID(), aggregateId: 'agg-c', aggregateType: 'Test',
      type: 'v1', version: 1, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 1 },
    };
    await store.appendEvents('Test', 'agg-c', [ev1], 0);

    const ev2: DomainEvent = {
      id: randomUUID(), aggregateId: 'agg-c', aggregateType: 'Test',
      type: 'v2_wrong', version: 2, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 2 },
    };
    await expect(store.appendEvents('Test', 'agg-c', [ev2], 0)).rejects.toThrow(ConcurrencyError);
  });

  it('should handle idempotency (same version already persisted)', async () => {
    const store = new InMemoryEventStore();
    const ev1: DomainEvent = {
      id: randomUUID(), aggregateId: 'agg-idem', aggregateType: 'Test',
      type: 'created', version: 1, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 1 },
    };
    await store.appendEvents('Test', 'agg-idem', [ev1], 0);

    const ev1dup: DomainEvent = {
      id: randomUUID(), aggregateId: 'agg-idem', aggregateType: 'Test',
      type: 'created', version: 1, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 1 },
    };
    await store.appendEvents('Test', 'agg-idem', [ev1dup], 0);
    const loaded = await store.loadEvents('Test', 'agg-idem');
    expect(loaded).toHaveLength(1);
  });

  it('should return empty array for unknown aggregate', async () => {
    const store = new InMemoryEventStore();
    const loaded = await store.loadEvents('Unknown', 'nonexistent');
    expect(loaded).toEqual([]);
  });

  it('should load events since a version', async () => {
    const store = new InMemoryEventStore();
    for (let v = 1; v <= 3; v++) {
      const ev: DomainEvent = {
        id: randomUUID(), aggregateId: 'agg-since', aggregateType: 'Test',
        type: 'event', version: v, data: { v },
        metadata: { correlationId: 'c1', agentId: 'a1', timestamp: v },
      };
      await store.appendEvents('Test', 'agg-since', [ev], v - 1);
    }
    const since = await store.loadEventsSince('Test', 'agg-since', 1);
    expect(since).toHaveLength(2);
    expect(since[0].version).toBe(2);
    expect(since[1].version).toBe(3);
  });

  it('should load all events of a type using async generator', async () => {
    const store = new InMemoryEventStore();
    for (let i = 1; i <= 2; i++) {
      const ev: DomainEvent = {
        id: randomUUID(), aggregateId: `agg-${i}`, aggregateType: 'BulkTest',
        type: 'created', version: 1, data: {},
        metadata: { correlationId: 'c1', agentId: 'a1', timestamp: i },
      };
      await store.appendEvents('BulkTest', `agg-${i}`, [ev], 0);
    }
    const all: DomainEvent[] = [];
    for await (const event of store.loadAllEvents('BulkTest')) {
      all.push(event);
    }
    expect(all).toHaveLength(2);
  });

  it('should get aggregate version', async () => {
    const store = new InMemoryEventStore();
    expect(await store.getAggregateVersion('Test', 'agg-ver')).toBe(0);
    const ev: DomainEvent = {
      id: randomUUID(), aggregateId: 'agg-ver', aggregateType: 'Test',
      type: 'created', version: 5, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 1 },
    };
    await store.appendEvents('Test', 'agg-ver', [ev], 0);
    expect(await store.getAggregateVersion('Test', 'agg-ver')).toBe(5);
  });

  it('should handle empty events array', async () => {
    const store = new InMemoryEventStore();
    await store.appendEvents('Test', 'agg-empty', [], 0);
    const loaded = await store.loadEvents('Test', 'agg-empty');
    expect(loaded).toEqual([]);
  });
});

describe('InMemorySnapshotStore', () => {
  it('should save and load snapshots', () => {
    const store = new InMemorySnapshotStore();
    store.saveSnapshot('Test', 'agg-1', { data: 'value' }, 5);
    const loaded = store.loadSnapshot<{ data: string }>('Test', 'agg-1');
    expect(loaded).toBeDefined();
    expect(loaded!.state.data).toBe('value');
    expect(loaded!.version).toBe(5);
  });

  it('should return undefined for missing snapshot', () => {
    const store = new InMemorySnapshotStore();
    const loaded = store.loadSnapshot('Test', 'nonexistent');
    expect(loaded).toBeUndefined();
  });

  it('should list snapshots by aggregate type', () => {
    const store = new InMemorySnapshotStore();
    store.saveSnapshot('Test', 'a', { n: 1 }, 1);
    store.saveSnapshot('Test', 'b', { n: 2 }, 2);
    store.saveSnapshot('Other', 'c', { n: 3 }, 3);

    const testSnapshots = store.listSnapshots('Test');
    expect(testSnapshots).toHaveLength(2);
    const otherSnapshots = store.listSnapshots('Other');
    expect(otherSnapshots).toHaveLength(1);
  });

  it('should delete snapshots', () => {
    const store = new InMemorySnapshotStore();
    store.saveSnapshot('Test', 'del-me', { x: 1 }, 1);
    expect(store.loadSnapshot('Test', 'del-me')).toBeDefined();
    const deleted = store.deleteSnapshot('Test', 'del-me');
    expect(deleted).toBe(true);
    expect(store.loadSnapshot('Test', 'del-me')).toBeUndefined();
  });

  it('should return false when deleting non-existent snapshot', () => {
    const store = new InMemorySnapshotStore();
    const deleted = store.deleteSnapshot('Test', 'ghost');
    expect(deleted).toBe(false);
  });
});

describe('ProjectionEngine', () => {
  it('should register and process events through projections', () => {
    const engine = new ProjectionEngine();
    const projection = new AgentSessionProjection();
    engine.register(projection);

    const event: DomainEvent = {
      id: randomUUID(),
      aggregateId: 'agg-1',
      aggregateType: 'AgentDecision',
      type: 'decision_made',
      version: 1,
      data: { action: 'analyze' },
      metadata: { correlationId: 'c1', agentId: 'agent-1', timestamp: 100 },
    };

    engine.process([event]);
    const state = engine.getState<ReturnType<AgentSessionProjection['getState']>>('agent-sessions');
    expect(state).toBeDefined();
    expect(state!.sessionCount).toBe(1);
    expect(state!.activeSessions).toBe(1);
  });

  it('should reset projection state', () => {
    const engine = new ProjectionEngine();
    const projection = new AgentSessionProjection();
    engine.register(projection);

    const event: DomainEvent = {
      id: randomUUID(), aggregateId: 'agg-1', aggregateType: 'Test',
      type: 'decision_made', version: 1, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 1 },
    };
    engine.process([event]);
    expect(engine.getState('agent-sessions')).toBeDefined();

    engine.reset('agent-sessions');
    const state = engine.getState<ReturnType<AgentSessionProjection['getState']>>('agent-sessions');
    expect(state!.sessionCount).toBe(0);
  });

  it('should return undefined for unknown projection', () => {
    const engine = new ProjectionEngine();
    expect(engine.getState('unknown')).toBeUndefined();
  });
});

describe('AgentSessionProjection', () => {
  it('should track sessions from decision_made events', () => {
    const proj = new AgentSessionProjection();
    proj.project({
      id: randomUUID(), aggregateId: 'a1', aggregateType: 'Agent',
      type: 'decision_made', version: 1, data: { action: 'test' },
      metadata: { correlationId: 'c1', agentId: 'agent-1', timestamp: 100 },
    });
    const state = proj.getState();
    expect(state.sessionCount).toBe(1);
    expect(state.activeSessions).toBe(1);
    expect(state.agentSessions.get('agent-1')).toBeDefined();
    expect(state.agentSessions.get('agent-1')!.status).toBe('active');
  });

  it('should handle decision_completed events', () => {
    const proj = new AgentSessionProjection();
    proj.project({
      id: randomUUID(), aggregateId: 'a1', aggregateType: 'Agent',
      type: 'decision_made', version: 1, data: { action: 'start' },
      metadata: { correlationId: 'c1', agentId: 'agent-1', timestamp: 100 },
    });
    proj.project({
      id: randomUUID(), aggregateId: 'a1', aggregateType: 'Agent',
      type: 'decision_completed', version: 2, data: {},
      metadata: { correlationId: 'c1', agentId: 'agent-1', timestamp: 200 },
    });
    const state = proj.getState();
    expect(state.activeSessions).toBe(0);
    expect(state.completedSessions).toBe(1);
    expect(state.agentSessions.get('agent-1')!.status).toBe('completed');
  });

  it('should handle session_started and session_ended with failure', () => {
    const proj = new AgentSessionProjection();
    proj.project({
      id: randomUUID(), aggregateId: 'a1', aggregateType: 'Agent',
      type: 'session_started', version: 1, data: {},
      metadata: { correlationId: 'c1', agentId: 'agent-2', timestamp: 100 },
    });
    proj.project({
      id: randomUUID(), aggregateId: 'a1', aggregateType: 'Agent',
      type: 'session_ended', version: 2, data: { status: 'failed' },
      metadata: { correlationId: 'c1', agentId: 'agent-2', timestamp: 200 },
    });
    const state = proj.getState();
    expect(state.activeSessions).toBe(0);
    expect(state.failedSessions).toBe(1);
    expect(state.completedSessions).toBe(0);
  });

  it('should reset state', () => {
    const proj = new AgentSessionProjection();
    proj.project({
      id: randomUUID(), aggregateId: 'a1', aggregateType: 'Agent',
      type: 'session_started', version: 1, data: {},
      metadata: { correlationId: 'c1', agentId: 'a1', timestamp: 100 },
    });
    proj.reset();
    const state = proj.getState();
    expect(state.sessionCount).toBe(0);
    expect(state.activeSessions).toBe(0);
  });
});

describe('SagaCoordinator', () => {
  it('should begin a saga and return an instance', () => {
    const coordinator = new SagaCoordinator();
    const definition: SagaDefinition = {
      id: 'test-saga',
      name: 'Test Saga',
      steps: [],
      compensationStrategy: 'sequential',
      maxRetries: 0,
      timeout: 5000,
    };
    const instance = coordinator.begin(definition);
    expect(instance.id).toBeDefined();
    expect(instance.definitionId).toBe('test-saga');
    expect(instance.status).toBe('running');
    expect(instance.currentStep).toBe(0);
  });

  it('should execute steps and complete the saga', async () => {
    const coordinator = new SagaCoordinator();
    const stepResults: string[] = [];

    const definition: SagaDefinition = {
      id: 'exec-test',
      name: 'Execution Test',
      steps: [
        {
          id: 'step-1',
          name: 'Step One',
          type: 'action',
          handler: async () => {
            stepResults.push('step1');
            return { stepName: 'Step One', success: true, output: null, error: null, durationMs: 0 };
          },
        },
        {
          id: 'step-2',
          name: 'Step Two',
          type: 'action',
          handler: async () => {
            stepResults.push('step2');
            return { stepName: 'Step Two', success: true, output: null, error: null, durationMs: 0 };
          },
        },
      ],
      compensationStrategy: 'sequential',
      maxRetries: 0,
      timeout: 5000,
    };

    const instance = coordinator.begin(definition);
    await coordinator.executeStep(instance.id, definition);

    const status = coordinator.getStatus(instance.id)!;
    expect(status.status).toBe('completed');
    expect(status.completedSteps).toEqual(['Step One', 'Step Two']);
    expect(stepResults).toEqual(['step1', 'step2']);
  });

  it('should fail on step error and allow compensation', async () => {
    const coordinator = new SagaCoordinator();
    const compensated: string[] = [];

    const definition: SagaDefinition = {
      id: 'comp-test',
      name: 'Compensation Test',
      steps: [
        {
          id: 's1',
          name: 'Good Step',
          type: 'action',
          handler: async () => {
            return { stepName: 'Good Step', success: true, output: null, error: null, durationMs: 1 };
          },
        },
        {
          id: 's2',
          name: 'Bad Step',
          type: 'action',
          handler: async () => {
            return { stepName: 'Bad Step', success: false, output: null, error: 'something went wrong', durationMs: 1 };
          },
        },
        {
          id: 's1-comp',
          name: 'Good Step',
          type: 'compensation',
          handler: async () => {
            compensated.push('good compensated');
            return { stepName: 'Good Step', success: true, output: null, error: null, durationMs: 1 };
          },
        },
      ],
      compensationStrategy: 'sequential',
      maxRetries: 0,
      timeout: 5000,
    };

    const instance = coordinator.begin(definition);
    await coordinator.executeStep(instance.id, definition);

    const status = coordinator.getStatus(instance.id)!;
    expect(status.status).toBe('failed');
    expect(status.failedStep).toBe('Bad Step');
    expect(status.error).toBe('something went wrong');

    await coordinator.compensate(instance.id, definition);
    const compensatedStatus = coordinator.getStatus(instance.id)!;
    expect(compensatedStatus.status).toBe('compensated');
  });

  it('should return undefined for unknown instance', () => {
    const coordinator = new SagaCoordinator();
    const status = coordinator.getStatus('nonexistent');
    expect(status).toBeUndefined();
  });

  it('should list active sagas', () => {
    const coordinator = new SagaCoordinator();
    const def: SagaDefinition = {
      id: 'active-test', name: 'Active Test', steps: [],
      compensationStrategy: 'sequential', maxRetries: 0, timeout: 5000,
    };
    coordinator.begin(def);

    const active = coordinator.listActive();
    expect(active).toHaveLength(1);
    expect(active[0].status).toBe('running');
  });

  it('should throw when executing step on non-existent instance', async () => {
    const coordinator = new SagaCoordinator();
    const def: SagaDefinition = {
      id: 'err-test', name: 'Error Test', steps: [],
      compensationStrategy: 'sequential', maxRetries: 0, timeout: 5000,
    };
    await expect(coordinator.executeStep('ghost', def)).rejects.toThrow('not found');
  });

  it('should handle step timeout', async () => {
    const coordinator = new SagaCoordinator();
    const definition: SagaDefinition = {
      id: 'timeout-test',
      name: 'Timeout Test',
      steps: [
        {
          id: 'slow',
          name: 'Slow Step',
          type: 'action',
          handler: async () => {
            await new Promise((_resolve) => { throw new Error('simulated hang'); });
            return { stepName: 'Slow Step', success: true, output: null, error: null, durationMs: 0 };
          },
          timeout: 10,
        },
      ],
      compensationStrategy: 'sequential',
      maxRetries: 0,
      timeout: 5000,
    };

    const instance = coordinator.begin(definition);
    await coordinator.executeStep(instance.id, definition);
    const status = coordinator.getStatus(instance.id)!;
    expect(status.status).toBe('failed');
  });
});

describe('Full Flow: Aggregate → Store → Projection', () => {
  it('should persist aggregate events and reflect in projection', async () => {
    const store = new InMemoryEventStore();
    const engine = new ProjectionEngine();
    const projection = new AgentSessionProjection();
    engine.register(projection);

    const agg = new TestAggregate('flow-1');
    agg.doSomething('first action', 'agent-flow');
    agg.doSomething('second action', 'agent-flow');

    const pending = agg.getPendingEvents();
    await store.appendEvents('TestAggregate', agg.id, pending, 0);
    agg.clearPendingEvents();

    const loaded = await store.loadEvents('TestAggregate', 'flow-1');
    expect(loaded).toHaveLength(2);

    const decisionEvent: DomainEvent = {
      id: randomUUID(),
      aggregateId: 'flow-1',
      aggregateType: 'AgentDecision',
      type: 'decision_made',
      version: 1,
      data: { action: 'full-flow-test' },
      metadata: { correlationId: 'c-flow', agentId: 'agent-flow', timestamp: Date.now() },
    };

    await store.appendEvents('AgentDecision', 'flow-1', [decisionEvent], 0);
    engine.process([decisionEvent]);

    const state = engine.getState('agent-sessions') as ReturnType<AgentSessionProjection['getState']>;
    expect(state).toBeDefined();
    expect(state.sessionCount).toBe(1);

    const loadedDecision = await store.loadEvents('AgentDecision', 'flow-1');
    expect(loadedDecision).toHaveLength(1);
    expect(loadedDecision[0].type).toBe('decision_made');
  });
});

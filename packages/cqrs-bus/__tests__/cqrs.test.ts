import { CommandBus, Command, IKvStore, IMessageBus } from '../src/command-bus';
import { AntiCorruptionLayer, ExternalCommand } from '../src/anti-corruption-layer';
import { ConsistencyManager } from '../src/consistency-manager';
import { Aggregate } from '../src/event-sourced-repository';
import { SagaOrchestrator } from '../src/saga-orchestrator';

class MockKv implements IKvStore {
  private store = new Map<string, Uint8Array>();
  async get(k: string) { return this.store.get(k) ? { value: this.store.get(k)! } : null; }
  async put(k: string, v: Uint8Array, _opts?: { ttl?: number }) { this.store.set(k, v); }
}

class MockBus implements IMessageBus {
  async publish(_subj: string, _data: Uint8Array, _opts?: { headers?: Record<string, string> }) { return; }
  async request(_subj: string, _data: Uint8Array, _opts?: { timeout?: number }) {
    return { data: new TextEncoder().encode(JSON.stringify({ ok: true })) };
  }
}

describe('cqrs-bus', () => {
  describe('CommandBus', () => {
    it('should dispatch a command', async () => {
      const bus = new CommandBus(new MockBus());
      const cmd: Command = {
        id: 'test-1', type: 'create_project', aggregateId: 'proj-1',
        data: { name: 'test' },
        metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'corr-1' },
      };
      await expect(bus.dispatch(cmd)).resolves.not.toThrow();
    });

    it('should dispatch and wait for response', async () => {
      const bus = new CommandBus(new MockBus());
      const cmd: Command = {
        id: 'test-2', type: 'create_task', aggregateId: 'task-1',
        data: { title: 'test' },
        metadata: { agentId: 'agent-1', timestamp: Date.now(), correlationId: 'corr-2' },
      };
      const result = await bus.dispatchAndWait(cmd, 5000);
      expect(result).toEqual({ ok: true });
    });

    it('should deduplicate commands by correlationId', async () => {
      const kv = new MockKv();
      const bus = new CommandBus(new MockBus(), kv);
      let dispatchCount = 0;
      const origDispatch = bus.dispatch.bind(bus);
      bus.dispatch = ((cmd: Command) => { dispatchCount++; return origDispatch(cmd); }) as typeof bus.dispatch;

      const cmd: Command = {
        id: 'test-3', type: 'test', aggregateId: 'a-1',
        data: {},
        metadata: { agentId: 'a', timestamp: Date.now(), correlationId: 'dedup-test' },
      };
      await bus.dispatchWithDedup(cmd);
      await bus.dispatchWithDedup(cmd);
      expect(dispatchCount).toBe(1);
    });

    it('should reject command without type', () => {
      const bus = new CommandBus(new MockBus());
      const cmd = { id: 'test', type: '', aggregateId: 'a', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'c' } };
      expect(bus.dispatch(cmd as Command)).rejects.toThrow('Command type is required');
    });
  });

  describe('AntiCorruptionLayer', () => {
    it('should translate external commands', () => {
      const acl = new AntiCorruptionLayer();
      const ext: ExternalCommand = {
        source: 'github', action: 'push',
        payload: { id: 'repo-1', commits: ['abc'] },
        correlationId: 'corr-3',
      };
      const cmd = acl.translate(ext);
      expect(cmd.type).toBe('project.sync');
      expect(cmd.aggregateId).toContain('github:repo-1');
      expect(cmd.metadata.correlationId).toBe('corr-3');
    });

    it('should handle unknown sources', () => {
      const acl = new AntiCorruptionLayer();
      const ext: ExternalCommand = {
        source: 'unknown', action: 'custom_action',
        payload: { data: 'test' },
        correlationId: 'corr-4',
      };
      const cmd = acl.translate(ext);
      expect(cmd.type).toBe('external.custom_action');
    });
  });

  describe('ConsistencyManager', () => {
    it('should wait for consistency with timeout', async () => {
      const kv = new MockKv();
      const cm = new ConsistencyManager(kv);
      const result = await cm.waitForConsistency('test-proj', 100);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Aggregate', () => {
    it('should track and commit events', () => {
      const agg = new Aggregate('agg-1');
      agg.raiseEvent('Created', { name: 'test' });
      agg.raiseEvent('Updated', { name: 'test2' });
      expect(agg.getUncommittedEvents().length).toBe(2);
      agg.markEventsCommitted();
      expect(agg.getUncommittedEvents().length).toBe(0);
    });

    it('should track version', () => {
      const agg = new Aggregate('agg-2');
      expect(agg.version).toBe(0);
      agg.raiseEvent('Created', {});
      expect(agg.version).toBe(1);
    });
  });

  describe('SagaOrchestrator', () => {
    it('should handle saga execution', async () => {
      const bus = new CommandBus(new MockBus());
      const kv = new MockKv();
      const saga = new SagaOrchestrator(bus, kv);
      const steps = [
        { name: 'step1', command: { id: 's1', type: 'test', aggregateId: 'a', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'saga-1' } } },
        { name: 'step2', command: { id: 's2', type: 'test', aggregateId: 'a', data: {}, metadata: { agentId: 'a', timestamp: 0, correlationId: 'saga-1' } }, async: true },
      ];
      await expect(saga.execute(steps, { id: 'saga-1' })).resolves.not.toThrow();
    });
  });
});

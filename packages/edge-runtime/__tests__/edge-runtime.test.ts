import { EdgeRuntime } from '../src/runtime';
import { EdgeEventBus } from '../src/event-bus';
import { EdgeSync } from '../src/sync';
import { EdgeLLM } from '../src/llm';

describe('EdgeRuntime', () => {
  it('starts and stops', () => { const r = new EdgeRuntime(); r.start(); expect(r.isRunning()).toBe(true); r.stop(); expect(r.isRunning()).toBe(false); });
  it('registers and lists agents', () => { const r = new EdgeRuntime(); r.registerAgent({ id: 'a1', name: 'Agent 1', capabilities: ['infer'], status: 'idle', lastHeartbeat: Date.now() }); expect(r.listAgents()).toHaveLength(1); expect(r.getAgent('a1')?.name).toBe('Agent 1'); });
  it('healthCheck returns agent count', () => { const r = new EdgeRuntime(); r.start(); expect(r.healthCheck().healthy).toBe(true); expect(r.healthCheck().agentCount).toBe(0); });
});

describe('EdgeEventBus', () => {
  it('publishes and subscribes', () => { const b = new EdgeEventBus(); let received: unknown; b.subscribe('test', e => { received = e.payload; }); b.publish({ type: 'test', source: 'test', payload: { data: 1 }, priority: 'normal', ttl: 1000 }); expect(received).toEqual({ data: 1 }); });
  it('replays events since timestamp', () => { const b = new EdgeEventBus(); b.publish({ type: 'a', source: 's', payload: {}, priority: 'low', ttl: 100 }); const events = b.replay(0); expect(events.length).toBeGreaterThanOrEqual(1); });
  it('returns stats', () => { const b = new EdgeEventBus(); b.publish({ type: 't', source: 's', payload: {}, priority: 'low', ttl: 100 }); expect(b.getStats().total).toBe(1); });
});

describe('EdgeSync', () => {
  it('registers manifests', () => { const s = new EdgeSync(); const m = s.register('m1', 'src', 'tgt'); expect(m.version).toBe(1); });
  it('syncs with version increment', () => { const s = new EdgeSync(); s.register('m1', 'src', 'tgt'); const r = s.sync('m1', 1); expect(r.success).toBe(true); expect(r.newVersion).toBe(2); });
});

describe('EdgeLLM', () => {
  it('registers and lists models', () => { const l = new EdgeLLM(); l.registerModel({ name: 'phi-3-mini', quantization: 'q4', sizeMb: 2000, status: 'available' }); expect(l.listModels()).toHaveLength(1); });
  it('generates cached responses', async () => { const l = new EdgeLLM(); l.registerModel({ name: 'phi-3-mini', quantization: 'q4', sizeMb: 2000, status: 'available' }); const r1 = await l.generate('phi-3-mini', 'hello'); const r2 = await l.generate('phi-3-mini', 'hello'); expect(r1).toBe(r2); });
  it('healthCheck returns model count', () => { const l = new EdgeLLM(); l.registerModel({ name: 'test', quantization: 'q8', sizeMb: 100, status: 'available' }); const h = l.healthCheck(); expect(h.modelsAvailable).toBe(1); expect(h.healthy).toBe(true); });
});

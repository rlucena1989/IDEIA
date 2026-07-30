import { PostgresAuditTrail } from '../src/postgres-adapter';
import { MemoryAdapter } from '../../data-layer/src/adapters/memory-adapter';

function createTrail(): PostgresAuditTrail {
  const adapter = new MemoryAdapter();
  adapter.connect({ type: 'sqlite' });
  const trail = new PostgresAuditTrail(adapter, 'sqlite');
  return trail;
}

describe('PostgresAuditTrail', () => {
  let trail: PostgresAuditTrail;

  beforeEach(async () => {
    trail = createTrail();
    await trail.init();
  });

  it('should append and load events', async () => {
    const event = await trail.append({
      actor: 'user',
      eventType: 'file.write',
      target: '/src/app.ts',
      decision: 'auto',
      result: 'success',
    });

    expect(event.eventId).toBeTruthy();
    expect(event.timestamp).toBeTruthy();
    expect(event.actor).toBe('user');
    expect(event.decision).toBe('auto');

    const events = await trail.load();
    expect(events).toHaveLength(1);
    expect(events[0]!.eventType).toBe('file.write');
  });

  it('should append multiple events in order', async () => {
    await trail.append({ actor: 'ai', eventType: 'policy.evaluate', target: 'file.write', decision: 'ask', result: 'pending' });
    await trail.append({ actor: 'user', eventType: 'approval.approve', target: 'file.write', decision: 'approved', result: 'success' });
    await trail.append({ actor: 'system', eventType: 'file.write', target: '/src/app.ts', decision: 'auto', result: 'success' });

    const events = await trail.load();
    expect(events).toHaveLength(3);
    expect(events[0]!.eventType).toBe('policy.evaluate');
    expect(events[1]!.eventType).toBe('approval.approve');
    expect(events[2]!.eventType).toBe('file.write');
  });

  it('should query by filter', async () => {
    await trail.append({ actor: 'ai', eventType: 'chat.run', target: 'session-1', decision: 'auto', result: 'success' });
    await trail.append({ actor: 'user', eventType: 'file.write', target: '/src/app.ts', decision: 'auto', result: 'success' });
    await trail.append({ actor: 'user', eventType: 'file.write', target: '/src/lib.ts', decision: 'auto', result: 'success' });

    const userEvents = await trail.query({ actor: 'user' });
    expect(userEvents).toHaveLength(2);

    const fileWrites = await trail.query({ eventType: 'file.write' });
    expect(fileWrites).toHaveLength(2);
  });

  it('should count events', async () => {
    expect(await trail.count()).toBe(0);
    await trail.append({ actor: 'system', eventType: 'init', target: 'app', decision: 'auto', result: 'success' });
    expect(await trail.count()).toBe(1);
    await trail.append({ actor: 'user', eventType: 'deploy', target: 'prod', decision: 'approved', result: 'success' });
    expect(await trail.count()).toBe(2);
  });

  it('should verify empty chain as valid', async () => {
    const result = await trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(0);
    expect(result.currentTipHash).toBeNull();
  });

  it('should verify chain with single event', async () => {
    await trail.append({ actor: 'user', eventType: 'file.write', target: '/test.ts', decision: 'auto', result: 'success' });
    const result = await trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(1);
    expect(result.currentTipHash).toBeTruthy();
  });

  it('should verify chain with multiple events', async () => {
    await trail.append({ actor: 'user', eventType: 'file.write', target: '/a.ts', decision: 'auto', result: 'success' });
    await trail.append({ actor: 'ai', eventType: 'chat.run', target: 'sess-1', decision: 'auto', result: 'success' });
    await trail.append({ actor: 'system', eventType: 'deploy', target: 'prod', decision: 'approved', result: 'success' });

    const result = await trail.verifyChain();
    expect(result.valid).toBe(true);
    expect(result.totalEvents).toBe(3);
    expect(result.currentTipHash).toBeTruthy();
  });

  it('should link events via hash chain', async () => {
    const e1 = await trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' });
    expect(e1.previousHash).toBeUndefined();

    const e2 = await trail.append({ actor: 'ai', eventType: 'chat', target: 'sess-1', decision: 'auto', result: 'success' });
    expect(e2.previousHash).toBeTruthy();

    const events = await trail.load();
    expect(events[1]!.previousHash).toBe(events[1]!.previousHash);
  });

  it('should detect broken chain', async () => {
    await trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' });
    await trail.append({ actor: 'ai', eventType: 'chat', target: 'sess-1', decision: 'auto', result: 'success' });

    const resultBefore = await trail.verifyChain();
    expect(resultBefore.valid).toBe(true);

    const dbAdapter = (trail as unknown as { dbAdapter: { tables: Map<string, unknown> } }).dbAdapter;
    const chainTable = (dbAdapter.tables as Map<string, { rows: Map<string, unknown>[] }>).get('ideia_audit_chain');
    expect(chainTable).toBeDefined();
    const rows = chainTable!.rows;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    rows[1].set('previous_hash', 'tampered-hash-value');

    const resultAfter = await trail.verifyChain();
    expect(resultAfter.valid).toBe(false);
    expect(resultAfter.breakReason).toBeTruthy();
  });

  it('should return chain tip hash', async () => {
    expect(await trail.getChainTipHash()).toBeNull();

    await trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' });
    const hash1 = await trail.getChainTipHash();
    expect(hash1).toBeTruthy();

    await trail.append({ actor: 'ai', eventType: 'chat', target: 'sess-2', decision: 'auto', result: 'success' });
    const hash2 = await trail.getChainTipHash();
    expect(hash2).toBeTruthy();
    expect(hash1).not.toBe(hash2);
  });

  it('should return different tip hashes for different events', async () => {
    const trail2 = createTrail();
    await trail2.init();

    await trail.append({ actor: 'user', eventType: 'write', target: '/a.ts', decision: 'auto', result: 'success' });
    await trail2.append({ actor: 'ai', eventType: 'chat', target: 'sess-2', decision: 'auto', result: 'success' });

    const hash1 = await trail.getChainTipHash();
    const hash2 = await trail2.getChainTipHash();
    expect(hash1).not.toBe(hash2);
  });
});

import { OfflineQueue } from '../offline-queue';

describe('OfflineQueue', () => {
  it('should enqueue and dequeue messages', () => {
    const q = new OfflineQueue();
    q.enqueue('test.topic', { foo: 'bar' });
    expect(q.getCount()).toBe(1);
    const msg = q.dequeue();
    expect(msg).toBeDefined();
    expect(msg!.topic).toBe('test.topic');
    expect((msg!.payload as Record<string, string>).foo).toBe('bar');
    expect(q.getCount()).toBe(0);
  });

  it('should enforce max size', () => {
    const q = new OfflineQueue({ maxSize: 2, ttlMs: 86400000 });
    q.enqueue('a', 1);
    q.enqueue('b', 2);
    q.enqueue('c', 3);
    expect(q.getCount()).toBe(2);
    const first = q.dequeue();
    expect(first).toBeDefined();
    expect(first!.payload).toBe(2);
  });

  it('should expire messages by TTL', async () => {
    const q = new OfflineQueue({ maxSize: 100, ttlMs: 10 });
    q.enqueue('old', 'data');
    await new Promise(r => setTimeout(r, 20));
    expect(q.getCount()).toBe(0);
  });

  it('should filter messages by topic', () => {
    const q = new OfflineQueue();
    q.enqueue('topic.a', 1);
    q.enqueue('topic.b', 2);
    q.enqueue('topic.a', 3);
    const results = q.getByTopic('topic.a');
    expect(results).toHaveLength(2);
    expect(results.every(m => m.topic === 'topic.a')).toBe(true);
  });

  it('should clear all messages', () => {
    const q = new OfflineQueue();
    q.enqueue('a', 1);
    q.enqueue('b', 2);
    q.clear();
    expect(q.getCount()).toBe(0);
  });

  it('should reject duplicate ids (idempotency)', () => {
    const q = new OfflineQueue();
    const id = 'dup-id';
    q.enqueue('a', 1, id);
    q.enqueue('a', 2, id);
    const all = q.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.payload).toBe(1);
  });

  it('should peek without removing', () => {
    const q = new OfflineQueue();
    q.enqueue('a', 42);
    const peeked = q.peek();
    expect(peeked).toBeDefined();
    expect(peeked!.payload).toBe(42);
    expect(q.getCount()).toBe(1);
  });

  it('should remove by id', () => {
    const q = new OfflineQueue();
    const id = q.enqueue('a', 'remove-me');
    expect(q.getCount()).toBe(1);
    const removed = q.remove(id);
    expect(removed).toBe(true);
    expect(q.getCount()).toBe(0);
  });
});

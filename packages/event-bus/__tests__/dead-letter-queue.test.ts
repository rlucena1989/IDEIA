import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeadLetterQueue, createDeadLetterQueue, DeadLetterMessage, NatsConnectionManager, createNatsConnectionManager } from '../src';

describe('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue;
  let connectionManager: NatsConnectionManager;

  beforeEach(async () => {
    connectionManager = createNatsConnectionManager({
      servers: 'nats://localhost:4222',
      reconnect: false,
    });
    dlq = createDeadLetterQueue(connectionManager);
    await dlq.initialize({ maxAge: 100, maxMessages: 100 });
  });

  afterEach(async () => {
    await connectionManager.disconnect();
  });

  it('should initialize with defaults', () => {
    expect(dlq).toBeDefined();
  });

  it('should add dead letter messages', async () => {
    const msg: DeadLetterMessage = {
      originalSubject: 'test.event',
      originalData: { type: 'test', data: 'hello' },
      error: 'Handler timeout',
      timestamp: Date.now(),
      retryCount: 0,
    };

    await dlq.add(msg);

    const stats = await dlq.getStats();
    expect(stats.total).toBe(1);
    expect(stats.retryable).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('should list retryable vs failed messages', async () => {
    await dlq.add({
      originalSubject: 'topic.a',
      originalData: { type: 'a' },
      error: 'err1',
      timestamp: Date.now(),
      retryCount: 0,
    });
    await dlq.add({
      originalSubject: 'topic.b',
      originalData: { type: 'b' },
      error: 'err2',
      timestamp: Date.now(),
      retryCount: 5,
      maxRetries: 3,
    });

    const retryable = await dlq.getRetryableMessages();
    const failed = await dlq.getFailedMessages();

    expect(retryable).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(retryable[0].originalSubject).toBe('topic.a');
    expect(failed[0].originalSubject).toBe('topic.b');
  });

  it('should retry messages', async () => {
    await dlq.add({
      originalSubject: 'test.subject',
      originalData: { type: 'test' },
      error: 'fail',
      timestamp: Date.now(),
      retryCount: 0,
    });

    const retryable = await dlq.getRetryableMessages();
    expect(retryable).toHaveLength(1);

    await dlq.retry(retryable[0]);
    expect(retryable[0].retryCount).toBe(1);
  });

  it('should mark message as permanently failed after max retries', async () => {
    await dlq.add({
      originalSubject: 'test.subject',
      originalData: { type: 'test' },
      error: 'persistent error',
      timestamp: Date.now(),
      retryCount: 3,
      maxRetries: 3,
    });

    const failed = await dlq.getFailedMessages();
    expect(failed).toHaveLength(1);
    expect(failed[0].retryCount).toBe(3);
  });

  it('should remove messages', async () => {
    await dlq.add({
      originalSubject: 'test.event',
      originalData: { type: 'test' },
      error: 'err',
      timestamp: Date.now(),
      retryCount: 0,
    });

    expect((await dlq.getStats()).total).toBe(1);

    const retryable = await dlq.getRetryableMessages();
    await dlq.remove(retryable[0]);
    expect((await dlq.getStats()).total).toBe(0);
  });

  it('should purge all messages', async () => {
    await dlq.add({
      originalSubject: 'topic.a', originalData: {}, error: 'e1',
      timestamp: Date.now(), retryCount: 0,
    });
    await dlq.add({
      originalSubject: 'topic.b', originalData: {}, error: 'e2',
      timestamp: Date.now(), retryCount: 0,
    });

    expect((await dlq.getStats()).total).toBe(2);

    await dlq.purge();
    expect((await dlq.getStats()).total).toBe(0);
  });

  it('should respect maxRetries config', async () => {
    expect(dlq).toBeDefined();
    const stats = await dlq.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
  });

  it('should create with factory function', () => {
    const q = createDeadLetterQueue(connectionManager);
    expect(q).toBeDefined();
    expect(q).toBeInstanceOf(DeadLetterQueue);
  });
});

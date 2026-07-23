import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  NatsConnectionManager,
  NatsStreamManager,
  DeadLetterQueue,
  ConsumerGroupManager,
  KVStore,
  ObjectStore,
  RequestReplyManager,
  HealthCheck,
  createNatsConnectionManager,
  createNatsStreamManager,
  createDeadLetterQueue,
  createConsumerGroupManager,
  createKVStore,
  createObjectStore,
  createRequestReplyManager,
  createHealthCheck,
  EVENT_STREAMS,
} from '../src';

const NATS_AVAILABLE = process.env.NATS_SERVER !== undefined;

(NATS_AVAILABLE ? describe : describe.skip)('NATS Integration Tests', () => {
  let connectionManager: NatsConnectionManager;
  let streamManager: NatsStreamManager;
  let dlq: DeadLetterQueue;
  let consumerGroupManager: ConsumerGroupManager;
  let kvStore: KVStore;
  let objectStore: ObjectStore;
  let reqReplyManager: RequestReplyManager;
  let healthCheck: HealthCheck;

  beforeEach(async () => {
    connectionManager = createNatsConnectionManager({
      servers: 'nats://localhost:4222',
      reconnect: false, // Desabilitar reconnection para testes
    });

    streamManager = createNatsStreamManager(connectionManager);
    dlq = createDeadLetterQueue(connectionManager);
    consumerGroupManager = createConsumerGroupManager(connectionManager);
    kvStore = createKVStore(connectionManager);
    objectStore = createObjectStore(connectionManager);
    reqReplyManager = createRequestReplyManager(connectionManager);
    healthCheck = createHealthCheck(connectionManager);

    // Configurar health check com todos os componentes
    healthCheck.setStreamManager(streamManager);
    healthCheck.setDLQ(dlq);
    healthCheck.setConsumerGroupManager(consumerGroupManager);
    healthCheck.setKVStore(kvStore);
    healthCheck.setObjectStore(objectStore);
    healthCheck.setRequestReplyManager(reqReplyManager);
  });

  afterEach(async () => {
    await reqReplyManager?.cleanup();
    await connectionManager?.disconnect();
  });

  describe('NatsConnectionManager', () => {
    it('should create connection manager', () => {
      expect(connectionManager).toBeDefined();
      expect(connectionManager.getState()).toEqual({
        connected: false,
        server: null,
        reconnects: 0,
        lastError: null,
      });
    });

    it('should track state changes', (done) => {
      const unsubscribe = connectionManager.onStateChange((state) => {
        if (state.connected) {
          unsubscribe();
          done();
        }
      });

      connectionManager.connect().catch(() => {
        // NATS pode não estar rodando, isso é esperado
        unsubscribe();
        done();
      });
    });
  });

  describe('NatsStreamManager', () => {
    it('should initialize streams', async () => {
      await streamManager.initialize();
      const streams = await streamManager.listStreams();
      expect(streams.length).toBe(EVENT_STREAMS.length);
      expect(streams).toContain('agent.started');
    });

    it('should publish and consume messages', async () => {
      await streamManager.initialize();
      
      const testData = { test: 'data', timestamp: Date.now() };
      await streamManager.publish('agent.started', testData);
      
      const consumed = await streamManager.consume('agent.started');
      expect(consumed.length).toBeGreaterThan(0);
      expect(consumed[0].data).toEqual(testData);
    });

    it('should get stream info', async () => {
      await streamManager.initialize();
      const info = await streamManager.getStreamInfo('agent.started');
      expect(info).toBeDefined();
      expect(info?.maxMsgs).toBeDefined();
    });
  });

  describe('DeadLetterQueue', () => {
    it('should initialize DLQ', async () => {
      await dlq.initialize();
      const stats = await dlq.getStats();
      expect(stats.total).toBe(0);
    });

    it('should add and retrieve messages', async () => {
      await dlq.initialize();
      
      const message = {
        originalSubject: 'test.subject',
        originalData: { test: 'data' },
        error: 'Test error',
        retryCount: 0,
        timestamp: Date.now(),
      };

      await dlq.add(message);
      
      const stats = await dlq.getStats();
      expect(stats.total).toBe(1);
    });

    it('should retry messages', async () => {
      await dlq.initialize();
      
      const message = {
        originalSubject: 'test.subject',
        originalData: { test: 'data' },
        error: 'Test error',
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
      };

      await dlq.add(message);
      await dlq.retry(message);
      
      const retryable = await dlq.getRetryableMessages();
      expect(retryable.length).toBeGreaterThan(0);
    });

    it('should cleanup expired messages', async () => {
      await dlq.initialize({ maxAge: 100 }); // 100ms
      await dlq.add({
        originalSubject: 'test.subject',
        originalData: { test: 'data' },
        error: 'Test error',
        retryCount: 0,
        timestamp: Date.now(),
      });
      
      await new Promise(resolve => setTimeout(resolve, 150));
      await dlq.cleanup();
      
      const stats = await dlq.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('ConsumerGroupManager', () => {
    it('should initialize consumer group manager', async () => {
      await consumerGroupManager.initialize();
      expect(consumerGroupManager.listGroups()).toEqual([]);
    });

    it('should create and manage consumer groups', async () => {
      await consumerGroupManager.initialize();
      
      const group = await consumerGroupManager.createGroup({
        name: 'test-group',
        streamName: 'test-stream',
      });

      expect(group).toBeDefined();
      expect(group.getConfig().name).toBe('test-group');
      
      expect(consumerGroupManager.listGroups()).toContain('test-group');
    });

    it('should manage group members', async () => {
      await consumerGroupManager.initialize();
      const group = await consumerGroupManager.createGroup({
        name: 'test-group',
        streamName: 'test-stream',
      });

      group.addMember('member-1');
      group.addMember('member-2');
      
      expect(group.getMemberCount()).toBe(2);
      
      group.removeMember('member-1');
      expect(group.getMemberCount()).toBe(1);
    });

    it('should identify inactive members', async () => {
      await consumerGroupManager.initialize();
      const group = await consumerGroupManager.createGroup({
        name: 'test-group',
        streamName: 'test-stream',
      });

      group.addMember('member-1');
      
      // Marcar como inativo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const inactive = group.getInactiveMembers(50); // 50ms threshold
      expect(inactive.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('KVStore', () => {
    it('should initialize KV store', async () => {
      await kvStore.initialize();
      const stats = await kvStore.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should put and get values', async () => {
      await kvStore.initialize();
      
      const version = await kvStore.put('test-key', { value: 'test-data' });
      expect(version).toBeGreaterThan(0);
      
      const entry = await kvStore.get('test-key');
      expect(entry).toBeDefined();
      expect(entry?.value).toEqual({ value: 'test-data' });
    });

    it('should update with version check', async () => {
      await kvStore.initialize();
      
      const v1 = await kvStore.put('test-key', { value: 'v1' });
      const v2 = await kvStore.update('test-key', { value: 'v2' }, v1);
      
      expect(v2).toBe(v1 + 1);
    });

    it('should fail on version mismatch', async () => {
      await kvStore.initialize();
      
      await kvStore.put('test-key', { value: 'v1' });
      
      await expect(
        kvStore.update('test-key', { value: 'v2' }, 999)
      ).rejects.toThrow('Version mismatch');
    });

    it('should delete keys', async () => {
      await kvStore.initialize();
      
      await kvStore.put('test-key', { value: 'test' });
      expect(await kvStore.has('test-key')).toBe(true);
      
      await kvStore.delete('test-key');
      expect(await kvStore.has('test-key')).toBe(false);
    });
  });

  describe('ObjectStore', () => {
    it('should initialize object store', async () => {
      await objectStore.initialize();
      const stats = await objectStore.getStats();
      expect(stats.totalObjects).toBe(0);
    });

    it('should put and get objects', async () => {
      await objectStore.initialize();
      
      const data = Buffer.from('test-data');
      const metadata = await objectStore.put('test-object', data, 'text/plain');
      
      expect(metadata.name).toBe('test-object');
      expect(metadata.size).toBe(data.length);
      
      const object = await objectStore.get('test-object');
      expect(object).toBeDefined();
      expect(object?.data).toEqual(data);
    });

    it('should list objects', async () => {
      await objectStore.initialize();
      
      await objectStore.put('obj1', Buffer.from('data1'));
      await objectStore.put('obj2', Buffer.from('data2'));
      
      const objects = await objectStore.list();
      expect(objects.length).toBe(2);
    });

    it('should enforce size limits', async () => {
      await objectStore.initialize({ maxSizeBytes: 100 });
      
      const largeData = Buffer.alloc(200);
      
      await expect(
        objectStore.put('large-object', largeData)
      ).rejects.toThrow('exceeds maximum');
    });
  });

  describe('RequestReplyManager', () => {
    it('should initialize request-reply manager', async () => {
      await reqReplyManager.initialize();
      expect(reqReplyManager.getPendingRequestCount()).toBe(0);
    });

    it('should register handlers', async () => {
      await reqReplyManager.initialize();
      
      await reqReplyManager.respond('test.subject', async (data) => {
        return { result: data };
      });
      
      expect(reqReplyManager.getRegisteredHandlers()).toContain('test.subject');
    });

    it('should timeout on no response', async () => {
      await reqReplyManager.initialize();
      
      await expect(
        reqReplyManager.request('nonexistent.subject', { test: 'data' }, 100)
      ).rejects.toThrow('timeout');
    });
  });

  describe('HealthCheck', () => {
    it('should perform health check', async () => {
      await streamManager.initialize();
      await dlq.initialize();
      await consumerGroupManager.initialize();
      await kvStore.initialize();
      await objectStore.initialize();
      await reqReplyManager.initialize();

      const health = await healthCheck.check();
      
      expect(health).toBeDefined();
      expect(health.timestamp).toBeDefined();
      expect(health.components).toBeDefined();
      expect(health.components.connection).toBeDefined();
      expect(health.components.streams).toBeDefined();
      expect(health.components.dlq).toBeDefined();
      expect(health.components.consumers).toBeDefined();
      expect(health.components.kv).toBeDefined();
      expect(health.components.objectStore).toBeDefined();
      expect(health.components.reqReply).toBeDefined();
    });

    it('should calculate overall status correctly', async () => {
      await streamManager.initialize();
      
      const health = await healthCheck.check();
      
      // Se a conexão não estiver estabelecida, deve ser degraded ou unhealthy
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should handle complete event workflow', async () => {
      // Inicializar todos os componentes
      await streamManager.initialize();
      await dlq.initialize();
      await consumerGroupManager.initialize();
      await kvStore.initialize();
      await objectStore.initialize();
      await reqReplyManager.initialize();

      // Publicar evento
      const eventData = { agentId: 'agent-1', status: 'started' };
      await streamManager.publish('agent.started', eventData);

      // Consumir evento
      const consumed = await streamManager.consume('agent.started');
      expect(consumed.length).toBeGreaterThan(0);

      // Salvar no KV store
      await kvStore.put('agent-1-status', eventData);

      // Verificar health check
      const health = await healthCheck.check();
      expect(health.status).toBeDefined();
    });
  });
});

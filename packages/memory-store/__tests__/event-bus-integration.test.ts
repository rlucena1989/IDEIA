import { MemoryStore, createMemoryRecord } from '../src/memory-store';
import { EventBus } from '@ideia/event-bus';

interface EmittedEvent {
  type: string;
  event: {
    payload: Record<string, unknown>;
    source?: string;
  };
}

describe('MemoryStore EventBus Integration', () => {
  let memoryStore: MemoryStore;
  let eventBus: EventBus;
  let emittedEvents: EmittedEvent[] = [];

  beforeEach(async () => {
    eventBus = new EventBus();
    memoryStore = new MemoryStore();
    emittedEvents = [];

    // Subscribe to all memory events
    await eventBus.subscribe('memory:record_added', (event) => {
      emittedEvents.push({ type: 'record_added', event: event as unknown as EmittedEvent['event'] });
    });
    await eventBus.subscribe('memory:record_removed', (event) => {
      emittedEvents.push({ type: 'record_removed', event: event as unknown as EmittedEvent['event'] });
    });
    await eventBus.subscribe('memory:search_performed', (event) => {
      emittedEvents.push({ type: 'search_performed', event: event as unknown as EmittedEvent['event'] });
    });

    await memoryStore.integrateWithEventBus(eventBus);
  });

  afterEach(() => {
    memoryStore.destroy();
  });

  describe('memory:record_added event', () => {
    it('should emit event when record is added', () => {
      const record = createMemoryRecord({
        category: 'change',
        source: 'test',
        summary: 'Test summary',
      });

      memoryStore.append(record);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].type).toBe('record_added');
      expect(emittedEvents[0].event.payload.memoryId).toBe(record.memoryId);
    });

    it('should emit event with correct payload', () => {
      const record = createMemoryRecord({
        category: 'decision',
        source: 'agent',
        summary: 'Decision made',
        tags: ['decision', 'agent'],
      });

      memoryStore.append(record);

      const event = emittedEvents[0].event;
      expect(event.payload.category).toBe('decision');
      expect(event.payload.summary).toBe('Decision made');
      expect(event.source).toBe('memory-store');
    });
  });

  describe('memory:record_removed event', () => {
    it('should emit event when record is removed', () => {
      const record = createMemoryRecord({
        category: 'change',
        source: 'test',
        summary: 'Test summary',
      });

      memoryStore.append(record);
      emittedEvents = []; // Clear previous events

      memoryStore.remove(record.memoryId);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].type).toBe('record_removed');
      expect(emittedEvents[0].event.payload.memoryId).toBe(record.memoryId);
    });

    it('should not emit event when removing non-existent record', () => {
      memoryStore.remove('non-existent-id');

      expect(emittedEvents).toHaveLength(0);
    });
  });

  describe('memory:search_performed event', () => {
    it('should emit event when search is performed', () => {
      const record = createMemoryRecord({
        category: 'change',
        source: 'test',
        summary: 'Test summary about search',
      });

      memoryStore.append(record);
      emittedEvents = []; // Clear previous events

      memoryStore.search('search');

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].type).toBe('search_performed');
      expect(emittedEvents[0].event.payload.query).toBe('search');
      expect(emittedEvents[0].event.payload.resultCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('event subscription', () => {
    it('should receive events from EventBus subscription', async () => {
      await eventBus.emit({
        type: 'agent.action',
        source: 'agent-runtime',
        payload: { action: 'test' },
      });

      // Give time for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const records = memoryStore.list();
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].category).toBe('agent');
    });
  });
});

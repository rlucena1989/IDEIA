import fs from 'fs';
import path from 'path';
import os from 'os';
import { MemoryStore, createMemoryRecord } from '../src/memory-store';

describe('MemoryStore', () => {
  let tmpDir: string;
  let store: MemoryStore;

  beforeEach(() => {
    jest.useFakeTimers();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
    store = new MemoryStore(path.join(tmpDir, 'memory.json'));
  });

  afterEach(() => {
    store.destroy();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.useRealTimers();
  });

  // ── Testes existentes ──

  it('should create default state when file does not exist', () => {
    const state = store.load();
    expect(state.sessionId).toBeTruthy();
    expect(state.workspaceRoot).toBe('');
    expect(state.activeTask).toBeNull();
    expect(state.lastDecisions).toEqual([]);
    expect(state.context).toEqual({});
  });

  it('should save and load state', () => {
    const state = store.load();
    state.workspaceRoot = '/test/project';
    state.activeTask = 'TASK-001';
    state.context = { language: 'typescript' };
    store.save(state);

    const loaded = store.load();
    expect(loaded.workspaceRoot).toBe('/test/project');
    expect(loaded.activeTask).toBe('TASK-001');
    expect(loaded.context).toEqual({ language: 'typescript' });
  });

  it('should push decisions with rotation', () => {
    const state = store.load();
    for (let i = 0; i < 105; i++) {
      store.pushDecision(state, { id: `dec-${i}`, action: `action-${i}` });
    }
    // pushDecision mutates state in-place + debounced save
    expect(state.lastDecisions.length).toBe(100);
    expect(state.lastDecisions[0]!.id).toBe('dec-5');
    // Advance timers so debounced save fires
    jest.advanceTimersByTime(10);
    const loaded = store.load();
    expect(loaded.lastDecisions.length).toBe(100);
  });

  it('should update context incrementally', () => {
    const state = store.load();
    store.updateContext(state, { step: 1 });
    store.updateContext(state, { step: 2 });
    // updateContext mutates state context in-place
    expect(state.context).toEqual({ step: 2 });
    // Advance timers so debounced save fires
    jest.advanceTimersByTime(10);
    const loaded = store.load();
    expect(loaded.context).toEqual({ step: 2 });
  });

  // ── Novos testes ──

  describe('createMemoryRecord', () => {
    it('should create a record with all fields', () => {
      const record = createMemoryRecord({
        category: 'decision',
        source: 'policy-engine',
        summary: 'Test decision record',
        tags: ['test', 'policy'],
        severity: 'high',
      });
      expect(record.memoryId).toBeTruthy();
      expect(record.category).toBe('decision');
      expect(record.source).toBe('policy-engine');
      expect(record.summary).toBe('Test decision record');
      expect(record.tags).toEqual(['test', 'policy']);
      expect(record.createdAt).toBeTruthy();
      expect(record.severity).toBe('high');
    });

    it('should default tags to empty array', () => {
      const record = createMemoryRecord({
        category: 'cycle',
        source: 'test',
        summary: 'No tags',
      });
      expect(record.tags).toEqual([]);
    });
  });

  describe('append and list', () => {
    it('should append records and list them', () => {
      const record = createMemoryRecord({
        category: 'decision', source: 'test', summary: 'test',
      });
      store.append(record);
      expect(store.list()).toHaveLength(1);
      expect(store.count()).toBe(1);
    });

    it('should clear all records', () => {
      store.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'a' }));
      store.append(createMemoryRecord({ category: 'cycle', source: 'test', summary: 'b' }));
      expect(store.count()).toBe(2);
      store.clear();
      expect(store.count()).toBe(0);
    });
  });

  describe('findByCategory', () => {
    it('should filter records by category', () => {
      store.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'dec' }));
      store.append(createMemoryRecord({ category: 'failure', source: 'test', summary: 'fail' }));
      store.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'dec2' }));

      const decisions = store.findByCategory('decision');
      expect(decisions).toHaveLength(2);

      const failures = store.findByCategory('failure');
      expect(failures).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const results = store.findByCategory('approval');
      expect(results).toHaveLength(0);
    });
  });

  describe('findBySeverity', () => {
    it('should filter records by severity', () => {
      store.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'a', severity: 'high' }));
      store.append(createMemoryRecord({ category: 'failure', source: 'test', summary: 'b', severity: 'low' }));
      store.append(createMemoryRecord({ category: 'cycle', source: 'test', summary: 'c', severity: 'medium' }));

      expect(store.findBySeverity('high')).toHaveLength(1);
      expect(store.findBySeverity('low')).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('should search by summary content', () => {
      store.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'Authentication flow fixed' }));
      store.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'Database migration' }));

      expect(store.search('authentication')).toHaveLength(1);
      expect(store.search('migration')).toHaveLength(1);
    });

    it('should search by tags', () => {
      store.append(createMemoryRecord({
        category: 'decision', source: 'test', summary: 'test',
        tags: ['security', 'critical'],
      }));
      expect(store.search('critical')).toHaveLength(1);
      expect(store.search('security')).toHaveLength(1);
    });

    it('should return empty for no matches', () => {
      expect(store.search('nonexistent')).toHaveLength(0);
    });
  });

  describe('persistence and reload', () => {
    it('should persist records across store instances', () => {
      const filePath = path.join(tmpDir, 'persist.json');
      const store1 = new MemoryStore(filePath);
      store1.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'persisted' }));
      // Advance timers so debounced save fires before destroy
      jest.advanceTimersByTime(10);
      store1.destroy();

      const store2 = new MemoryStore(filePath);
      store2.load();
      store2.append(createMemoryRecord({ category: 'cycle', source: 'test2', summary: 'second' }));
      expect(store2.count()).toBe(2);
      store2.destroy();
    });

    it('should handle corrupted file gracefully', () => {
      const filePath = path.join(tmpDir, 'corrupt.json');
      fs.writeFileSync(filePath, '{invalid json content', 'utf-8');
      const corruptStore = new MemoryStore(filePath);
      const state = corruptStore.load();
      expect(state.sessionId).toBeTruthy(); // fresh state
      // File gets renamed to .corrupted
      expect(fs.existsSync(filePath + '.corrupted')).toBe(true);
      corruptStore.destroy();
    });
  });

  describe('in-memory mode', () => {
    it('should work without file path', () => {
      const memStore = new MemoryStore();
      memStore.append(createMemoryRecord({ category: 'decision', source: 'test', summary: 'in-memory' }));
      expect(memStore.count()).toBe(1);
      memStore.destroy();
    });
  });
});

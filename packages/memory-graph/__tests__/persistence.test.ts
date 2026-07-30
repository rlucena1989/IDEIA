import * as fs from 'fs';
import * as path from 'path';
import { MemoryGraph } from '../src/graph';
import { JsonPersistence, CheckpointManager, Neo4jPersistence } from '../src/persistence';

describe('JsonPersistence', () => {
  let graph: MemoryGraph;
  let persister: JsonPersistence;
  let tmpDir: string;

  beforeEach(() => {
    graph = new MemoryGraph();
    persister = new JsonPersistence();
    tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mg-per-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should save and load a graph with nodes and edges', async () => {
    const a = graph.addNode({ type: 'memory', label: 'A', properties: {}, tags: [] });
    const b = graph.addNode({ type: 'memory', label: 'B', properties: {}, tags: [] });
    graph.addEdge({ source: a, target: b, relation: 'links', weight: 1 });

    const filePath = path.join(tmpDir, 'test.json');
    await persister.save(graph, filePath);
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = await persister.load(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.getNode(a)?.label).toBe('A');
    const stats = loaded!.getStats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
  });

  it('should return null when loading non-existent file', async () => {
    const result = await persister.load('/nonexistent/path.json');
    expect(result).toBeNull();
  });

  it('should handle empty graph save and load', async () => {
    const filePath = path.join(tmpDir, 'empty.json');
    await persister.save(graph, filePath);
    const loaded = await persister.load(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.getStats().nodeCount).toBe(0);
  });

  it('should return null for corrupt JSON', async () => {
    const filePath = path.join(tmpDir, 'corrupt.json');
    fs.writeFileSync(filePath, '{not valid json}', 'utf-8');
    const result = await persister.load(filePath);
    expect(result).toBeNull();
  });

  it('should use atomic write pattern (write to tmp then rename)', async () => {
    const _a = graph.addNode({ type: 'memory', label: 'atomic', properties: {}, tags: [] });
    const filePath = path.join(tmpDir, 'atomic.json');
    await persister.save(graph, filePath);
    const tmpFile = filePath + '.tmp';
    expect(fs.existsSync(tmpFile)).toBe(false);
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('atomic');
  });

  it('should create parent directories when saving', async () => {
    const _a = graph.addNode({ type: 'memory', label: 'deep', properties: {}, tags: [] });
    const filePath = path.join(tmpDir, 'sub', 'nested', 'graph.json');
    await persister.save(graph, filePath);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe('CheckpointManager', () => {
  let graph: MemoryGraph;
  let persister: JsonPersistence;
  let tmpDir: string;
  let manager: CheckpointManager;

  beforeEach(() => {
    graph = new MemoryGraph();
    persister = new JsonPersistence();
    tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mg-cp-'));
    manager = new CheckpointManager(persister, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should save and load checkpoints by name', async () => {
    graph.addNode({ type: 'memory', label: 'cp-test', properties: {}, tags: [] });
    const filePath = await manager.save(graph, 'checkpoint-1');
    expect(fs.existsSync(filePath)).toBe(true);

    const loaded = await manager.load('checkpoint-1');
    expect(loaded).not.toBeNull();
  });

  it('should list available checkpoints', async () => {
    await manager.save(graph, 'v1');
    await manager.save(graph, 'v2');
    const list = await manager.list();
    expect(list).toContain('v1');
    expect(list).toContain('v2');
  });

  it('should return empty list when no checkpoints exist', async () => {
    const list = await manager.list();
    expect(list).toEqual([]);
  });

  it('should remove a checkpoint', async () => {
    await manager.save(graph, 'to-remove');
    const removed = await manager.remove('to-remove');
    expect(removed).toBe(true);
    const list = await manager.list();
    expect(list).not.toContain('to-remove');
  });

  it('should return false when removing non-existent checkpoint', async () => {
    const removed = await manager.remove('non-existent');
    expect(removed).toBe(false);
  });
});

describe('Neo4jPersistence', () => {
  it('should not connect without config', async () => {
    const neo = new Neo4jPersistence();
    const connected = await neo.connect();
    expect(connected).toBe(false);
  });

  it('should connect with valid config', async () => {
    const neo = new Neo4jPersistence({ uri: 'bolt://localhost:7687', user: 'neo4j', password: 'test' });
    const connected = await neo.connect();
    expect(connected).toBe(true);
  });

  it('should disconnect gracefully', async () => {
    const neo = new Neo4jPersistence({ uri: 'bolt://localhost:7687', user: 'neo4j', password: 'test' });
    await neo.connect();
    await neo.disconnect();
    const graph = new MemoryGraph();
    graph.addNode({ type: 'memory', label: 'x', properties: {}, tags: [] });
    await neo.save(graph);
  });
});
import { MemoryGraph } from '../src/graph';
import { GraphCrawler } from '../src/crawler';

describe('MemoryGraph', () => {
  let graph: MemoryGraph;

  beforeEach(() => {
    graph = new MemoryGraph();
  });

  it('should add a node and return an id', () => {
    const id = graph.addNode({
      type: 'memory',
      label: 'test node',
      properties: { key: 'value' },
      tags: ['test'],
    });
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should get a node by id', () => {
    const id = graph.addNode({
      type: 'decision',
      label: 'decision node',
      properties: {},
      tags: [],
    });
    const node = graph.getNode(id);
    expect(node).toBeDefined();
    expect(node!.label).toBe('decision node');
    expect(node!.type).toBe('decision');
    expect(node!.timestamp).toBeGreaterThan(0);
  });

  it('should add edges between nodes', () => {
    const a = graph.addNode({ type: 'memory', label: 'A', properties: {}, tags: [] });
    const b = graph.addNode({ type: 'memory', label: 'B', properties: {}, tags: [] });
    graph.addEdge({ source: a, target: b, relation: 'links_to', weight: 0.8 });
    const stats = graph.getStats();
    expect(stats.edgeCount).toBe(1);
  });

  it('should query nodes by type', () => {
    graph.addNode({ type: 'memory', label: 'mem', properties: {}, tags: [] });
    graph.addNode({ type: 'error', label: 'err', properties: {}, tags: [] });
    const results = graph.query({ type: 'memory' });
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('mem');
  });

  it('should query nodes by tag', () => {
    graph.addNode({ type: 'memory', label: 'tagged', properties: {}, tags: ['important'] });
    graph.addNode({ type: 'memory', label: 'plain', properties: {}, tags: [] });
    const results = graph.query({ tag: 'important' });
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('tagged');
  });

  it('should query nodes by search', () => {
    graph.addNode({ type: 'artifact', label: 'Login Page', properties: {}, tags: ['ui'] });
    graph.addNode({ type: 'artifact', label: 'Dashboard', properties: {}, tags: ['ui'] });
    const results = graph.query({ search: 'login' });
    expect(results).toHaveLength(1);
  });

  it('should find paths between nodes', () => {
    const a = graph.addNode({ type: 'memory', label: 'Start', properties: {}, tags: [] });
    const b = graph.addNode({ type: 'memory', label: 'Middle', properties: {}, tags: [] });
    const c = graph.addNode({ type: 'memory', label: 'End', properties: {}, tags: [] });
    graph.addEdge({ source: a, target: b, relation: 'leads_to', weight: 1.0 });
    graph.addEdge({ source: b, target: c, relation: 'leads_to', weight: 0.5 });
    const paths = graph.findPath(a, c);
    expect(paths).toHaveLength(1);
    expect(paths[0].nodes).toHaveLength(3);
    expect(paths[0].edges).toHaveLength(2);
    expect(paths[0].score).toBeGreaterThan(0);
  });

  it('should return empty path for disconnected nodes', () => {
    const a = graph.addNode({ type: 'memory', label: 'A', properties: {}, tags: [] });
    const b = graph.addNode({ type: 'memory', label: 'B', properties: {}, tags: [] });
    const paths = graph.findPath(a, b);
    expect(paths).toHaveLength(0);
  });

  it('should remove a node and its edges', () => {
    const a = graph.addNode({ type: 'memory', label: 'A', properties: {}, tags: [] });
    const b = graph.addNode({ type: 'memory', label: 'B', properties: {}, tags: [] });
    graph.addEdge({ source: a, target: b, relation: 'depends', weight: 0.9 });
    expect(graph.removeNode(a)).toBe(true);
    expect(graph.getNode(a)).toBeUndefined();
    const stats = graph.getStats();
    expect(stats.edgeCount).toBe(0);
  });

  it('should return false when removing non-existent node', () => {
    expect(graph.removeNode('non-existent')).toBe(false);
  });

  it('should return stats with correct counts', () => {
    graph.addNode({ type: 'memory', label: 'm1', properties: {}, tags: [] });
    graph.addNode({ type: 'error', label: 'e1', properties: {}, tags: [] });
    graph.addNode({ type: 'error', label: 'e2', properties: {}, tags: [] });
    const stats = graph.getStats();
    expect(stats.nodeCount).toBe(3);
    expect(stats.edgeCount).toBe(0);
    expect(stats.byType.memory).toBe(1);
    expect(stats.byType.error).toBe(2);
  });

  it('should respect limit in query', () => {
    for (let i = 0; i < 10; i++) {
      graph.addNode({ type: 'memory', label: `mem${i}`, properties: {}, tags: [] });
    }
    const results = graph.query({}, 3);
    expect(results).toHaveLength(3);
  });
});

describe('GraphCrawler', () => {
  it('should crawl all 5 silos and add nodes to graph', () => {
    const graph = new MemoryGraph();
    const crawler = new GraphCrawler(graph);
    crawler.crawlAll();
    const stats = graph.getStats();
    expect(stats.nodeCount).toBe(7);
    expect(stats.byType.memory).toBe(2);
    expect(stats.byType.pattern).toBe(1);
    expect(stats.byType.artifact).toBe(2);
    expect(stats.byType.decision).toBe(1);
    expect(stats.byType.error).toBe(1);
  });

  it('should produce crawl results for each silo', () => {
    const graph = new MemoryGraph();
    const crawler = new GraphCrawler(graph);
    expect(crawler.crawlMemoryStore()).toHaveLength(2);
    expect(crawler.crawlPatternLearner()).toHaveLength(1);
    expect(crawler.crawlKnowledgeBase()).toHaveLength(2);
    expect(crawler.crawlTraceRegistry()).toHaveLength(1);
    expect(crawler.crawlAuditTrail()).toHaveLength(1);
  });
});

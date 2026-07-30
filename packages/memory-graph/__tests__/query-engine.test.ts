import { MemoryGraph } from '../src/graph';
import { GraphQueryEngine } from '../src/query';

describe('GraphQueryEngine', () => {
  let graph: MemoryGraph;
  let engine: GraphQueryEngine;

  beforeEach(() => {
    graph = new MemoryGraph();
    const a = graph.addNode({ type: 'memory', label: 'Alpha', properties: {}, tags: ['important', 'core'] });
    const b = graph.addNode({ type: 'memory', label: 'Beta', properties: {}, tags: ['core'] });
    const c = graph.addNode({ type: 'memory', label: 'Gamma', properties: {}, tags: ['important'] });
    graph.addEdge({ source: a, target: b, relation: 'depends_on', weight: 0.8 });
    graph.addEdge({ source: b, target: c, relation: 'depends_on', weight: 0.6 });
    engine = new GraphQueryEngine(graph);
  });

  it('should find path between two nodes by label', () => {
    const result = engine.findPath('Alpha', 'Gamma');
    expect(result.type).toBe('path');
    const data = result.data as Record<string, unknown>;
    expect((data.paths as Array<unknown>).length).toBeGreaterThanOrEqual(1);
    expect(data.from).toBe('Alpha');
    expect(data.to).toBe('Gamma');
  });

  it('should return error when source node not found', () => {
    const result = engine.findPath('NonExistent', 'Alpha');
    expect(result.type).toBe('path');
    expect((result.data as Record<string, unknown>).error).toBe('Node not found');
  });

  it('should return error when target node not found', () => {
    const result = engine.findPath('Alpha', 'NonExistent');
    expect(result.type).toBe('path');
    expect((result.data as Record<string, unknown>).error).toBe('Node not found');
  });

  it('should extract subgraph around a node', () => {
    const result = engine.subgraph('Alpha', 2);
    expect(result.type).toBe('subgraph');
    const data = result.data as Record<string, unknown>;
    expect(data.center).toBe('Alpha');
    expect((data.nodeCount as number)).toBeGreaterThanOrEqual(1);
  });

  it('should return error for subgraph when node not found', () => {
    const result = engine.subgraph('NonExistent');
    expect(result.type).toBe('subgraph');
    expect((result.data as Record<string, unknown>).error).toBe('Node not found');
  });

  it('should query timeline', () => {
    const now = Date.now();
    const result = engine.timeline(now - 60000, now + 60000);
    expect(result.type).toBe('timeline');
    const data = result.data as Record<string, unknown>;
    expect(data.count).toBe(3);
  });

  it('should query with empty timeline range', () => {
    const result = engine.timeline(0, 1);
    expect(result.type).toBe('timeline');
    expect((result.data as Record<string, unknown>).count).toBe(0);
  });

  it('should compute similarity groups', () => {
    const result = engine.similarity(undefined, 'core');
    expect(result.type).toBe('similarity');
    const data = result.data as Record<string, unknown>;
    expect((data.length as number)).toBeGreaterThanOrEqual(1);
  });

  it('should return topology', () => {
    const result = engine.topology();
    expect(result.type).toBe('topology');
  });

  it('should parse query language', () => {
    const result = engine.queryLanguage('TYPE:memory TAG:important');
    expect(result.type).toBe('query');
    const data = result.data as Record<string, unknown>;
    expect(data.count).toBe(2);
  });

  it('should handle depth query in queryLanguage', () => {
    const result = engine.queryLanguage('DEPTH:Alpha->Gamma');
    expect(['path', 'subgraph']).toContain(result.type);
  });

  it('should handle SEARCH in queryLanguage', () => {
    const result = engine.queryLanguage('SEARCH:Alpha');
    expect(result.type).toBe('query');
    const data = result.data as Record<string, unknown>;
    expect(((data.parsed as Record<string, unknown>).filters as Record<string, unknown>).search).toBe('Alpha');
  });

  it('should handle LIMIT in queryLanguage', () => {
    const result = engine.queryLanguage('LIMIT:1');
    expect(result.type).toBe('query');
    const data = result.data as Record<string, unknown>;
    expect((data.parsed as Record<string, unknown>).limit).toBe(1);
  });

  it('should handle SINCE in queryLanguage', () => {
    const result = engine.queryLanguage('SINCE:1');
    expect(result.type).toBe('query');
  });

  it('should measure execution time', () => {
    const result = engine.topology();
    expect(result.took).toBeGreaterThanOrEqual(0);
  });

  it('should return took property for all queries', () => {
    const results = [
      engine.findPath('Alpha', 'Beta'),
      engine.subgraph('Alpha'),
      engine.timeline(Date.now() - 60000),
      engine.similarity(),
      engine.topology(),
    ];
    for (const r of results) {
      expect(r.took).toBeGreaterThanOrEqual(0);
    }
  });
});
import { describe, it, expect } from '@jest/globals';
import { CagCache } from '../src/cag-cache';
import { KnowledgeGraph } from '../src/knowledge-graph';

describe('CagCache', () => {
  it('should store and retrieve by exact key', () => {
    const cache = new CagCache(60000, 100);
    cache.set('query1', 'response1');
    expect(cache.get('query1')).toBe('response1');
  });

  it('should return null for missing key', () => {
    const cache = new CagCache();
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should respect TTL', async () => {
    const cache = new CagCache(10, 100);
    cache.set('q', 'r');
    await new Promise(r => setTimeout(r, 20));
    expect(cache.get('q')).toBeNull();
  });

  it('should track stats', () => {
    const cache = new CagCache();
    cache.set('q1', 'r1');
    cache.set('q2', 'r2');
    cache.get('q1');
    cache.get('q1');
    cache.get('nonexistent');
    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.totalHits).toBe(2);
    expect(stats.totalMisses).toBe(1);
  });

  it('should invalidate by key', () => {
    const cache = new CagCache();
    cache.set('q', 'r');
    expect(cache.invalidate('q')).toBe(true);
    expect(cache.get('q')).toBeNull();
  });

  it('should clear all entries', () => {
    const cache = new CagCache();
    cache.set('q1', 'r1');
    cache.set('q2', 'r2');
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });

  it('should find exact match on get()', () => {
    const cache = new CagCache();
    cache.set('sort array', 'use Array.sort()');
    const result = cache.get('sort array');
    expect(result).toBe('use Array.sort()');
  });

  it('should find fuzzy similar with lower threshold', async () => {
    const cache = new CagCache(60000, 100, 0.5);
    cache.set('sort array', 'use Array.sort()');
    const result = await cache.semanticGet('sort array');
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThan(0.5);
  });
});

describe('KnowledgeGraph', () => {
  it('should add and retrieve nodes', () => {
    const kg = new KnowledgeGraph();
    const id = kg.addNode({ type: 'module', name: 'test-module', properties: { lang: 'ts' } });
    const node = kg.getNode(id);
    expect(node).toBeDefined();
    expect(node!.name).toBe('test-module');
  });

  it('should add edges between nodes', () => {
    const kg = new KnowledgeGraph();
    const a = kg.addNode({ type: 'module', name: 'A', properties: {} });
    const b = kg.addNode({ type: 'module', name: 'B', properties: {} });
    kg.addEdge({ source: a, target: b, relation: 'depends_on' });
    const deps = kg.getDependencies(a);
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('B');
  });

  it('should query nodes by type', () => {
    const kg = new KnowledgeGraph();
    kg.addNode({ type: 'module', name: 'm1', properties: {} });
    kg.addNode({ type: 'decision', name: 'd1', properties: {} });
    expect(kg.queryNodes('module')).toHaveLength(1);
    expect(kg.queryNodes('decision')).toHaveLength(1);
  });

  it('should traverse graph BFS', () => {
    const kg = new KnowledgeGraph();
    const a = kg.addNode({ type: 'module', name: 'A', properties: {} });
    const b = kg.addNode({ type: 'module', name: 'B', properties: {} });
    const c = kg.addNode({ type: 'module', name: 'C', properties: {} });
    kg.addEdge({ source: a, target: b, relation: 'depends_on' });
    kg.addEdge({ source: b, target: c, relation: 'depends_on' });
    const traversed = kg.traverse(a);
    expect(traversed.length).toBeGreaterThanOrEqual(2);
  });

  it('should analyze impact', () => {
    const kg = new KnowledgeGraph();
    const a = kg.addNode({ type: 'module', name: 'A', properties: {} });
    const b = kg.addNode({ type: 'module', name: 'B', properties: {} });
    kg.addEdge({ source: b, target: a, relation: 'depends_on' });
    const impact = kg.analyzeImpact(a);
    expect(impact.directDependents).toHaveLength(1);
    expect(impact.directDependents[0].name).toBe('B');
  });

  it('should search similar nodes', () => {
    const kg = new KnowledgeGraph();
    kg.addNode({ type: 'module', name: 'auth-service', properties: { lang: 'ts' } });
    kg.addNode({ type: 'module', name: 'payment-service', properties: { lang: 'ts' } });
    const results = kg.searchSimilar('auth');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('auth-service');
  });

  it('should return stats', () => {
    const kg = new KnowledgeGraph();
    kg.addNode({ type: 'module', name: 'm', properties: {} });
    kg.addNode({ type: 'decision', name: 'd', properties: {} });
    kg.addEdge({ source: kg.queryNodes('module')[0].id, target: kg.queryNodes('decision')[0].id, relation: 'references' });
    const stats = kg.getStats();
    expect(stats.nodes).toBe(2);
    expect(stats.edges).toBe(1);
    expect(stats.nodeTypes.module).toBe(1);
  });
});

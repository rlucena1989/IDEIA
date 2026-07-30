import { DependencyGraph } from '../dependency-graph';
import { CycleDetector } from '../cycle-detector';
import { ImpactAnalyzer } from '../impact-analyzer';

function createTestGraph(): DependencyGraph {
  const g = new DependencyGraph();
  g.addNode({ id: 'a', type: 'module', name: 'ModuleA' });
  g.addNode({ id: 'b', type: 'module', name: 'ModuleB' });
  g.addNode({ id: 'c', type: 'module', name: 'ModuleC' });
  g.addNode({ id: 'd', type: 'service', name: 'ServiceD' });
  g.addNode({ id: 'e', type: 'package', name: 'PackageE' });
  g.addEdge({ from: 'a', to: 'b', type: 'imports', weight: 1, optional: false });
  g.addEdge({ from: 'b', to: 'c', type: 'uses', weight: 1, optional: false });
  g.addEdge({ from: 'c', to: 'd', type: 'calls', weight: 2, optional: true });
  g.addEdge({ from: 'a', to: 'e', type: 'imports', weight: 1, optional: false });
  return g;
}

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = createTestGraph();
  });

  it('addNode and getNode', () => {
    const node = graph.getNode('a');
    expect(node).toBeDefined();
    expect(node!.id).toBe('a');
    expect(node!.name).toBe('ModuleA');
    expect(node!.type).toBe('module');
  });

  it('addEdge and getDependencies', () => {
    const deps = graph.getDependencies('a');
    expect(deps).toHaveLength(2);
    const toB = deps.find(e => e.to === 'b');
    expect(toB).toBeDefined();
    expect(toB!.type).toBe('imports');
    expect(toB!.weight).toBe(1);
  });

  it('getDependents', () => {
    const dependents = graph.getDependents('b');
    expect(dependents).toHaveLength(1);
    expect(dependents[0]!.from).toBe('a');
  });

  it('getAllNodes count', () => {
    expect(graph.getAllNodes()).toHaveLength(5);
  });

  it('getAllEdges count', () => {
    expect(graph.getAllEdges()).toHaveLength(4);
  });

  it('removeNode', () => {
    graph.removeNode('b');
    expect(graph.getNode('b')).toBeUndefined();
    const aDeps = graph.getDependencies('a');
    expect(aDeps.find(e => e.to === 'b')).toBeUndefined();
    expect(graph.getNodeCount()).toBe(4);
  });

  it('clear removes all nodes', () => {
    graph.clear();
    expect(graph.getNodeCount()).toBe(0);
    expect(graph.getEdgeCount()).toBe(0);
  });

  it('addEdge throws for non-existent from node', () => {
    expect(() => {
      graph.addEdge({ from: 'nonexistent', to: 'b', type: 'imports', weight: 1, optional: false });
    }).toThrow("Node 'nonexistent' does not exist in graph");
  });

  it('addEdge throws for non-existent to node', () => {
    expect(() => {
      graph.addEdge({ from: 'a', to: 'nonexistent', type: 'imports', weight: 1, optional: false });
    }).toThrow("Node 'nonexistent' does not exist in graph");
  });
});

describe('CycleDetector', () => {
  it('no cycles returns empty', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'x', type: 'module', name: 'X' });
    g.addNode({ id: 'y', type: 'module', name: 'Y' });
    g.addEdge({ from: 'x', to: 'y', type: 'uses', weight: 1, optional: false });
    const detector = new CycleDetector();
    expect(detector.detectCycles(g)).toHaveLength(0);
    expect(detector.hasCycle(g)).toBe(false);
  });

  it('with cycle returns cycle info', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'a', type: 'module', name: 'A' });
    g.addNode({ id: 'b', type: 'module', name: 'B' });
    g.addNode({ id: 'c', type: 'module', name: 'C' });
    g.addEdge({ from: 'a', to: 'b', type: 'imports', weight: 1, optional: false });
    g.addEdge({ from: 'b', to: 'c', type: 'imports', weight: 1, optional: false });
    g.addEdge({ from: 'c', to: 'a', type: 'imports', weight: 1, optional: false });
    const detector = new CycleDetector();
    const cycles = detector.detectCycles(g);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]!.length).toBeGreaterThan(0);
  });

  it('hasCycle detects cycle', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'x', type: 'module', name: 'X' });
    g.addNode({ id: 'y', type: 'module', name: 'Y' });
    g.addEdge({ from: 'x', to: 'y', type: 'uses', weight: 1, optional: false });
    g.addEdge({ from: 'y', to: 'x', type: 'uses', weight: 1, optional: false });
    const detector = new CycleDetector();
    expect(detector.hasCycle(g)).toBe(true);
  });

  it('findCyclesInvolving', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'a', type: 'module', name: 'A' });
    g.addNode({ id: 'b', type: 'module', name: 'B' });
    g.addNode({ id: 'c', type: 'module', name: 'C' });
    g.addEdge({ from: 'a', to: 'b', type: 'imports', weight: 1, optional: false });
    g.addEdge({ from: 'b', to: 'c', type: 'imports', weight: 1, optional: false });
    g.addEdge({ from: 'c', to: 'a', type: 'imports', weight: 1, optional: false });
    const detector = new CycleDetector();
    const involvingA = detector.findCyclesInvolving(g, 'a');
    expect(involvingA.length).toBeGreaterThan(0);
  });

  it('findShortestCycle returns null for acyclic graph', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'a', type: 'module', name: 'A' });
    g.addNode({ id: 'b', type: 'module', name: 'B' });
    g.addEdge({ from: 'a', to: 'b', type: 'uses', weight: 1, optional: false });
    const detector = new CycleDetector();
    expect(detector.findShortestCycle(g)).toBeNull();
  });
});

describe('ImpactAnalyzer', () => {
  it('analyzeChange returns direct impact', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'core', type: 'module', name: 'Core' });
    g.addNode({ id: 'dep1', type: 'module', name: 'Dep1' });
    g.addNode({ id: 'dep2', type: 'module', name: 'Dep2' });
    g.addEdge({ from: 'core', to: 'dep1', type: 'imports', weight: 1, optional: false });
    g.addEdge({ from: 'core', to: 'dep2', type: 'imports', weight: 1, optional: false });
    const analyzer = new ImpactAnalyzer();
    const impact = analyzer.analyzeChange(g, 'dep1');
    expect(impact.directImpact).toContain('core');
  });

  it('analyzeChange returns transitive impact', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'a', type: 'module', name: 'A' });
    g.addNode({ id: 'b', type: 'module', name: 'B' });
    g.addNode({ id: 'c', type: 'module', name: 'C' });
    g.addEdge({ from: 'c', to: 'b', type: 'uses', weight: 1, optional: false });
    g.addEdge({ from: 'b', to: 'a', type: 'imports', weight: 1, optional: false });
    const analyzer = new ImpactAnalyzer();
    const impact = analyzer.analyzeChange(g, 'a');
    expect(impact.transitiveImpact).toContain('c');
  });

  it('risk level calculation', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'root', type: 'module', name: 'Root' });
    for (let i = 0; i < 20; i++) {
      const id = `dep${i}`;
      g.addNode({ id, type: 'module', name: `Dep${i}` });
      g.addEdge({ from: id, to: 'root', type: 'imports', weight: 1, optional: false });
    }
    const analyzer = new ImpactAnalyzer();
    const impact = analyzer.analyzeChange(g, 'root');
    expect(impact.riskLevel).toBe('high');
  });

  it('affected types categorization', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'm1', type: 'module', name: 'M1' });
    g.addNode({ id: 's1', type: 'service', name: 'S1' });
    g.addNode({ id: 'p1', type: 'package', name: 'P1' });
    g.addEdge({ from: 'm1', to: 's1', type: 'uses', weight: 1, optional: false });
    g.addEdge({ from: 's1', to: 'p1', type: 'imports', weight: 1, optional: false });
    const analyzer = new ImpactAnalyzer();
    const impact = analyzer.analyzeChange(g, 'p1');
    expect(impact.affectedTypes['service']).toBe(1);
    expect(impact.affectedTypes['module']).toBe(1);
  });

  it('risk level is low for single node with no deps', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'alone', type: 'module', name: 'Alone' });
    const analyzer = new ImpactAnalyzer();
    const impact = analyzer.analyzeChange(g, 'alone');
    expect(impact.totalAffected).toBe(1);
    expect(impact.riskLevel).toBe('low');
  });

  it('risk level is medium for 5-15 affected', () => {
    const g = new DependencyGraph();
    g.addNode({ id: 'hub', type: 'module', name: 'Hub' });
    for (let i = 0; i < 10; i++) {
      const id = `n${i}`;
      g.addNode({ id, type: 'module', name: `N${i}` });
      g.addEdge({ from: id, to: 'hub', type: 'imports', weight: 1, optional: false });
    }
    const analyzer = new ImpactAnalyzer();
    const impact = analyzer.analyzeChange(g, 'hub');
    expect(impact.riskLevel).toBe('medium');
  });
});

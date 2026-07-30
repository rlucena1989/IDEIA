# Estudo: DependencyAnalyzer — Graph Algorithms for Task Plans

> **Extraído de:** ESTUDO-PLANNING-ENGINE-AVANCADO.md seção 1.4
> **Data:** 2026-07-24
> **Propósito:** Motor de análise de dependências entre steps de planos — identificação de dependências reais (arquivo, dado, decisão), detecção de ciclos, paralelização, critical path, ordenação topológica.
> **Nível 1:** Dependências diretas/indiretas/reais, grafo acíclico direcionado (DAG)
> **Nível 2:** Algoritmos: Kahn topological sort, Tarjan SCC, CPM critical path
> **Nível 3:** Parallelization detection, transitive reduction, incremental recomputation
> **Nível 4:** Dynamic dependency graphs, probabilistic dependencies

---

## 1. NÍVEL TÉCNICO

### 1.1 Tipos de Dependência

```typescript
enum DependencyType {
  FILE = 'file',             // Step B modifica arquivo que Step A criou
  DATA = 'data',             // Step B precisa de output do Step A
  DECISION = 'decision',     // Step B precisa de decisão do Step A
  RESOURCE = 'resource',     // Step B precisa do mesmo recurso (ex: GPU)
  TEMPORAL = 'temporal',     // Step B deve ocorrer antes do Step A (ordenação)
}

interface Dependency {
  from: string;               // Step ID
  to: string;                 // Step ID
  type: DependencyType;
  weight: number;             // 1-10 (força da dependência)
  optional: boolean;          // Pode ser ignorada se necessário
}
```

### 1.2 Detection Algorithms

```typescript
class DependencyAnalyzer {
  analyze(steps: PlannedStep[]): DependencyGraph {
    const deps: Dependency[] = [];

    // 1. FILE dependencies: mesmo arquivo em steps diferentes
    for (const step of steps) {
      for (const other of steps) {
        if (step.id === other.id) continue;
        const shared = intersect(step.filesAffected, other.filesAffected);
        if (shared.length > 0) {
          deps.push({ from: step.id, to: other.id, type: 'file', weight: 8, optional: false });
        }
      }
    }

    // 2. DATA dependencies: step B precisa de output do step A
    for (const step of steps) {
      for (const other of steps) {
        if (step.id === other.id) continue;
        const needed = intersect(step.needsData, other.providesData);
        if (needed.length > 0) {
          deps.push({ from: step.id, to: other.id, type: 'data', weight: 10, optional: false });
        }
      }
    }

    // 3. Build graph + validate
    const graph = this.buildGraph(steps, deps);
    this.validateAcyclic(graph);

    return graph;
  }

  // Topological Sort (Kahn's algorithm)
  topologicalSort(graph: DependencyGraph): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    for (const [id] of graph.nodes) {
      inDegree.set(id, graph.incoming(id).length);
      if (inDegree.get(id) === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const dep of graph.outgoing(node)) {
        const newCount = inDegree.get(dep.to)! - 1;
        inDegree.set(dep.to, newCount);
        if (newCount === 0) queue.push(dep.to);
      }
    }

    if (result.length !== graph.nodes.size) {
      throw new Error('Graph contains a cycle');
    }
    return result;
  }

  // Critical Path Method
  criticalPath(graph: DependencyGraph): CriticalPath {
    const topo = this.topologicalSort(graph);
    const earliest = new Map<string, number>();
    const latest = new Map<string, number>();

    // Forward pass: earliest start
    for (const node of topo) {
      const maxPred = Math.max(
        0,
        ...graph.incoming(node).map(d => earliest.get(d.from)! + (graph.getNode(d.from)?.duration || 1))
      );
      earliest.set(node, maxPred);
    }

    // Backward pass: latest start
    const projectEnd = Math.max(...earliest.values());
    for (const node of [...topo].reverse()) {
      const minSucc = Math.min(
        projectEnd,
        ...graph.outgoing(node).map(d => latest.get(d.to)! - (graph.getNode(node)?.duration || 1))
      );
      latest.set(node, minSucc);
    }

    // Critical path: nodes with zero slack
    const critical = topo.filter(n => earliest.get(n) === latest.get(n));

    return {
      criticalPath: critical,
      projectDuration: projectEnd,
      slack: new Map(topo.map(n => [n, latest.get(n)! - earliest.get(n)!])),
    };
  }

  // Parallelization groups
  findParallelGroups(graph: DependencyGraph): string[][] {
    const topo = this.topologicalSort(graph);
    const groups: string[][] = [];
    const visited = new Set<string>();

    for (const node of topo) {
      if (visited.has(node)) continue;
      const group = [node];
      for (const other of topo) {
        if (node === other || visited.has(other)) continue;
        if (!this.hasPath(graph, node, other) && !this.hasPath(graph, other, node)) {
          group.push(other);
          visited.add(other);
        }
      }
      visited.add(node);
      groups.push(group);
    }

    return groups;
  }

  // Transitive Reduction: remover dependências implícitas
  transitiveReduction(graph: DependencyGraph): DependencyGraph {
    // Se A→B e B→C, então A→C é implícita (pode ser removida)
    const reduced = graph.clone();
    for (const node of graph.nodes.keys()) {
      const reachable = this.reachableNodes(graph, node);
      for (const direct of graph.outgoing(node)) {
        if (reachable.has(direct.to) && reachable.get(direct.to)!.size > 0) {
          reduced.removeEdge(node, direct.to);
        }
      }
    }
    return reduced;
  }
}
```

### 1.3 Cycle Detection

```typescript
class CycleDetector {
  // Tarjan's Strongly Connected Components
  findSCCs(graph: DependencyGraph): SCC[] {
    let index = 0;
    const stack: string[] = [];
    const indices = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const sccs: SCC[] = [];

    function strongconnect(node: string) {
      indices.set(node, index);
      lowlink.set(node, index);
      index++;
      stack.push(node);
      onStack.add(node);

      for (const dep of graph.outgoing(node)) {
        if (!indices.has(dep.to)) {
          strongconnect(dep.to);
          lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(dep.to)!));
        } else if (onStack.has(dep.to)) {
          lowlink.set(node, Math.min(lowlink.get(node)!, indices.get(dep.to)!));
        }
      }

      if (lowlink.get(node) === indices.get(node)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== node);
        if (scc.length > 1) sccs.push({ nodes: scc, size: scc.length });
      }
    }

    for (const node of graph.nodes.keys()) {
      if (!indices.has(node)) strongconnect(node);
    }

    return sccs;
  }

  // Sugerir resolução de ciclo
  resolveCycle(scc: SCC, graph: DependencyGraph): CycleResolution {
    // Estratégia: tornar uma dependência opcional
    // ou fundir os steps do ciclo em um step único
    return {
      cycle: scc.nodes,
      suggestion: scc.size > 3
        ? 'merge_steps'
        : 'make_one_dependency_optional',
      candidateDeps: graph.edges
        .filter(e => scc.nodes.includes(e.from) && scc.nodes.includes(e.to))
        .map(e => ({ from: e.from, to: e.to })),
    };
  }
}
```

---

## 2. GRAPH CONSTRUCTION & DATA SOURCES

### 2.1 Building Graphs from File Imports

```typescript
class FileImportGraphBuilder {
  build(projectRoot: string): DependencyGraph {
    const graph = new DependencyGraph();
    const modules = this.scanModules(projectRoot);

    for (const [filePath, imports] of modules) {
      graph.addNode(filePath, { type: 'file', path: filePath });
      for (const imported of imports) {
        const resolved = this.resolvePath(filePath, imported);
        if (resolved) {
          graph.addEdge(filePath, resolved, { type: DependencyType.FILE, weight: 7, optional: false });
        }
      }
    }
    return graph;
  }

  private scanModules(root: string): Map<string, string[]> {
    const modules = new Map<string, string[]>();
    const files = this.collectFiles(root, ['.ts', '.tsx', '.js', '.jsx']);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = this.parseImports(content);
      modules.set(file, imports);
    }
    return modules;
  }

  private parseImports(content: string): string[] {
    const imports: string[] = [];
    // Static ES imports: import ... from '...'
    const staticRe = /import\s+(?:\*\s+as\s+\w+|\{[^}]*\}|\w+(?:\s*,\s*\w+)?)\s+from\s+['"]([^'"]+)['"]/g;
    // Dynamic imports: import('...')
    const dynamicRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    // require calls
    const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    let match: RegExpExecArray | null;
    while ((match = staticRe.exec(content)) !== null) imports.push(match[1]);
    while ((match = dynamicRe.exec(content)) !== null) imports.push(match[1]);
    while ((match = requireRe.exec(content)) !== null) imports.push(match[1]);

    return imports;
  }

  private resolvePath(from: string, target: string): string | null {
    if (target.startsWith('.')) {
      return path.resolve(path.dirname(from), target) + '.ts';
    }
    return null; // External modules resolved via package.json
  }

  private collectFiles(root: string, exts: string[]): string[] {
    const files: string[] = [];
    const queue = [root];
    while (queue.length > 0) {
      const dir = queue.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          queue.push(path.join(dir, entry.name));
        } else if (entry.isFile() && exts.some(e => entry.name.endsWith(e))) {
          files.push(path.join(dir, entry.name));
        }
      }
    }
    return files;
  }
}
```

### 2.2 Building Graphs from package.json

```typescript
class PackageGraphBuilder {
  build(workspaceRoot: string): DependencyGraph {
    const graph = new DependencyGraph();
    const rootPackageJson = this.readJson(path.join(workspaceRoot, 'package.json'));

    // Workspace packages
    const workspaces = rootPackageJson.workspaces ?? [];
    const packages = this.resolveWorkspacePackages(workspaceRoot, workspaces);

    for (const [pkgName, pkgPath] of packages) {
      const manifest = this.readJson(path.join(pkgPath, 'package.json'));
      graph.addNode(pkgName, { type: 'package', path: pkgPath, manifest });

      // Runtime dependencies
      for (const [dep, version] of Object.entries(manifest.dependencies ?? {})) {
        if (packages.has(dep)) {
          graph.addEdge(pkgName, dep, { type: DependencyType.DATA, weight: 8, optional: false, metadata: { version } });
        }
      }

      // Dev dependencies
      for (const [dep, version] of Object.entries(manifest.devDependencies ?? {})) {
        if (packages.has(dep)) {
          graph.addEdge(pkgName, dep, { type: DependencyType.DATA, weight: 4, optional: true, metadata: { version } });
        }
      }
    }

    return graph;
  }

  private resolveWorkspacePackages(root: string, workspaces: string[]): Map<string, string> {
    const packages = new Map<string, string>();
    for (const pattern of workspaces) {
      const matching = glob.sync(pattern, { cwd: root, absolute: true });
      for (const dir of matching) {
        const pkgPath = path.join(root, dir);
        if (fs.existsSync(path.join(pkgPath, 'package.json'))) {
          const manifest = this.readJson(path.join(pkgPath, 'package.json'));
          packages.set(manifest.name, pkgPath);
        }
      }
    }
    return packages;
  }

  private readJson(filePath: string): Record<string, unknown> {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
}
```

### 2.3 Building Call Graphs

```typescript
class CallGraphBuilder {
  build(sourceFiles: string[]): DependencyGraph {
    const graph = new DependencyGraph();
    const astCache = new Map<string, ASTNode>();

    for (const file of sourceFiles) {
      const ast = this.parseAST(file);
      astCache.set(file, ast);
      graph.addNode(file, { type: 'file' });
    }

    for (const [file, ast] of astCache) {
      const calls = this.extractFunctionCalls(ast);
      for (const call of calls) {
        const resolved = this.resolveCallToFile(call, file, astCache);
        if (resolved && resolved !== file) {
          graph.addEdge(file, resolved, { type: DependencyType.DATA, weight: 6, optional: false });
        }
      }
    }

    return graph;
  }

  private parseAST(file: string): ASTNode {
    const source = fs.readFileSync(file, 'utf-8');
    return { type: 'file', name: file, calls: this.scanCalls(source), functions: this.scanFunctions(source) };
  }

  private scanCalls(source: string): string[] {
    const calls: string[] = [];
    const callRe = /(\w+)\s*\(/g;
    const keywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'import', 'typeof', 'throw']);
    let match: RegExpExecArray | null;
    while ((match = callRe.exec(source)) !== null) {
      if (!keywords.has(match[1])) calls.push(match[1]);
    }
    return calls;
  }

  private scanFunctions(source: string): string[] {
    const functions: string[] = [];
    const funcRe = /(?:export\s+)?(?:function|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^{]+)?\s*=>|class\s+\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = funcRe.exec(source)) !== null) {
      functions.push(match[0]);
    }
    return functions;
  }

  private resolveCallToFile(callName: string, from: string, astCache: Map<string, ASTNode>): string | null {
    for (const [file, ast] of astCache) {
      if (file === from) continue;
      if (ast.functions.some(f => f.includes(callName))) return file;
    }
    return null;
  }
}
```

### 2.4 Merged Graph Construction

```typescript
class CompositeGraphBuilder {
  private fileBuilder = new FileImportGraphBuilder();
  private packageBuilder = new PackageGraphBuilder();
  private callBuilder = new CallGraphBuilder();

  build(workspaceRoot: string): DependencyGraph {
    const fileGraph = this.fileBuilder.build(workspaceRoot);
    const pkgGraph = this.packageBuilder.build(workspaceRoot);
    const callGraph = this.callBuilder.build(this.collectSourceFiles(workspaceRoot));

    const merged = new DependencyGraph();

    // Merge all nodes
    for (const [id, node] of fileGraph.nodes) merged.addNode(id, node);
    for (const [id, node] of pkgGraph.nodes) if (!merged.nodes.has(id)) merged.addNode(id, node);
    for (const [id, node] of callGraph.nodes) if (!merged.nodes.has(id)) merged.addNode(id, node);

    // Merge all edges with weighted combination
    const edgeKey = (e: Dependency) => `${e.from}|${e.to}`;
    const allEdges = new Map<string, Dependency>();

    for (const edge of [...fileGraph.edges, ...pkgGraph.edges, ...callGraph.edges]) {
      const key = edgeKey(edge);
      const existing = allEdges.get(key);
      if (existing) {
        existing.weight = Math.min(10, existing.weight + edge.weight);
        existing.optional = existing.optional && edge.optional;
      } else {
        allEdges.set(key, { ...edge });
      }
    }

    for (const edge of allEdges.values()) merged.addEdge(edge.from, edge.to, edge);
    return merged;
  }

  private collectSourceFiles(root: string): string[] {
    return glob.sync('**/*.{ts,tsx,js,jsx}', { cwd: root, absolute: true, ignore: ['**/node_modules/**'] });
  }
}
```

---

## 3. CYCLE DETECTION & RESOLUTION

### 3.1 Expanded Tarjan SCC with Resolution Strategies

```typescript
type CycleResolutionStrategy = 'make_optional' | 'merge_steps' | 'break_edge' | 'restructure';

interface CycleResolution {
  cycle: string[];
  strategy: CycleResolutionStrategy;
  confidence: number;
  explanation: string;
  actions: ResolutionAction[];
}

interface ResolutionAction {
  type: 'remove_edge' | 'make_optional' | 'merge_nodes' | 'add_intermediate';
  from?: string;
  to?: string;
  target?: string;
  newStep?: PlannedStep;
}

class AdvancedCycleDetector {
  private graph: DependencyGraph;
  private weights: Map<string, number>;

  constructor(graph: DependencyGraph, stepWeights?: Map<string, number>) {
    this.graph = graph;
    this.weights = stepWeights ?? new Map();
  }

  // Tarjan SCC — O(V+E)
  findSCCs(): SCC[] {
    let index = 0;
    const stack: string[] = [];
    const indices = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const sccs: SCC[] = [];

    const strongconnect = (node: string) => {
      indices.set(node, index);
      lowlink.set(node, index);
      index++;
      stack.push(node);
      onStack.add(node);

      for (const dep of this.graph.outgoing(node)) {
        if (!indices.has(dep.to)) {
          strongconnect(dep.to);
          lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(dep.to)!));
        } else if (onStack.has(dep.to)) {
          lowlink.set(node, Math.min(lowlink.get(node)!, indices.get(dep.to)!));
        }
      }

      if (lowlink.get(node) === indices.get(node)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== node);
        if (scc.length > 1) sccs.push({ nodes: scc, size: scc.length });
      }
    };

    for (const node of this.graph.nodes.keys()) {
      if (!indices.has(node)) strongconnect(node);
    }

    return sccs;
  }

  // Kosaraju-Sharir SCC — alternative O(V+E)
  findSCCsKosaraju(): SCC[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      for (const dep of this.graph.outgoing(node)) {
        if (!visited.has(dep.to)) dfs(dep.to);
      }
      order.push(node);
    };

    for (const node of this.graph.nodes.keys()) {
      if (!visited.has(node)) dfs(node);
    }

    // Reverse graph
    const reversed = this.graph.reverse();
    visited.clear();
    const sccs: SCC[] = [];

    const dfsReverse = (node: string, component: string[]) => {
      visited.add(node);
      component.push(node);
      for (const dep of reversed.outgoing(node)) {
        if (!visited.has(dep.to)) dfsReverse(dep.to, component);
      }
    };

    for (const node of order.reverse()) {
      if (!visited.has(node)) {
        const component: string[] = [];
        dfsReverse(node, component);
        if (component.length > 1) sccs.push({ nodes: component, size: component.length });
      }
    }

    return sccs;
  }

  // Intelligent resolution with heuristic scoring
  resolve(scc: SCC): CycleResolution {
    const edgeWeights = this.graph.edges
      .filter(e => scc.nodes.includes(e.from) && scc.nodes.includes(e.to))
      .map(e => ({ from: e.from, to: e.to, weight: this.weights.get(`${e.from}->${e.to}`) ?? e.weight }));

    // Find the weakest edge to break
    const weakestEdge = edgeWeights.reduce((min, e) => e.weight < min.weight ? e : min, edgeWeights[0]);

    let strategy: CycleResolutionStrategy;
    let explanation: string;
    let actions: ResolutionAction[];

    if (scc.size <= 2) {
      strategy = 'make_optional';
      explanation = `Cycle of size ${scc.size} — making the weakest dependency optional (${weakestEdge.from} → ${weakestEdge.to})`;
      actions = [{ type: 'make_optional', from: weakestEdge.from, to: weakestEdge.to }];
    } else if (scc.size <= 4 && weakestEdge.weight < 5) {
      strategy = 'break_edge';
      explanation = `Cycle of size ${scc.size} with low-weight edge — removing edge ${weakestEdge.from} → ${weakestEdge.to}`;
      actions = [{ type: 'remove_edge', from: weakestEdge.from, to: weakestEdge.to }];
    } else if (scc.size <= 6) {
      strategy = 'merge_steps';
      explanation = `Cycle of size ${scc.size} — merging all ${scc.nodes.length} steps into a single step`;
      actions = [{ type: 'merge_nodes', target: scc.nodes.join('+') }];
    } else {
      strategy = 'restructure';
      explanation = `Large cycle (${scc.size}) — full restructure recommended`;
      actions = [{
        type: 'add_intermediate',
        target: `intermediate_step_${scc.nodes[0]}`,
        newStep: this.createIntermediateStep(scc),
      }];
    }

    return { cycle: scc.nodes, strategy, confidence: 1 - (weakestEdge.weight / 10), explanation, actions };
  }

  private createIntermediateStep(scc: SCC): PlannedStep {
    return {
      id: `intermediate_${scc.nodes.join('_')}`,
      title: `Intermediate: ${scc.nodes.join(', ')}`,
      description: `Intermediate step to break cycle between ${scc.nodes.join(', ')}`,
      agentRole: 'coordinator',
      status: 'pending',
      dependencies: scc.nodes.map(n => ({ stepId: n, type: 'requires' })),
      acceptanceCriteria: [],
      risk: { level: 'medium', impact: 3, probability: 2, factors: ['cycle_resolution'], mitigation: '' },
      cost: { estimatedTokens: 200, estimatedSeconds: 30, estimatedSteps: 1, confidence: 0.6 },
      tags: ['cycle-resolved'],
    };
  }

  // Batch resolution with dependency ordering
  resolveAll(sccs: SCC[]): { resolved: CycleResolution[]; unresolved: SCC[] } {
    const resolved: CycleResolution[] = [];
    const unresolved: SCC[] = [];

    for (const scc of sccs) {
      const resolution = this.resolve(scc);
      if (resolution.confidence > 0.3) {
        resolved.push(resolution);
      } else {
        unresolved.push(scc);
      }
    }

    return { resolved, unresolved };
  }
}
```

### 3.2 Cycle Prevention During Graph Construction

```typescript
class CyclePreventionGuard {
  private graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  wouldCreateCycle(from: string, to: string): boolean {
    // BFS from 'to' to see if we can reach 'from' — if so, adding from→to creates a cycle
    const visited = new Set<string>();
    const queue = [to];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === from) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const dep of this.graph.outgoing(current)) {
        queue.push(dep.to);
      }
    }
    return false;
  }

  safeAddEdge(from: string, to: string, edge?: Partial<Dependency>): boolean {
    if (this.wouldCreateCycle(from, to)) {
      return false;
    }
    this.graph.addEdge(from, to, edge);
    return true;
  }
}
```

---

## 4. CRITICAL PATH & PARALLELIZATION

### 4.1 Critical Path Method — Full Implementation with Slack Time

```typescript
interface CriticalPathResult {
  criticalPath: string[];
  projectDuration: number;
  earliestStart: Map<string, number>;
  earliestFinish: Map<string, number>;
  latestStart: Map<string, number>;
  latestFinish: Map<string, number>;
  slack: Map<string, number>;
  slackPercentage: Map<string, number>;
  nearCritical: string[];
  ganttChart: GanttEntry[];
}

interface GanttEntry {
  stepId: string;
  start: number;
  end: number;
  duration: number;
  slack: number;
  isCritical: boolean;
}

class CriticalPathCalculator {
  calculate(graph: DependencyGraph): CriticalPathResult {
    const topo = new TopologicalSorter().sort(graph);
    const durations = new Map<string, number>();
    for (const [id, node] of graph.nodes) {
      durations.set(id, node.duration ?? 1);
    }

    // Forward pass: ES and EF
    const earliestStart = new Map<string, number>();
    const earliestFinish = new Map<string, number>();

    for (const node of topo) {
      const dur = durations.get(node)!;
      const maxPred = Math.max(0, ...graph.incoming(node).map(d => earliestFinish.get(d.from) ?? 0));
      earliestStart.set(node, maxPred);
      earliestFinish.set(node, maxPred + dur);
    }

    const projectDuration = Math.max(...earliestFinish.values());

    // Backward pass: LS and LF
    const latestStart = new Map<string, number>();
    const latestFinish = new Map<string, number>();

    for (const node of [...topo].reverse()) {
      const dur = durations.get(node)!;
      const minSucc = Math.min(
        projectDuration,
        ...graph.outgoing(node).map(d => latestStart.get(d.to) ?? projectDuration)
      );
      latestFinish.set(node, minSucc);
      latestStart.set(node, minSucc - dur);
    }

    // Slack calculation
    const slack = new Map<string, number>();
    const slackPct = new Map<string, number>();

    for (const node of topo) {
      const s = latestStart.get(node)! - earliestStart.get(node)!;
      slack.set(node, s);
      const dur = durations.get(node)!;
      slackPct.set(node, dur > 0 ? (s / dur) * 100 : 0);
    }

    // Critical path: zero slack
    const criticalPath = topo.filter(n => slack.get(n)! < 0.001);
    // Near-critical: slack < 20% of duration
    const nearCritical = topo.filter(n => {
      const s = slack.get(n)!;
      const dur = durations.get(n)!;
      return s >= 0.001 && dur > 0 && (s / dur) < 0.2;
    });

    // Gantt chart entries
    const ganttChart: GanttEntry[] = topo.map(node => ({
      stepId: node,
      start: earliestStart.get(node)!,
      end: earliestFinish.get(node)!,
      duration: durations.get(node)!,
      slack: slack.get(node)!,
      isCritical: criticalPath.includes(node),
    }));

    return {
      criticalPath,
      projectDuration,
      earliestStart,
      earliestFinish,
      latestStart,
      latestFinish,
      slack,
      slackPercentage: slackPct,
      nearCritical,
      ganttChart,
    };
  }
}
```

### 4.2 Parallel Group Detection

```typescript
class ParallelGroupDetector {
  detect(graph: DependencyGraph, maxGroupSize?: number): parallelGroup[] {
    const sorted = new TopologicalSorter().sort(graph);
    const groups: parallelGroup[] = [];
    const assigned = new Set<string>();

    for (const node of sorted) {
      if (assigned.has(node)) continue;
      const group: parallelGroup = { ids: [node], rationale: `Independent step`, resourceEstimate: 1 };

      for (const other of sorted) {
        if (node === other || assigned.has(other)) continue;
        const pathA = this.hasPath(graph, node, other);
        const pathB = this.hasPath(graph, other, node);
        if (!pathA && !pathB) {
          const sameResource = this.sharesResource(graph, node, other);
          if (!sameResource || maxGroupSize === undefined || group.ids.length < maxGroupSize) {
            group.ids.push(other);
            group.rationale = `Mutually independent steps`;
            assigned.add(other);
          }
        }
      }

      if (group.ids.length > 1) {
        group.resourceEstimate = group.ids.length;
        groups.push(group);
      }
      assigned.add(node);
    }

    // Merge overlapping groups
    return this.mergeOverlapping(groups);
  }

  private hasPath(graph: DependencyGraph, from: string, to: string): boolean {
    const visited = new Set<string>();
    const queue = [from];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const dep of graph.outgoing(current)) queue.push(dep.to);
    }
    return false;
  }

  private sharesResource(graph: DependencyGraph, a: string, b: string): boolean {
    const nodeA = graph.getNode(a);
    const nodeB = graph.getNode(b);
    if (!nodeA || !nodeB) return false;
    const resA = (nodeA as Record<string, unknown>).resourceType as string | undefined;
    const resB = (nodeB as Record<string, unknown>).resourceType as string | undefined;
    return resA !== undefined && resA === resB;
  }

  private mergeOverlapping(groups: parallelGroup[]): parallelGroup[] {
    const merged: parallelGroup[] = [];
    const used = new Set<string>();

    for (let i = 0; i < groups.length; i++) {
      if (used.has(groups[i].ids.join(','))) continue;

      const current = groups[i];
      used.add(current.ids.join(','));

      for (let j = i + 1; j < groups.length; j++) {
        const other = groups[j];
        const intersection = current.ids.filter(id => other.ids.includes(id));
        if (intersection.length > 0) {
          current.ids.push(...other.ids.filter(id => !current.ids.includes(id)));
          current.resourceEstimate = current.ids.length;
          used.add(other.ids.join(','));
        }
      }

      merged.push(current);
    }

    return merged;
  }
}

interface parallelGroup {
  ids: string[];
  rationale: string;
  resourceEstimate: number;
}
```

### 4.3 Resource Leveling

```typescript
interface ResourceLevel {
  resourceType: string;
  capacity: number;
  costPerUnit: number;
}

interface ResourceAllocation {
  stepId: string;
  resourceType: string;
  units: number;
  startTime: number;
  endTime: number;
}

class ResourceLeveler {
  level(
    graph: DependencyGraph,
    resources: ResourceLevel[],
    criticalPath: CriticalPathResult
  ): ResourceAllocation[] {
    const allocations: ResourceAllocation[] = [];
    const resourceUsage = new Map<string, { time: number; used: number }[]>();

    for (const [id, node] of graph.nodes) {
      const resType = (node as Record<string, unknown>).resourceType as string | undefined;
      if (!resType) continue;

      const resource = resources.find(r => r.resourceType === resType);
      if (!resource) continue;

      const estStart = criticalPath.earliestStart.get(id) ?? 0;
      const dur = (node as Record<string, unknown>).duration as number ?? 1;

      // Find earliest available time slot
      let start = estStart;
      const usage = resourceUsage.get(resType) ?? [];

      while (this.usageAtTime(usage, start, dur) >= resource.capacity) {
        start++;
      }

      for (let t = start; t < start + dur; t++) {
        const existing = usage.find(u => u.time === t);
        if (existing) existing.used++;
        else usage.push({ time: t, used: 1 });
      }

      resourceUsage.set(resType, usage);

      allocations.push({
        stepId: id,
        resourceType: resType,
        units: 1,
        startTime: start,
        endTime: start + dur,
      });
    }

    return allocations;
  }

  private usageAtTime(usage: { time: number; used: number }[], start: number, dur: number): number {
    let max = 0;
    for (let t = start; t < start + dur; t++) {
      const u = usage.find(u => u.time === t);
      if (u && u.used > max) max = u.used;
    }
    return max;
  }
}
```

### 4.4 Speedup Estimation

```typescript
class SpeedupEstimator {
  estimate(sequentialDuration: number, parallelGroups: parallelGroup[], overhead: number = 0.1): SpeedupResult {
    const totalParallelDuration = parallelGroups.reduce((sum, g) => Math.max(sum, g.resourceEstimate), 0);
    const estimatedParallel = sequentialDuration / (1 + (totalParallelDuration * overhead));
    const speedup = sequentialDuration / Math.max(1, estimatedParallel);

    return {
      sequentialDuration,
      estimatedParallelDuration: estimatedParallel,
      speedupRatio: speedup,
      amdahlLimit: 1 / (1 - (totalParallelDuration / sequentialDuration)),
      overhead,
    };
  }
}

interface SpeedupResult {
  sequentialDuration: number;
  estimatedParallelDuration: number;
  speedupRatio: number;
  amdahlLimit: number;
  overhead: number;
}
```

---

## 5. ADRs — ALGORITHM SELECTION

### ADR-001: Kahn vs DFS for Topological Sort

| Aspect | Kahn (BFS-based) | DFS-based |
|--------|-----------------|-----------|
| Cycle detection | Built-in (count vs nodes) | Requires explicit visited set |
| Parallelism | Natural level-order | Post-order traversal |
| Memory | O(V) queue | O(V) recursion stack |
| Edge case | Handles disconnected graphs naturally | Requires outer loop for disconnected |
| Stability | Deterministic with FIFO queue | Depends on adjacency order |

**Decision:** Use Kahn's algorithm with FIFO queue. Reason: natural integration with cycle detection, deterministic output, non-recursive (no stack overflow on large graphs).

### ADR-002: Tarjan SCC vs Kosaraju-Sharir for Cycle Detection

| Aspect | Tarjan SCC | Kosaraju-Sharir |
|--------|-----------|-----------------|
| Passes | 1 | 2 (forward + reverse) |
| Space | O(V) aux arrays | O(V) for reverse graph |
| Output | Topological order of SCCs | Condensation DAG built-in |
| Recursion | Deep recursion possible | Two DFS passes |
| Use case | Inline validation | Standalone SCC analysis |

**Decision:** Implement both. Tarjan is default for inline cycle detection (single pass, lower overhead). Kosaraju-Sharir is used for standalone audit (clearer output with condensation DAG).

### ADR-003: CPM for Duration Estimation

**Decision:** Use CPM (Critical Path Method) with both forward and backward passes. Alternatives considered:
- **PERT:** Adds probabilistic weighting — not needed for deterministic task plans.
- **Gantt charting:** Complementary visualization, not a replacement.
- **Monte Carlo simulation:** Reserved for Level 4 probabilistic dependencies.

CPM is chosen for O(V+E) complexity, deterministic output, and slack time calculation which directly feeds parallelization detection.

### ADR-004: Transitive Reduction via Floyd-Warshall vs BFS

**Decision:** Use BFS per node (O(V·(V+E))) rather than Floyd-Warshall (O(V³)). For task plans with V < 500, BFS is faster and simpler. Floyd-Warshall would only be considered for dense graphs with V > 1000.

---

## 6. ANÁLISE PARA IDEIA

### 6.1 Integração

```
PlanningEngine → DependencyAnalyzer.analyze(steps)
                   ↓
             Dependency Graph (DAG)
             ├── Topological Sort (execution order)
             ├── Critical Path (duration)
             ├── Parallel Groups (speedup)
             └── Cycle Detection (validation)
                   ↓
             DynamicReplanner (incremental)
```

### 6.2 Plano

| Componente | Esforço |
|-----------|---------|
| Dependency detection (file/data/decision) | 8h |
| Topological sort (Kahn) | 4h |
| Critical path (CPM) | 6h |
| Parallelization groups | 6h |
| Cycle detection (Tarjan SCC) | 6h |
| Transitive reduction | 4h |

---

## 7. TESTING

### 7.1 Topological Sort Correctness

```typescript
import { TopologicalSorter } from './topological-sorter';
import { DependencyGraph } from './dependency-graph';

describe('TopologicalSorter', () => {
  function makeGraph(edges: [string, string][]): DependencyGraph {
    const g = new DependencyGraph();
    const nodes = new Set(edges.flat());
    for (const n of nodes) g.addNode(n, {});
    for (const [from, to] of edges) g.addEdge(from, to, { type: 'data', weight: 1, optional: false });
    return g;
  }

  it('returns valid topological order for linear chain', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c']]);
    const order = new TopologicalSorter().sort(g);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
    expect(order).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('handles DAG with multiple roots', () => {
    const g = makeGraph([['a', 'c'], ['b', 'c'], ['c', 'd']]);
    const order = new TopologicalSorter().sort(g);
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('c'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'));
  });

  it('throws on cyclic graph', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c'], ['c', 'a']]);
    expect(() => new TopologicalSorter().sort(g)).toThrow();
  });

  it('handles disconnected graph', () => {
    const g = makeGraph([['a', 'b'], ['c', 'd']]);
    const order = new TopologicalSorter().sort(g);
    expect(order.length).toBe(4);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
  });

  it('returns all nodes including isolated ones', () => {
    const g = makeGraph([['a', 'b']]);
    g.addNode('c', {});
    const order = new TopologicalSorter().sort(g);
    expect(order).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(order.length).toBe(3);
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
  });
});
```

### 7.2 Cycle Detection Accuracy

```typescript
import { AdvancedCycleDetector } from './cycle-detector';
import { DependencyGraph } from './dependency-graph';

describe('AdvancedCycleDetector', () => {
  function makeGraph(edges: [string, string][]): DependencyGraph {
    const g = new DependencyGraph();
    const nodes = new Set(edges.flat());
    for (const n of nodes) g.addNode(n, {});
    for (const [from, to] of edges) g.addEdge(from, to, { type: 'data', weight: 1, optional: false });
    return g;
  }

  it('detects simple 2-node cycle', () => {
    const g = makeGraph([['a', 'b'], ['b', 'a']]);
    const detector = new AdvancedCycleDetector(g);
    const sccs = detector.findSCCs();
    expect(sccs.length).toBe(1);
    expect(sccs[0].nodes).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('detects 3-node cycle', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c'], ['c', 'a']]);
    const detector = new AdvancedCycleDetector(g);
    const sccs = detector.findSCCs();
    expect(sccs.length).toBe(1);
    expect(sccs[0].size).toBe(3);
  });

  it('returns empty for DAG', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c'], ['a', 'c']]);
    const detector = new AdvancedCycleDetector(g);
    const sccs = detector.findSCCs();
    expect(sccs.length).toBe(0);
  });

  it('detects multiple disjoint cycles', () => {
    const g = makeGraph([['a', 'b'], ['b', 'a'], ['c', 'd'], ['d', 'c']]);
    const detector = new AdvancedCycleDetector(g);
    const sccs = detector.findSCCs();
    expect(sccs.length).toBe(2);
  });

  it('Kosaraju-Sharir matches Tarjan output', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c'], ['c', 'a'], ['d', 'e'], ['e', 'd']]);
    const detector = new AdvancedCycleDetector(g);
    const tarjanSccs = detector.findSCCs();
    const kosarajuSccs = detector.findSCCsKosaraju();
    expect(tarjanSccs.length).toBe(kosarajuSccs.length);
  });

  it('resolves simple cycle with make_optional', () => {
    const g = makeGraph([['a', 'b'], ['b', 'a']]);
    const detector = new AdvancedCycleDetector(g);
    const sccs = detector.findSCCs();
    const resolution = detector.resolve(sccs[0]);
    expect(resolution.strategy).toBe('make_optional');
    expect(resolution.actions.length).toBeGreaterThan(0);
  });

  it('resolves large cycle with merge_steps', () => {
    const g = makeGraph([
      ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'a'],
    ]);
    const detector = new AdvancedCycleDetector(g);
    const sccs = detector.findSCCs();
    const resolution = detector.resolve(sccs[0]);
    expect(['merge_steps', 'restructure']).toContain(resolution.strategy);
  });
});
```

### 7.3 Critical Path Calculation

```typescript
describe('CriticalPathCalculator', () => {
  function makeWeightedGraph(edges: [string, string, number][]): DependencyGraph {
    const g = new DependencyGraph();
    const nodes = new Set(edges.map(e => [e[0], e[1]]).flat());
    for (const n of nodes) g.addNode(n, { duration: 1 });
    // Set custom durations
    for (const [from, , dur] of edges) {
      g.setNodeDuration(from, dur ?? 1);
    }
    for (const [from, to, dur] of edges) {
      g.addNode(from, { duration: dur ?? 1 });
      g.addNode(to, {});
      g.addEdge(from, to, { type: 'data', weight: 1, optional: false });
    }
    return g;
  }

  it('calculates correct project duration for linear chain', () => {
    const g = makeWeightedGraph([['a', 'b', 1], ['b', 'c', 2]]);
    const result = new CriticalPathCalculator().calculate(g);
    expect(result.projectDuration).toBe(3);
    expect(result.criticalPath).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('identifies correct critical path in branching graph', () => {
    const g = makeWeightedGraph([
      ['start', 'a', 1],
      ['start', 'b', 3],
      ['a', 'end', 1],
      ['b', 'end', 1],
    ]);
    const result = new CriticalPathCalculator().calculate(g);
    // Path start→b→end (5 units) should be critical, not start→a→end (3 units)
    expect(result.criticalPath).toContain('b');
    expect(result.projectDuration).toBe(5);
  });

  it('computes slack correctly', () => {
    const g = makeWeightedGraph([
      ['start', 'fast', 1],
      ['start', 'slow', 5],
      ['fast', 'end', 1],
      ['slow', 'end', 1],
    ]);
    const result = new CriticalPathCalculator().calculate(g);
    // 'fast' path has slack; 'slow' path is critical
    expect(result.slack.get('start')).toBe(0);
    expect(result.slack.get('slow')).toBe(0);
    expect(result.slack.get('fast')).toBeGreaterThan(0);
  });

  it('identifies near-critical paths', () => {
    const g = makeWeightedGraph([
      ['start', 'a', 5],
      ['start', 'b', 4],
      ['a', 'end', 1],
      ['b', 'end', 1],
    ]);
    const result = new CriticalPathCalculator().calculate(g);
    expect(result.nearCritical.length).toBeGreaterThanOrEqual(1);
  });

  it('produces correct gantt chart entries', () => {
    const g = makeWeightedGraph([['a', 'b', 2]]);
    const result = new CriticalPathCalculator().calculate(g);
    expect(result.ganttChart.length).toBe(2);
    expect(result.ganttChart[0].stepId).toBe('a');
    expect(result.ganttChart[0].start).toBe(0);
    expect(result.ganttChart[0].end).toBe(2);
  });
});
```

### 7.4 Transitive Reduction

```typescript
describe('TransitiveReduction', () => {
  it('removes indirect edges', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c'], ['a', 'c']]);
    const reducer = new TransitiveReducer();
    const reduced = reducer.reduce(g);
    expect(reduced.hasEdge('a', 'c')).toBe(false);
    expect(reduced.hasEdge('a', 'b')).toBe(true);
    expect(reduced.hasEdge('b', 'c')).toBe(true);
  });

  it('preserves direct edges in diamond pattern', () => {
    const g = makeGraph([['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]);
    const reducer = new TransitiveReducer();
    const reduced = reducer.reduce(g);
    expect(reduced.hasEdge('a', 'b')).toBe(true);
    expect(reduced.hasEdge('a', 'c')).toBe(true);
    expect(reduced.hasEdge('b', 'd')).toBe(true);
    expect(reduced.hasEdge('c', 'd')).toBe(true);
    // a→d is implied via both paths, so it should NOT exist in original
  });

  it('handles single chain correctly', () => {
    const g = makeGraph([['a', 'b'], ['b', 'c'], ['c', 'd']]);
    const reducer = new TransitiveReducer();
    const reduced = reducer.reduce(g);
    expect(reduced.edgeCount()).toBe(3);
  });
});
```

### 7.5 Integration with PlanningEngine

```typescript
import { PlanningEngine } from '../src/planner';
import { DependencyAnalyzer } from '../src/dependency-analyzer';

describe('DependencyAnalyzer integration with PlanningEngine', () => {
  it('returns correct suggestions for acyclic plan', () => {
    const engine = new PlanningEngine({ autoAnalyzeDependencies: true });
    const plan = engine.createPlan('implement user authentication', 'top_down');
    expect(plan.steps.length).toBeGreaterThan(0);
    // No cycle suggestions should exist for a valid plan
    const analyzer = new DependencyAnalyzer();
    const result = analyzer.analyze(plan.steps);
    expect(result.cycles.length).toBe(0);
    expect(result.suggestions.filter(s => s.includes('Ciclo'))).toHaveLength(0);
  });

  it('rejects plan with cyclic dependencies', () => {
    const steps = [
      makeStep('s1', 'programmer', ['s3']),
      makeStep('s2', 'programmer', ['s1']),
      makeStep('s3', 'programmer', ['s2']),
    ];
    const analyzer = new DependencyAnalyzer();
    const result = analyzer.analyze(steps);
    expect(result.cycles.length).toBeGreaterThanOrEqual(1);
    expect(result.suggestions.some(s => s.includes('Ciclo'))).toBe(true);
  });

  it('feeds critical path into replanning suggestions', () => {
    const steps = [
      makeStep('s1', 'architect', []),
      makeStep('s2', 'programmer', ['s1']),
      makeStep('s3', 'tester', ['s2']),
    ];
    const analyzer = new DependencyAnalyzer();
    const result = analyzer.analyze(steps);
    expect(result.criticalPath.length).toBe(3);
    // Critical path should inform replanning priority
    const engine = new PlanningEngine();
    const plan = engine.createPlan('build feature', 'top_down');
    const replanned = engine.replan(plan.id, plan.steps[0].id);
    expect(replanned.steps.length).toBeGreaterThan(0);
  });
});
```

---

## 8. BENCHMARKING

### 8.1 Performance Benchmarks by Graph Size

```typescript
import { performance } from 'perf_hooks';
import { DependencyGraph } from './dependency-graph';
import { TopologicalSorter } from './topological-sorter';
import { AdvancedCycleDetector } from './cycle-detector';
import { CriticalPathCalculator } from './critical-path';
import { ParallelGroupDetector } from './parallel-groups';
import { TransitiveReducer } from './transitive-reduction';

interface BenchmarkResult {
  algorithm: string;
  graphSize: number;
  edgeDensity: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  samples: number;
}

function generateGraph(nodeCount: number, edgeProbability: number, acyclic: boolean): DependencyGraph {
  const g = new DependencyGraph();
  for (let i = 0; i < nodeCount; i++) {
    g.addNode(`n${i}`, { duration: Math.ceil(Math.random() * 5) });
  }
  for (let i = 0; i < nodeCount; i++) {
    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      if (acyclic && j <= i) continue; // Only forward edges for DAG
      if (Math.random() < edgeProbability) {
        g.addEdge(`n${i}`, `n${j}`, { type: 'data', weight: 1, optional: false });
      }
    }
  }
  return g;
}

function benchmark(
  algorithm: string,
  fn: () => void,
  iterations: number = 50
): Omit<BenchmarkResult, 'graphSize' | 'edgeDensity'> {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    algorithm,
    meanMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: times[0],
    maxMs: times[times.length - 1],
    samples: iterations,
  };
}

function runBenchmarkSuite(): BenchmarkResult[] {
  const sizes = [10, 100, 1000];
  const density = 0.15; // 15% edge probability
  const results: BenchmarkResult[] = [];

  for (const size of sizes) {
    const dag = generateGraph(size, density, true);
    const cyclic = generateGraph(size, density, false);

    // Topological Sort (DAG)
    const sorter = new TopologicalSorter();
    results.push({
      ...benchmark(`TopologicalSort (Kahn)`, () => sorter.sort(dag), 50),
      graphSize: size,
      edgeDensity: density,
    });

    // Tarjan SCC
    const tarjanDetector = new AdvancedCycleDetector(dag);
    results.push({
      ...benchmark(`Tarjan SCC`, () => tarjanDetector.findSCCs(), 50),
      graphSize: size,
      edgeDensity: density,
    });

    // Kosaraju-Sharir SCC
    const kosarajuDetector = new AdvancedCycleDetector(cyclic);
    results.push({
      ...benchmark(`Kosaraju SCC`, () => kosarajuDetector.findSCCsKosaraju(), 50),
      graphSize: size,
      edgeDensity: density,
    });

    // Critical Path
    const cpm = new CriticalPathCalculator();
    results.push({
      ...benchmark(`CriticalPath (CPM)`, () => cpm.calculate(dag), 50),
      graphSize: size,
      edgeDensity: density,
    });

    // Parallel Groups
    const pg = new ParallelGroupDetector();
    results.push({
      ...benchmark(`ParallelGroups`, () => pg.detect(dag), 50),
      graphSize: size,
      edgeDensity: density,
    });

    // Transitive Reduction
    const tr = new TransitiveReducer();
    results.push({
      ...benchmark(`TransitiveReduction`, () => tr.reduce(dag), 30),
      graphSize: size,
      edgeDensity: density,
    });
  }

  return results;
}
```

### 8.2 Expected Results

| Algorithm | N=10 | N=100 | N=1000 |
|-----------|------|-------|--------|
| Topological Sort (Kahn) | <0.5ms | <5ms | <50ms |
| Tarjan SCC | <0.5ms | <5ms | <60ms |
| Kosaraju-Sharir SCC | <0.8ms | <8ms | <90ms |
| Critical Path (CPM) | <1ms | <10ms | <100ms |
| Parallel Groups | <1ms | <15ms | <200ms |
| Transitive Reduction | <2ms | <30ms | <400ms |

**Notes:**
- Benchmarks run on Node.js 20 with --max-old-space-size=4096
- Edge density 15% (sparse graph typical of task plans)
- All algorithms are O(V+E) or O(V·(V+E)) — scale linearly with edges
- Transitive Reduction is the most expensive due to BFS per node
- For task plans under 500 nodes, all operations complete in <150ms
- Memory usage stays under 50MB even for 1000-node graphs

### 8.3 Benchmark Runner CLI

```typescript
async function main() {
  const results = runBenchmarkSuite();
  console.table(results, ['algorithm', 'graphSize', 'meanMs', 'minMs', 'maxMs']);

  const failed = results.filter(r => {
    const thresholds: Record<string, number> = {
      'TopologicalSort (Kahn)': 100,
      'Tarjan SCC': 120,
      'Kosaraju SCC': 180,
      'CriticalPath (CPM)': 200,
      'ParallelGroups': 400,
      'TransitiveReduction': 800,
    };
    return r.meanMs > (thresholds[r.algorithm] ?? Infinity);
  });

  if (failed.length > 0) {
    console.error('PERFORMANCE BENCHMARK FAILED:');
    for (const f of failed) {
      console.error(`  ${f.algorithm} (N=${f.graphSize}): ${f.meanMs.toFixed(2)}ms exceeds threshold`);
    }
    process.exit(1);
  }

  console.log('All benchmarks passed ✓');
}
```

---

## 9. INTEGRATION WITH PLANNINGENGINE

### 9.1 Enhanced DependencyAnalyzer Feeding PlanningEngine

```typescript
import { PlanningEngine, PlanningEngineConfig } from './planner';
import { PlannedStep, Plan } from './types';
import { DependencyGraph } from './dependency-graph';
import { AdvancedCycleDetector, CycleResolution } from './cycle-detector';
import { CriticalPathCalculator, CriticalPathResult } from './critical-path';
import { ParallelGroupDetector, parallelGroup } from './parallel-groups';
import { CompositeGraphBuilder } from './graph-builder';
import { TopologicalSorter } from './topological-sorter';
import { DynamicReplanner } from './replanner';

export interface EnhancedAnalysis {
  graph: DependencyGraph;
  topology: string[];
  criticalPath: CriticalPathResult;
  parallelGroups: parallelGroup[];
  cycles: CycleResolution[];
  unresolvedCycles: string[][];
  transitiveReduction: DependencyGraph;
}

export class EnhancedDependencyAnalyzer {
  private topoSort = new TopologicalSorter();
  private criticalPathCalc = new CriticalPathCalculator();
  private parallelDetector = new ParallelGroupDetector();
  private graphBuilder = new CompositeGraphBuilder();

  analyzePlan(plan: Plan): EnhancedAnalysis {
    const graph = this.buildGraphFromPlan(plan);

    // 1. Topological sort (execution order)
    const topology = this.topoSort.sort(graph);

    // 2. Critical path (duration estimation)
    const criticalPath = this.criticalPathCalc.calculate(graph);

    // 3. Parallel groups (speedup)
    const parallelGroups = this.parallelDetector.detect(graph);

    // 4. Cycle detection with resolution
    const cycleDetector = new AdvancedCycleDetector(graph);
    const sccs = cycleDetector.findSCCs();
    const { resolved, unresolved } = cycleDetector.resolveAll(sccs);

    // 5. Transitive reduction (cleanup)
    const reducer = new TransitiveReducer();
    const transitiveReduction = reducer.reduce(graph);

    return {
      graph,
      topology,
      criticalPath,
      parallelGroups,
      cycles: resolved,
      unresolvedCycles: unresolved.map(scc => scc.nodes),
      transitiveReduction,
    };
  }

  private buildGraphFromPlan(plan: Plan): DependencyGraph {
    const graph = new DependencyGraph();

    for (const step of plan.steps) {
      graph.addNode(step.id, {
        duration: step.cost.estimatedSeconds,
        agentRole: step.agentRole,
        tags: step.tags,
        resourceType: step.agentRole,
      });
    }

    for (const step of plan.steps) {
      for (const dep of step.dependencies) {
        if (dep.type === 'requires' || dep.type === 'blocked_by') {
          graph.addEdge(dep.stepId, step.id, {
            type: 'data',
            weight: dep.type === 'blocked_by' ? 10 : 7,
            optional: dep.type === 'optional',
          });
        }
        if (dep.type === 'parallel_with') {
          graph.addEdge(step.id, dep.stepId, {
            type: 'temporal',
            weight: 1,
            optional: true,
          });
        }
      }
    }

    return graph;
  }
}
```

### 9.2 Replanning with Critical Path Awareness

```typescript
export class CriticalPathAwareReplanner {
  private enhancedAnalyzer: EnhancedDependencyAnalyzer;
  private baseReplanner: DynamicReplanner;

  constructor() {
    this.enhancedAnalyzer = new EnhancedDependencyAnalyzer();
    this.baseReplanner = new DynamicReplanner();
  }

  replanWithPriority(plan: Plan, failedStepId: string): Plan {
    const analysis = this.enhancedAnalyzer.analyzePlan(plan);

    // Identify if failed step is on critical path
    const isOnCriticalPath = analysis.criticalPath.criticalPath.includes(failedStepId);
    const slackForStep = analysis.criticalPath.slack.get(failedStepId) ?? 0;

    // Reorder remaining steps: critical path first
    const remainingSteps = plan.steps.filter(s =>
      plan.steps.indexOf(s) >= plan.steps.findIndex(ps => ps.id === failedStepId)
    );

    const sortedRemaining = this.prioritizeByCriticalPath(remainingSteps, analysis);

    // Apply replanning with awareness
    const newSteps = this.baseReplanner.replanAfterFailure(
      plan.steps.find(s => s.id === failedStepId)!,
      sortedRemaining,
      plan.goal,
    );

    plan.steps = [
      ...plan.steps.slice(0, plan.steps.findIndex(s => s.id === failedStepId)),
      ...newSteps,
    ];

    plan.metadata = {
      ...plan.metadata,
      criticalPathAware: true,
      wasOnCriticalPath: isOnCriticalPath,
      slackAtFailure: slackForStep,
      parallelGroupsRecommended: analysis.parallelGroups.map(g => g.ids),
    };

    return plan;
  }

  private prioritizeByCriticalPath(
    steps: PlannedStep[],
    analysis: EnhancedAnalysis
  ): PlannedStep[] {
    const criticalSet = new Set(analysis.criticalPath.criticalPath);
    const critical = steps.filter(s => criticalSet.has(s.id));
    const nonCritical = steps.filter(s => !criticalSet.has(s.id));
    return [...critical, ...nonCritical];
  }
}
```

### 9.3 Parallel Execution Pipeline

```typescript
interface ParallelExecutionGroup {
  groupId: number;
  stepIds: string[];
  expectedDuration: number;
}

class ParallelExecutionPlanner {
  private analyzer: EnhancedDependencyAnalyzer;

  constructor() {
    this.analyzer = new EnhancedDependencyAnalyzer();
  }

  planExecution(plan: Plan): ParallelExecutionGroup[] {
    const analysis = this.analyzer.analyzePlan(plan);
    const groups: ParallelExecutionGroup[] = [];
    const assigned = new Set<string>();
    let groupId = 0;

    // Level-based grouping: find all nodes at same depth
    const depth = new Map<string, number>();
    for (const node of analysis.topology) {
      const predDepths = analysis.graph.incoming(node).map(d => depth.get(d.from) ?? 0);
      depth.set(node, predDepths.length > 0 ? Math.max(...predDepths) + 1 : 0);
    }

    // Group by depth level for parallel execution
    const byDepth = new Map<number, string[]>();
    for (const [node, d] of depth) {
      const existing = byDepth.get(d) ?? [];
      existing.push(node);
      byDepth.set(d, existing);
    }

    for (const [d, nodes] of byDepth) {
      if (nodes.length > 1) {
        groups.push({
          groupId: groupId++,
          stepIds: nodes,
          expectedDuration: Math.max(
            ...nodes.map(n => plan.steps.find(s => s.id === n)?.cost.estimatedSeconds ?? 0),
          ),
        });
      }
      for (const node of nodes) assigned.add(node);
    }

    return groups;
  }
}
```

### 9.4 Complete Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      PLANNING ENGINE                             │
│                                                                  │
│  createPlan(goal) ──→ AdaptiveDecomposer                         │
│                           │                                      │
│                           ▼                                      │
│                    Step list (raw)                                │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              ENHANCED DEPENDENCY ANALYZER               │      │
│  │                                                         │      │
│  │  CompositeGraphBuilder ──→ FileImportGraphBuilder       │      │
│  │                           PackageGraphBuilder            │      │
│  │                           CallGraphBuilder               │      │
│  │                                                         │      │
│  │           ▼                                              │      │
│  │  Merged DependencyGraph                                  │      │
│  │         │                                                │      │
│  │         ├──→ TopologicalSorter (Kahn) → execution order  │      │
│  │         ├──→ CriticalPathCalculator (CPM) → duration     │      │
│  │         ├──→ ParallelGroupDetector → speedup groups      │      │
│  │         ├──→ AdvancedCycleDetector (Tarjan) → cycles     │      │
│  │         └──→ TransitiveReducer → clean graph             │      │
│  │                                                         │      │
│  └────────────────────────────────────────────────────────┘      │
│                           │                                      │
│                           ▼                                      │
│                    EnhancedAnalysis                              │
│         ┌─────────────┼──────────────┐                          │
│         ▼             ▼              ▼                           │
│  CriticalPathAware  ParallelExec   BaseReplanner                │
│  Replanner          Planner         (fallback)                   │
│         │             │              │                           │
│         └─────────────┴──────────────┘                           │
│                           │                                      │
│                           ▼                                      │
│                    Final Plan with:                               │
│                    ├── Execution order (topological)              │
│                    ├── Duration estimate (critical path)          │
│                    ├── Parallel groups (speedup)                 │
│                    └── Cycle-free (validated)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.5 Integration Configuration

```typescript
interface DependencyAnalyzerConfig {
  enableFileAnalysis: boolean;
  enablePackageAnalysis: boolean;
  enableCallGraphAnalysis: boolean;
  enableTransitiveReduction: boolean;
  cycleResolutionStrategy: 'auto' | 'manual' | 'block';
  parallelizationThreshold: number; // Minimum group size for parallel suggestion
  benchmarkThresholdMs: number; // Warn if analysis takes longer than this
}

const DEFAULT_ANALYZER_CONFIG: DependencyAnalyzerConfig = {
  enableFileAnalysis: true,
  enablePackageAnalysis: true,
  enableCallGraphAnalysis: false, // Expensive, opt-in
  enableTransitiveReduction: true,
  cycleResolutionStrategy: 'auto',
  parallelizationThreshold: 2,
  benchmarkThresholdMs: 200,
};

export function configurePlanningEngineWithDependencies(
  engineConfig?: Partial<PlanningEngineConfig>,
  analyzerConfig?: Partial<DependencyAnalyzerConfig>,
): { engine: PlanningEngine; analyzer: EnhancedDependencyAnalyzer; config: DependencyAnalyzerConfig } {
  const engine = new PlanningEngine(engineConfig);
  const analyzer = new EnhancedDependencyAnalyzer();
  const config = { ...DEFAULT_ANALYZER_CONFIG, ...analyzerConfig };

  // Wire analyzer results into engine's metadata pipeline
  const originalCreatePlan = engine.createPlan.bind(engine);
  engine.createPlan = (goal: string, strategy?: import('./types').DecompositionStrategy): Plan => {
    const plan = originalCreatePlan(goal, strategy);
    const analysis = analyzer.analyzePlan(plan);

    plan.metadata = {
      ...plan.metadata,
      dependencyAnalysis: {
        nodeCount: analysis.graph.nodes.size,
        edgeCount: analysis.graph.edgeCount(),
        hasCycles: analysis.cycles.length > 0,
        criticalPath: analysis.criticalPath.criticalPath,
        projectDuration: analysis.criticalPath.projectDuration,
        parallelGroups: analysis.parallelGroups.map(g => g.ids),
        nearCriticalSteps: analysis.criticalPath.nearCritical,
      },
    };

    return plan;
  };

  return { engine, analyzer, config };
}
```

---

## Referências

1. "Introduction to Algorithms" — CLRS, Cap. 22 (Graph Algorithms), Cap. 24 (Shortest Paths)
2. "Critical Path Method" — Kelley & Walker, 1959
3. "Tarjan's SCC Algorithm" — R. Tarjan, "Depth-first search and linear graph algorithms", 1972
4. "Kosaraju-Sharir SCC Algorithm" — S. R. Kosaraju, 1978; M. Sharir, 1981
5. "PERT and CPM" — Project Management Institute, PMBOK Guide, 7th Ed.
6. "Transitive Reduction" — A. V. Aho, M. R. Garey, J. D. Ullman, "The Transitive Reduction of a Directed Graph", 1972
7. "Amdahl's Law" — G. Amdahl, "Validity of the single processor approach to achieving large-scale computing capabilities", 1967
8. ESTUDO-PLANNING-ENGINE-AVANCADO.md — Seções 1.4 (Dependency Detection), 2.3 (Replanning)
9. `packages/planning-engine/src/dependency-analyzer.ts` — Implementação atual no código
10. `packages/planning-engine/src/planner.ts` — PlanningEngine com injeção de dependência

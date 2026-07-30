import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { createLogger } from '@ideia/logger';
import { join, resolve } from 'path';
const logger = createLogger('dependency-graph');

export interface DependencyNode {
  id: string;
  type: 'package' | 'module' | 'task' | 'service' | 'interface';
  name: string;
  version?: string;
  metadata?: Record<string, string>;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'imports' | 'extends' | 'implements' | 'uses' | 'calls';
  weight: number;
  optional: boolean;
}

export interface PackageDependency {
  name: string;
  version: string;
  isDev: boolean;
}

export interface BuildGraphResult {
  graph: DependencyGraph;
  packages: PackageDependency[];
  errors: string[];
}

export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private adjacency: Map<string, DependencyEdge[]> = new Map();

  addNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  addEdge(edge: DependencyEdge): void {
    if (!this.nodes.has(edge.from)) {
      throw new Error(`Node '${edge.from}' does not exist in graph`);
    }
    if (!this.nodes.has(edge.to)) {
      throw new Error(`Node '${edge.to}' does not exist in graph`);
    }
    const edges = this.adjacency.get(edge.from);
    if (edges) {
      edges.push(edge);
    }
  }

  getNode(id: string): DependencyNode | undefined {
    return this.nodes.get(id);
  }

  getDependencies(id: string): DependencyEdge[] {
    return this.adjacency.get(id) ?? [];
  }

  getDependents(id: string): DependencyEdge[] {
    const result: DependencyEdge[] = [];
    for (const [, edges] of this.adjacency) {
      for (const edge of edges) {
        if (edge.to === id) {
          result.push(edge);
        }
      }
    }
    return result;
  }

  getAllNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): DependencyEdge[] {
    const result: DependencyEdge[] = [];
    for (const [, edges] of this.adjacency) {
      for (const edge of edges) {
        result.push(edge);
      }
    }
    return result;
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    this.adjacency.delete(id);
    for (const [, edges] of this.adjacency) {
      const remaining: DependencyEdge[] = [];
      for (const edge of edges) {
        if (edge.to !== id) {
          remaining.push(edge);
        }
      }
      edges.length = 0;
      for (const e of remaining) {
        edges.push(e);
      }
    }
  }

  buildDependencyGraph(projectDir?: string): BuildGraphResult {
    const dir = resolve(projectDir ?? process.cwd());
    const errors: string[] = [];
    const packages: PackageDependency[] = [];
    const graph = new DependencyGraph();

    const scanPackages = (scanDir: string): void => {
      if (!existsSync(scanDir)) return;
      const entries = readdirSync(scanDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgDir = join(scanDir, entry.name);
        const pkgJsonPath = join(pkgDir, 'package.json');
        if (!existsSync(pkgJsonPath)) continue;
        try {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as {
            name?: string;
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
          };
          const pkgName = pkg.name ?? entry.name;
          graph.addNode({
            id: pkgName,
            type: 'package',
            name: pkgName,
            version: pkgJsonPath,
          });

          const processDeps = (deps: Record<string, string> | undefined, isDev: boolean) => {
            if (!deps) return;
            for (const [depName, depVersion] of Object.entries(deps)) {
              packages.push({ name: depName, version: depVersion, isDev });
              if (!graph.getNode(depName)) {
                graph.addNode({
                  id: depName,
                  type: 'package',
                  name: depName,
                });
              }
              graph.addEdge({
                from: pkgName,
                to: depName,
                type: 'imports',
                weight: 1,
                optional: isDev,
              });
            }
          };
          processDeps(pkg.dependencies, false);
          processDeps(pkg.devDependencies, true);
        } catch (_err) {
          errors.push(`Failed to parse ${pkgJsonPath}: ${_err}`);
        }
      }
    };

    scanPackages(dir);
    const packagesDir = join(dir, 'packages');
    if (existsSync(packagesDir)) scanPackages(packagesDir);

    return { graph, packages, errors };
  }

  clear(): void {
    this.nodes.clear();
    this.adjacency.clear();
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getEdgeCount(): number {
    let count = 0;
    for (const [, edges] of this.adjacency) {
      count += edges.length;
    }
    return count;
  }
}

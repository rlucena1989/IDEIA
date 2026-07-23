import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

interface Edge {
  from: string;
  to: string;
  file?: string;
}

function getInternalImports(dir: string): string[] {
  const result: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== 'dist') {
        result.push(...getInternalImports(full));
      } else if (entry.name.endsWith('.ts')) {
        const content = readFileSync(full, 'utf8');
        const imports = content.matchAll(/from ['"]@ai-devkit\/([^'"]+)['"]/g);
        for (const m of imports) {
          result.push(m[1]!);
        }
      }
    }
  } catch {}
  return result;
}

function hasCycle(graph: Map<string, Set<string>>): string | null {
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (dfs(neighbor)) return true;
    }
    stack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (dfs(node)) return node;
  }
  return null;
}

function main(): void {
  const graph = new Map<string, Set<string>>();
  const dirs = readdirSync(PACKAGES);

  for (const dir of dirs) {
    const srcDir = join(PACKAGES, dir, 'src');
    if (!existsSync(srcDir)) continue;
    const imports = getInternalImports(srcDir);
    if (!graph.has(dir)) graph.set(dir, new Set());
    for (const imp of imports) {
      graph.get(dir)!.add(imp);
    }
  }

  // Check each node
  const cyclic = new Set<string>();
  for (const node of graph.keys()) {
    const subGraph = new Map<string, Set<string>>();
    for (const [k, v] of graph) {
      subGraph.set(k, new Set(v));
    }
    const cycle = hasCycle(subGraph);
    if (cycle) cyclic.add(cycle);
  }

  console.log(`\n# Circular Dependencies Check`);
  console.log(`**Packages:** ${dirs.length}`);
  console.log(`**Cycles found:** ${cyclic.size}\n`);

  if (cyclic.size > 0) {
    console.log('## Cycles\n');
    for (const c of cyclic) {
      console.log(`- ${c} (cycle detected)`);
    }
  } else {
    console.log('✅ No circular dependencies detected');
  }
}

main();

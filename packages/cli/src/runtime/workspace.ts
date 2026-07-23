import fs from 'node:fs';
import path from 'node:path';
import { indexWorkspace, SymbolEntry } from './ast-indexer';

/** Interface que define a estrutura de shard. */
export interface Shard {
  id: string;
  name: string;
  files: string[];
  symbolCount: number;
  estimatedTokens: number;
}

/** Interface que define a estrutura de shard plan. */
export interface ShardPlan {
  shards: Shard[];
  totalFiles: number;
  totalSymbols: number;
}

const SHARD_SIZE_TOKENS = 8000;
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

import { estimateTokens } from './context-store';

function getPackageName(rootDir: string, dir: string): string | null {
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).name || null;
    } catch { return null; }
  }
  return null;
}

/**
 * Processa shards.
 * @param rootDir - Valor dir.
 * @param maxTokensPerShard - Valor tokens per shard.
 * @returns O resultado da operação.
 */
export function planShards(rootDir: string, maxTokensPerShard: number = SHARD_SIZE_TOKENS): ShardPlan {
  const shards: Shard[] = [];
  const packages: Array<{ name: string; dir: string; files: string[] }> = [];

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });

  const packagesDir = path.join(rootDir, 'packages');
  if (fs.existsSync(packagesDir)) {
    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const pkgDir = path.join(packagesDir, entry.name);
        const name = getPackageName(rootDir, pkgDir) || entry.name;
        const files: string[] = [];
        const walk = (dir: string, depth = 0): void => {
          if (depth > 5) return;
          try {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
              if (IGNORE_DIRS.has(e.name) || e.name.startsWith('.')) continue;
              const full = path.join(dir, e.name);
              if (e.isDirectory()) walk(full, depth + 1);
              else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx') || e.name.endsWith('.js')) {
                files.push(full);
              }
            }
          } catch { /* skip */ }
        };
        walk(pkgDir);
        packages.push({ name, dir: pkgDir, files });
      }
    }
  }

  const otherFiles: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      otherFiles.push(path.join(rootDir, entry.name));
    }
  }

  let shardId = 0;
  for (const pkg of packages) {
    let currentShard: string[] = [];
    let currentTokens = 0;

    const flushShard = (name: string) => {
      if (currentShard.length === 0) return;
      const content = currentShard.map(f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
      shards.push({
        id: `shard-${++shardId}`,
        name,
        files: [...currentShard],
        symbolCount: 0,
        estimatedTokens: estimateTokens(content),
      });
      currentShard = [];
      currentTokens = 0;
    };

    for (const file of pkg.files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const tokens = estimateTokens(content);
        if (currentTokens + tokens > maxTokensPerShard && currentShard.length > 0) {
          flushShard(pkg.name);
        }
        currentShard.push(file);
        currentTokens += tokens;
      } catch { /* skip */ }
    }
    flushShard(pkg.name);
  }

  if (otherFiles.length > 0) {
    shards.push({
      id: `shard-${++shardId}`,
      name: 'root',
      files: otherFiles,
      symbolCount: 0,
      estimatedTokens: estimateTokens(otherFiles.map(f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n')),
    });
  }

  const index = indexWorkspace(rootDir);
  for (const shard of shards) {
    shard.symbolCount = index.symbols.filter(s =>
      shard.files.some(f => s.file === path.relative(rootDir, f))
    ).length;
  }

  return {
    shards,
    totalFiles: shards.reduce((a, s) => a + s.files.length, 0),
    totalSymbols: shards.reduce((a, s) => a + s.symbolCount, 0),
  };
}

/**
 * Obtém shard summary.
 * @param plan - Valor plan.
 * @returns O resultado da operação.
 */
export function getShardSummary(plan: ShardPlan): string {
  const lines = [`Workspace Shards: ${plan.shards.length}`, `Total files: ${plan.totalFiles}`, `Total symbols: ${plan.totalSymbols}`, ''];
  for (const shard of plan.shards) {
    lines.push(`  ${shard.id} (${shard.name}): ${shard.files.length} files, ${shard.symbolCount} symbols, ~${shard.estimatedTokens} tokens`);
  }
  return lines.join('\n');
}

/**
 * Verifica se mono repo.
 * @param rootDir - Valor dir.
 * @returns O resultado da operação.
 */
export function isMonoRepo(rootDir: string): boolean {
  return fs.existsSync(path.join(rootDir, 'packages')) ||
    fs.existsSync(path.join(rootDir, 'lerna.json')) ||
    fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'));
}

/**
 * Detecta package manager.
 * @param rootDir - Valor dir.
 * @returns O resultado da operação.
 */
export function detectPackageManager(rootDir: string): string {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(rootDir, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(rootDir, 'nx.json'))) return 'nx';
  if (fs.existsSync(path.join(rootDir, 'lerna.json'))) return 'lerna';
  return 'unknown';
}

export { indexWorkspace } from './ast-indexer';

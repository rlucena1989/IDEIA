import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { printLine } from './output';
import { getIO } from '../io';

const _CACHE_FILE = '.ai/cache/warm-start.json';

interface CacheEntry {
  key: string;
  data: unknown;
  ttlMs: number;
  createdAt: string;
}

/** Classe responsável por processa start cache. */
export class WarmStartCache {
  private cacheDir: string;
  private cache: Map<string, CacheEntry>;

  constructor(root?: string) {
    this.cacheDir = path.resolve(root || process.cwd(), '.ai/cache');
    this.cache = new Map();
    this.load();
  }

  private cachePath(): string {
    return path.join(this.cacheDir, 'warm-start.json');
  }

  private load(): void {
    try {
      const cp = this.cachePath();
      if (fs.existsSync(cp)) {
        const raw: Record<string, CacheEntry> = JSON.parse(fs.readFileSync(cp, 'utf8'));
        for (const [key, entry] of Object.entries(raw)) {
          const elapsed = Date.now() - new Date(entry.createdAt).getTime();
          if (elapsed < entry.ttlMs) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch { /* corrupted cache — reset */ }
  }

  private save(): void {
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      const obj: Record<string, CacheEntry> = {};
      for (const [key, entry] of this.cache.entries()) {
        obj[key] = entry;
      }
      fs.writeFileSync(this.cachePath(), JSON.stringify(obj, null, 2), 'utf8');
    } catch { /* silent */ }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data as T;
  }

  set(key: string, data: unknown, ttlMs = 300_000): void {
    this.cache.set(key, { key, data, ttlMs, createdAt: new Date().toISOString() });
    this.save();
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.save();
  }

  clear(): void {
    this.cache.clear();
    try { fs.rmSync(this.cachePath(), { force: true }); } catch { /* ignore */ }
  }

  stats(): { entries: number; sizeEstimateKb: number } {
    let sizeEstimateKb = 0;
    try {
      const cp = this.cachePath();
      if (fs.existsSync(cp)) {
        sizeEstimateKb = Math.round(fs.statSync(cp).size / 1024 * 10) / 10;
      }
    } catch { /* ignore */ }
    return { entries: this.cache.size, sizeEstimateKb };
  }
}

/**
 * Processa cache.
 * @param key - Valor key.
 * @param fn - Valor fn.
 * @param ttlMs - Valor ms.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function withCache<T>(key: string, fn: () => T, ttlMs = 300_000, root?: string): T {
  const cache = new WarmStartCache(root);
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  const result = fn();
  cache.set(key, result, ttlMs);
  return result;
}

function _parseArgs(): { command?: string; subcommand?: string } {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const sub = args[1] && !args[1]!.startsWith('-') ? args[1] : undefined;
  return { command: cmd, subcommand: sub };
}

/** Processa common commands. */
export function prewarmCommonCommands(): void {
  const cache = new WarmStartCache();

  // Phase 1: eager load IO (always needed)
  getIO();

  // Phase 2: common configs and manifests
  const root = process.cwd();

  const configPaths = [
    '.ai/config/registry.json',
    '.ai/config/ai-devkit.json',
    '.ai/config/settings.json',
  ];

  for (const p of configPaths) {
    const fullPath = path.join(root, p);
    if (!cache.get(`file:${p}`)) {
      try {
        if (fs.existsSync(fullPath)) {
          cache.set(`file:${p}`, JSON.parse(fs.readFileSync(fullPath, 'utf8')), 60_000);
        }
      } catch { /* ignore */ }
    }
  }

  // Phase 3: pre-warm project manifest
  const pkgPath = path.join(root, 'package.json');
  if (!cache.get('project:package.json') && fs.existsSync(pkgPath)) {
    try {
      cache.set('project:package.json', JSON.parse(fs.readFileSync(pkgPath, 'utf8')), 600_000);
    } catch { /* ignore */ }
  }
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function cacheCommand(): Command {
  const cmd = new Command('cache')
    .description('Gerenciar cache de warm-start');

  cmd
    .command('clear')
    .description('Limpa o cache de warm-start')
    .action(() => {
      const c = new WarmStartCache();
      c.clear();
      printLine('Cache limpo.');
    });

  cmd
    .command('stats')
    .description('Estatisticas do cache')
    .action(() => {
      const c = new WarmStartCache();
      const s = c.stats();
      printLine(`Entradas: ${s.entries}`);
      printLine(`Tamanho estimado: ${s.sizeEstimateKb}kb`);
    });

  return cmd;
}
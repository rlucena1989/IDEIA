import fs from 'node:fs';
import path from 'node:path';
import { indexWorkspace, SymbolEntry, querySymbols } from './ast-indexer';

/** Interface que define a estrutura de context report. */
export interface ContextReport {
  totalFiles: number;
  totalSymbols: number;
  languages: string[];
  topModules: Array<{ path: string; symbolCount: number }>;
  recentChanges: Array<{ file: string; timestamp: string }>;
  exports: number;
}

/** Interface que define a estrutura de module focus. */
export interface ModuleFocus {
  path: string;
  symbols: SymbolEntry[];
  dependencies: string[];
}

/**
 * Gera context report.
 * @param rootDir - Valor dir.
 * @returns O resultado da operação.
 */
export function generateContextReport(rootDir: string): ContextReport {
  const index = indexWorkspace(rootDir);

  const langCount = new Map<string, number>();
  for (const s of index.symbols) {
    langCount.set(s.language, (langCount.get(s.language) || 0) + 1);
  }

  const moduleCount = new Map<string, number>();
  for (const s of index.symbols) {
    const dir = path.dirname(s.file);
    moduleCount.set(dir, (moduleCount.get(dir) || 0) + 1);
  }

  const topModules = [...moduleCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([p, c]) => ({ path: p, symbolCount: c }));

  const totalExports = index.symbols.filter(s => s.exported).length;

  const gitDir = path.join(rootDir, '.git');
  const recentChanges: Array<{ file: string; timestamp: string }> = [];
  if (fs.existsSync(gitDir)) {
    try {
      const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
      if (head.startsWith('ref: ')) {
        const refPath = path.join(gitDir, head.slice(5));
        if (fs.existsSync(refPath)) {
          const lines = fs.readFileSync(refPath, 'utf8').split('\n').filter(Boolean).slice(-10);
          for (const line of lines) {
            if (line.length > 40) {
              recentChanges.push({ file: line.substring(41), timestamp: new Date().toISOString() });
            }
          }
        }
      }
    } catch { /* not a git repo */ }
  }

  return {
    totalFiles: index.filesScanned,
    totalSymbols: index.symbols.length,
    languages: [...langCount.keys()],
    topModules,
    recentChanges,
    exports: totalExports,
  };
}

/**
 * Processa module.
 * @param rootDir - Valor dir.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function focusModule(rootDir: string, modulePath: string): ModuleFocus {
  const index = indexWorkspace(rootDir);
  const normalized = modulePath.replace(/\\/g, '/');

  const symbols = index.symbols.filter(s =>
    s.file.startsWith(normalized) || s.file.includes(normalized)
  );

  const dependencies: string[] = [];
  const importRegex = /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
  const targetDir = path.join(rootDir, normalized);

  if (fs.existsSync(targetDir)) {
    try {
      const allEntries = fs.readdirSync(targetDir, { recursive: true }) as string[];
      for (const entry of allEntries) {
        const fullPath = path.join(targetDir, entry);
        if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          let match: RegExpExecArray | null;
          while ((match = importRegex.exec(content)) !== null) {
            const dep = match[1] || match[2];
            if (dep && !dep.startsWith('.') && !dependencies.includes(dep)) {
              dependencies.push(dep);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  return { path: normalized, symbols, dependencies };
}

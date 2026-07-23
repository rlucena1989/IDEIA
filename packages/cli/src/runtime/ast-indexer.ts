import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de symbol entry. */
export interface SymbolEntry {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'enum' | 'const' | 'component';
  file: string;
  line: number;
  language: string;
  exported: boolean;
}

/** Interface que define a estrutura de index result. */
export interface IndexResult {
  symbols: SymbolEntry[];
  filesScanned: number;
  durationMs: number;
  errors: string[];
}

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '__tests__', '__mocks__', '.next', 'build']);

const PATTERNS: Record<string, Array<{ type: SymbolEntry['type']; regex: RegExp }>> = {
  typescript: [
    { type: 'class', regex: /^export\s+(abstract\s+)?class\s+(\w+)/gm },
    { type: 'function', regex: /^export\s+(async\s+)?function\s+(\w+)/gm },
    { type: 'interface', regex: /^export\s+interface\s+(\w+)/gm },
    { type: 'type', regex: /^export\s+type\s+(\w+)/gm },
    { type: 'enum', regex: /^export\s+enum\s+(\w+)/gm },
    { type: 'const', regex: /^export\s+(const|let|var)\s+(\w+)\s*[=:]/gm },
    { type: 'function', regex: /^export\s+default\s+(async\s+)?function\s+(\w+)/gm },
    { type: 'component', regex: /^export\s+function\s+(\w+)(?:\s*<[^>]*>)?\s*\([^)]*\)\s*:\s*(JSX|React)/gm },
  ],
  python: [
    { type: 'class', regex: /^class\s+(\w+)/gm },
    { type: 'function', regex: /^async\s+def\s+(\w+)|^def\s+(\w+)/gm },
  ],
  go: [
    { type: 'function', regex: /^func\s+(\w+)/gm },
    { type: 'type', regex: /^type\s+(\w+)/gm },
  ],
  java: [
    { type: 'class', regex: /^public\s+(abstract\s+)?class\s+(\w+)/gm },
    { type: 'interface', regex: /^public\s+interface\s+(\w+)/gm },
    { type: 'enum', regex: /^public\s+enum\s+(\w+)/gm },
  ],
};

function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath);
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript', '.js': 'typescript', '.jsx': 'typescript',
    '.py': 'python', '.go': 'go', '.java': 'java', '.kt': 'java', '.scala': 'java',
  };
  return map[ext] || null;
}

function scanFile(filePath: string, baseDir: string): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];
  const lang = detectLanguage(filePath);
  if (!lang || !PATTERNS[lang]) return symbols;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(baseDir, filePath);

    for (const pattern of PATTERNS[lang]) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content)) !== null) {
        const name = match[2] || match[1];
        if (!name) continue;
        const line = content.substring(0, match.index).split('\n').length;
        const exported = match[0]!.startsWith('export');
        symbols.push({ name, type: pattern.type, file: relativePath, line, language: lang, exported });
      }
    }
  } catch { /* skip unreadable files */ }

  return symbols;
}

/**
 * Processa workspace.
 * @param rootDir - Valor dir.
 * @returns O resultado da operação.
 */
export function indexWorkspace(rootDir: string): IndexResult {
  const start = Date.now();
  const allSymbols: SymbolEntry[] = [];
  const errors: string[] = [];
  let filesScanned = 0;

  function walk(dir: string, depth = 0) {
    if (depth > 8) return;
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, depth + 1);
        else if (entry.isFile()) {
          filesScanned++;
          try { allSymbols.push(...scanFile(full, rootDir)); }
          catch (_e) { errors.push(`${full}: ${e}`); }
        }
      }
    } catch { /* skip */ }
  }

  walk(rootDir);

  return { symbols: allSymbols, filesScanned, durationMs: Date.now() - start, errors };
}

/**
 * Consulta symbols.
 * @param index - Valor index.
 * @param query - Consulta query.
 * @returns O resultado da operação.
 */
export function querySymbols(index: SymbolEntry[], query: string): SymbolEntry[] {
  const q = query.toLowerCase();
  return index.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.file.toLowerCase().includes(q) ||
    s.type.toLowerCase().includes(q)
  );
}

/**
 * Obtém exports.
 * @param index - Valor index.
 * @returns O resultado da operação.
 */
export function getExports(index: SymbolEntry[]): SymbolEntry[] {
  return index.filter(s => s.exported);
}

/**
 * Processa to j s o n.
 * @param index - Valor index.
 * @returns O resultado da operação.
 */
export function indexToJSON(index: SymbolEntry[]): string {
  return JSON.stringify(index, null, 2);
}

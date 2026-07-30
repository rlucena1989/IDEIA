import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DirPattern, NamingConvention, ComponentPattern, CommitPattern, TestPattern, ApiPattern, RepoPatterns, ScanOptions } from './pattern-types';

function collectDirs(rootDir: string, maxDepth: number): DirPattern[] {
  const dirs: DirPattern[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const subDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules');
      const files = entries.filter(e => e.isFile());
      if (files.length > 0 || subDirs.length > 0) {
        const names = files.map(f => f.name);
        dirs.push({ path: path.relative(rootDir, dir) || '.', depth, childCount: files.length + subDirs.length, namingConvention: detectNamingConvention(names), commonPrefix: findCommonPrefix(names) });
      }
      for (const d of subDirs) walk(path.join(dir, d.name), depth + 1);
    } catch { /* skip unreadable */ }
  };
  walk(rootDir, 0);
  return dirs;
}

export function detectNamingConvention(names: string[]): DirPattern['namingConvention'] {
  if (names.length === 0) return 'mixed';
  let camel = 0, kebab = 0, pascal = 0, snake = 0;
  for (const name of names) {
    const base = name.replace(/\.[^.]+$/, '');
    if (/^[a-z][a-zA-Z0-9]*$/.test(base)) camel++;
    else if (/^[a-z][a-z0-9-]*$/.test(base)) kebab++;
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(base)) pascal++;
    else if (/^[a-z][a-z0-9_]*$/.test(base)) snake++;
  }
  const max = Math.max(camel, kebab, pascal, snake);
  if (max === 0) return 'mixed';
  if (max === camel) return 'camelCase';
  if (max === kebab) return 'kebab-case';
  if (max === pascal) return 'PascalCase';
  return 'snake_case';
}

export function findCommonPrefix(names: string[]): string {
  if (names.length < 2) return '';
  let prefix = names[0];
  for (let i = 1; i < names.length; i++) {
    while ((names[i] ?? '').indexOf(prefix) !== 0) prefix = prefix.slice(0, -1);
    if (!prefix) return '';
  }
  return prefix;
}

function collectNamingConventions(rootDir: string): NamingConvention[] {
  const conventions: Map<string, NamingConvention> = new Map();
  const walk = (dir: string) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.css') || entry.name.endsWith('.json'))) {
          const ext = path.extname(entry.name);
          const base = entry.name.replace(ext, '');
          let type: NamingConvention['type'] = 'camelCase';
          if (/^[a-z][a-zA-Z0-9]*$/.test(base)) type = 'camelCase';
          else if (/^[a-z][a-z0-9-]*$/.test(base)) type = 'kebab-case';
          else if (/^[A-Z][a-zA-Z0-9]*$/.test(base)) type = 'PascalCase';
          else if (/^[a-z][a-z0-9_]*$/.test(base)) type = 'snake_case';
          const key = `${type}:${ext}`;
          if (!conventions.has(key)) conventions.set(key, { type, extension: ext, count: 0, examples: [] });
          const conv = conventions.get(key)!;
          conv.count++;
          if (conv.examples.length < 3) conv.examples.push(entry.name);
        } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') walk(path.join(dir, entry.name));
      }
    } catch { /* skip unreadable */ }
  };
  walk(rootDir);
  return Array.from(conventions.values()).sort((a, b) => b.count - a.count);
}

function collectComponents(rootDir: string): ComponentPattern[] {
  const components: ComponentPattern[] = [];
  const walk = (dir: string) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') walk(fullPath);
        else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            components.push({ name: entry.name.replace(/\.(tsx|jsx)$/, ''), hasProps: /\binterface\s+\w+Props\b/.test(content) || /type\s+\w+Props\s*=/.test(content), hasHooks: /\buse[A-Z]\w+\b/.test(content), hasStyles: content.includes('.css') || content.includes('.module.') || content.includes('styled.'), hasTests: findTestFile(dir, entry.name) !== null, file: path.relative(rootDir, fullPath) });
          } catch { /* skip unreadable */ }
        }
      }
    } catch { /* skip unreadable */ }
  };
  walk(rootDir);
  return components;
}

function findTestFile(dir: string, name: string): string | null {
  const base = name.replace(/\.(tsx|jsx)$/, '');
  const patterns = [`${base}.test.tsx`, `${base}.test.ts`, `${base}.spec.tsx`, `${base}.spec.ts`, `${base}.test.tsx`, `${base}.test.ts`];
  for (const pattern of patterns) {
    const testPath = path.join(dir, pattern);
    if (fs.existsSync(testPath)) return pattern;
  }
  const testDir = path.join(dir, '__tests__');
  if (fs.existsSync(testDir)) {
    for (const pattern of patterns) {
      const testPath = path.join(testDir, pattern);
      if (fs.existsSync(testPath)) return path.join('__tests__', pattern);
    }
  }
  return null;
}

function collectCommits(rootDir: string, maxCommits: number): CommitPattern[] {
  try {
    const raw = execFileSync('git', ['log', `--max-count=${maxCommits}`, '--format=%s'], { cwd: rootDir, encoding: 'utf8', timeout: 10000 });
    const messages = raw.split('\n').filter(Boolean);
    const types: Map<string, { count: number; scopes: Map<string, number>; examples: string[] }> = new Map();
    const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(([^)]+)\))?:\s(.+)$/;
    for (const msg of messages) {
      const match = msg.match(conventionalRegex);
      if (match) {
        const type = match[1] ?? 'other';
        const scope = match[3] || 'general';
        if (!types.has(type)) types.set(type, { count: 0, scopes: new Map(), examples: [] });
        const entry = types.get(type)!;
        entry.count++;
        entry.scopes.set(scope, (entry.scopes.get(scope) || 0) + 1);
        if (entry.examples.length < 3) entry.examples.push(msg);
      }
    }
    return Array.from(types.entries()).map(([type, data]) => ({
      conventionalType: type, scope: Array.from(data.scopes.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s).slice(0, 3).join(', '), count: data.count, examples: data.examples,
    })).sort((a, b) => b.count - a.count);
  } catch { return []; }
}

function collectTestPatterns(rootDir: string): TestPattern[] {
  const testDir = path.join(rootDir, '__tests__');
  const srcTestDir = path.join(rootDir, 'src', '__tests__');
  const results: TestPattern[] = [];

  for (const dir of [testDir, srcTestDir]) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.test.ts') || f.endsWith('.test.tsx') || f.endsWith('.spec.ts') || f.endsWith('.spec.tsx'));
      if (files.length === 0) continue;
      const naming = files.some((f: string) => f.includes('.spec.')) ? '*.spec.ts' : '*.test.ts';
      const packageJson = findPackageJson(rootDir);
      results.push({
        framework: (packageJson?.devDependencies as Record<string, unknown>)?.jest ? 'jest' : (packageJson?.devDependencies as Record<string, unknown>)?.vitest ? 'vitest' : 'unknown',
        location: dir.includes('src') ? 'co-located' : '__tests__', naming, coverageStrategy: 'unit',
      });
    } catch { /* skip */ }
  }

  if (results.length === 0 && fs.existsSync(path.join(rootDir, 'jest.config.js'))) {
    results.push({ framework: 'jest', location: '__tests__', naming: '*.test.ts', coverageStrategy: 'unit' });
  }

  return results;
}

function findPackageJson(rootDir: string): Record<string, unknown> | null {
  const p = path.join(rootDir, 'package.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function collectApiPatterns(rootDir: string): ApiPattern[] {
  const apis: ApiPattern[] = [];
  const walk = (dir: string) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') walk(full);
        else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          try {
            const content = fs.readFileSync(full, 'utf8');
            const routeRegex = /(?:app|router|route)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
            let match;
            while ((match = routeRegex.exec(content)) !== null) {
              apis.push({ name: match[2]?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown', method: (match[1] ?? 'GET').toUpperCase(), path: match[2] || '/', file: path.relative(rootDir, full), hasAuth: content.includes('authenticate') || content.includes('authorize') || content.includes('auth.'), hasValidation: content.includes('validate') || content.includes('zod') || content.includes('Joi') || content.includes('yup') });
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  };
  walk(rootDir);
  return apis;
}

function generateSuggestions(patterns: RepoPatterns): string[] {
  const s: string[] = [];
  const extCounts: Map<string, number> = new Map();
  for (const n of patterns.naming) extCounts.set(n.extension, (extCounts.get(n.extension) || 0) + n.count);
  const topExts = Array.from(extCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([ext]) => ext);
  if (topExts.length > 0) s.push(`Arquivos mais comuns: ${topExts.join(', ')}`);
  if (patterns.commits.length > 0) s.push(`Commits mais frequentes: ${patterns.commits[0].conventionalType} (${patterns.commits[0].count}x)`);
  if (patterns.components.length > 0) { const withTests = patterns.components.filter(c => c.hasTests).length; s.push(`Componentes: ${patterns.components.length} (${withTests} com teste, ${Math.round(withTests / patterns.components.length * 100)}%)`); }
  if (patterns.tests.length > 0) s.push(`Framework de teste: ${patterns.tests[0].framework} (${patterns.tests[0].location})`);
  if (patterns.apis.length > 0) { const authed = patterns.apis.filter(a => a.hasAuth).length; s.push(`APIs: ${patterns.apis.length} (${authed} com auth, ${Math.round(authed / patterns.apis.length * 100)}%)`); }
  return s;
}

export function scanRepository(opts?: Partial<ScanOptions>): RepoPatterns {
  const rootDir = opts?.rootDir || process.cwd();
  const maxDepth = opts?.maxDepth ?? 5;
  const maxCommits = opts?.maxCommits ?? 50;

  const dirs = collectDirs(rootDir, maxDepth);
  const naming = collectNamingConventions(rootDir);
  const components = collectComponents(rootDir);
  const commits = collectCommits(rootDir, maxCommits);
  const tests = collectTestPatterns(rootDir);
  const apis = collectApiPatterns(rootDir);

  const totalFiles = naming.reduce((s, n) => s + n.count, 0);
  const srcDirs = dirs.filter(d => d.path.includes('src')).length;

  const patterns: RepoPatterns = { directory: dirs, naming, components, commits, tests, apis, summary: { totalFiles, totalDirs: dirs.length, srcDirs, componentCount: components.length, testCount: tests.length, commitCount: commits.length, apiCount: apis.length }, suggestions: [] };
  patterns.suggestions = generateSuggestions(patterns);
  return patterns;
}

export function formatPatternReport(patterns: RepoPatterns): string {
  const lines: string[] = ['# Relatório de Padrões do Repositório', '', '## Resumo'];
  lines.push(`- Arquivos escaneados: ${patterns.summary.totalFiles}`);
  lines.push(`- Diretórios: ${patterns.summary.totalDirs} (${patterns.summary.srcDirs} src/)`);
  lines.push(`- Componentes: ${patterns.summary.componentCount}`);
  lines.push(`- Testes: ${patterns.summary.testCount}`);
  lines.push(`- Commits analisados: ${patterns.summary.commitCount}`);
  lines.push(`- APIs: ${patterns.summary.apiCount}`);

  if (patterns.naming.length > 0) {
    lines.push('', '## Convenções de Nomenclatura');
    for (const n of patterns.naming.slice(0, 5)) lines.push(`- ${n.type}: ${n.count} arquivos .${n.extension} (ex: ${n.examples.join(', ')})`);
  }

  if (patterns.components.length > 0) {
    lines.push('', `## Componentes (${patterns.components.length})`);
    for (const c of patterns.components.slice(0, 5)) lines.push(`- ${c.name} ${c.hasProps ? '[props]' : ''} ${c.hasHooks ? '[hooks]' : ''} ${c.hasTests ? '[test]' : ''}`);
  }

  if (patterns.commits.length > 0) {
    lines.push('', '## Commits Convencionais');
    for (const c of patterns.commits.slice(0, 5)) lines.push(`- ${c.conventionalType}: ${c.count} (ex: ${c.examples[0] || ''})`);
  }

  if (patterns.suggestions.length > 0) {
    lines.push('', '## Sugestões', ...patterns.suggestions.map(s => `- ${s}`));
  }

  return lines.join('\n');
}

export function suggestForContext(patterns: RepoPatterns, context: string): string[] {
  const lowerContext = context.toLowerCase();
  const suggestions: string[] = [];

  if (lowerContext.includes('component') || lowerContext.includes('componente')) {
    if (patterns.components.length > 0) {
      const withTests = patterns.components.filter(c => c.hasTests).length;
      suggestions.push(`Criar componente no mesmo padrão: ${patterns.components[0].hasProps ? 'com Props tipadas' : 'sem Props'}, ${patterns.components[0].hasHooks ? 'com hooks' : 'sem hooks'}, ${withTests > 0 ? 'com teste' : 'sem teste'}`);
    }
  }

  if (lowerContext.includes('api') || lowerContext.includes('rota') || lowerContext.includes('route')) {
    if (patterns.apis.length > 0) suggestions.push(`Criar API seguindo o padrão: ${patterns.apis[0].method} ${patterns.apis[0].path}`);
  }

  if (lowerContext.includes('test') || lowerContext.includes('teste')) {
    if (patterns.tests.length > 0) {
      const t = patterns.tests[0];
      suggestions.push(`Localizar teste em diretório ${t.location === 'co-located' ? 'ao lado do arquivo' : '__tests__/'}`);
      suggestions.push(`Nomear arquivo como ${t.naming}`);
    }
  }

  if (lowerContext.includes('file') || lowerContext.includes('arquivo') || lowerContext.includes('create')) {
    const topNaming = patterns.naming[0];
    if (topNaming) suggestions.push(`Usar ${topNaming.type} para nomes de arquivos .${topNaming.extension}`);
  }

  return suggestions;
}

export function savePatterns(patterns: RepoPatterns, rootDir?: string): string {
  const dir = rootDir || process.cwd();
  const memoryDir = path.join(dir, '.ai/memory');
  if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

  const output: Record<string, unknown> = {
    extracted_at: new Date().toISOString(), summary: patterns.summary,
    naming_conventions: patterns.naming.map(n => ({ extension: n.extension, convention: n.type, count: n.count })),
    directory_patterns: patterns.directory.filter(d => d.childCount > 1).map(d => ({ path: d.path, naming: d.namingConvention, files: d.childCount })),
    testing: patterns.tests.length > 0 ? { framework: patterns.tests[0]?.framework ?? 'unknown', location: patterns.tests[0]?.location ?? 'co-located', naming: patterns.tests[0]?.naming ?? '*.test.ts' } : null,
    api_patterns: { total: patterns.apis.length, auth_percent: patterns.apis.length > 0 ? Math.round(patterns.apis.filter(a => a.hasAuth).length / patterns.apis.length * 100) : 0, validation_percent: patterns.apis.length > 0 ? Math.round(patterns.apis.filter(a => a.hasValidation).length / patterns.apis.length * 100) : 0 },
    suggestions: patterns.suggestions,
  };

  const filePath = path.join(memoryDir, 'patterns.yaml');
  fs.writeFileSync(filePath, toYaml(output), 'utf8');
  return filePath;
}

function toYaml(obj: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) lines.push(`${prefix}${key}: null`);
    else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}-`);
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) lines.push(`${prefix}  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
        } else lines.push(`${prefix}- ${item}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) lines.push(`${prefix}  ${k}: ${v}`);
    } else lines.push(`${prefix}${key}: ${value}`);
  }
  return lines.join('\n');
}

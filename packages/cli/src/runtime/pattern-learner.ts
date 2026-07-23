import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/** Interface que define a estrutura de dir pattern. */
export interface DirPattern {
  path: string;
  depth: number;
  childCount: number;
  namingConvention: 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case' | 'mixed';
  commonPrefix: string;
}

/** Interface que define a estrutura de naming convention. */
export interface NamingConvention {
  type: 'camelCase' | 'kebab-case' | 'PascalCase' | 'snake_case';
  extension: string;
  count: number;
  examples: string[];
}

/** Interface que define a estrutura de component pattern. */
export interface ComponentPattern {
  name: string;
  hasProps: boolean;
  hasHooks: boolean;
  hasStyles: boolean;
  hasTests: boolean;
  file: string;
}

/** Interface que define a estrutura de commit pattern. */
export interface CommitPattern {
  conventionalType: string;
  scope: string;
  count: number;
  examples: string[];
}

/** Interface que define a estrutura de test pattern. */
export interface TestPattern {
  framework: 'jest' | 'vitest' | 'mocha' | 'unknown';
  location: 'co-located' | '__tests__' | 'dist';
  naming: '*.test.ts' | '*.spec.ts' | '*.test.tsx' | '*.spec.tsx';
  coverageStrategy: 'unit' | 'integration' | 'e2e';
}

/** Interface que define a estrutura de api pattern. */
export interface ApiPattern {
  name: string;
  method: string;
  path: string;
  file: string;
  hasAuth: boolean;
  hasValidation: boolean;
}

/** Interface que define a estrutura de repo patterns. */
export interface RepoPatterns {
  directory: DirPattern[];
  naming: NamingConvention[];
  components: ComponentPattern[];
  commits: CommitPattern[];
  tests: TestPattern[];
  apis: ApiPattern[];
  summary: {
    totalFiles: number;
    totalDirs: number;
    srcDirs: number;
    componentCount: number;
    testCount: number;
    commitCount: number;
    apiCount: number;
  };
  suggestions: string[];
}

interface ScanOptions {
  rootDir: string;
  maxDepth?: number;
  maxCommits?: number;
}

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
        const convention = detectNamingConvention(names);
        const commonPrefix = findCommonPrefix(names);
        dirs.push({
          path: path.relative(rootDir, dir) || '.',
          depth,
          childCount: files.length + subDirs.length,
          namingConvention: convention,
          commonPrefix,
        });
      }

      for (const d of subDirs) {
        walk(path.join(dir, d.name), depth + 1);
      }
    } catch { /* skip unreadable */ }
  };
  walk(rootDir, 0);
  return dirs;
}

/**
 * Detecta naming convention.
 * @param names - Valor names.
 * @returns O resultado da operaÃ§Ã£o.
 */
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

/**
 * Busca common prefix.
 * @param names - Valor names.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function findCommonPrefix(names: string[]): string {
  if (names.length < 2) return '';
  let prefix = names[0];
  for (let i = 1; i < names.length; i++) {
      while ((names[i] ?? '').indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

function collectNamingConventions(rootDir: string): NamingConvention[] {
  const counters = new Map<string, { camel: number; kebab: number; pascal: number; snake: number; examples: string[] }>();

  const walk = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(path.join(dir, e.name));
        } else if (e.isFile()) {
          const ext = path.extname(e.name);
          const base = e.name.replace(/\.[^.]+$/, '');
          if (!counters.has(ext)) counters.set(ext, { camel: 0, kebab: 0, pascal: 0, snake: 0, examples: [] });
          const c = counters.get(ext) ?? { camel: 0, kebab: 0, pascal: 0, snake: 0, examples: [] };
          if (c.examples.length < 3) c.examples.push(e.name);
          if (/^[a-z][a-zA-Z0-9]*$/.test(base)) c.camel++;
          else if (/^[a-z][a-z0-9-]*$/.test(base)) c.kebab++;
          else if (/^[A-Z][a-zA-Z0-9]*$/.test(base)) c.pascal++;
          else if (/^[a-z][a-z0-9_]*$/.test(base)) c.snake++;
        }
      }
    } catch { /* skip */ }
  };
  walk(rootDir);

  const result: NamingConvention[] = [];
  for (const [ext, data] of counters) {
    const max = Math.max(data.camel, data.kebab, data.pascal, data.snake);
    if (max === 0) continue;
    let type: NamingConvention['type'] = 'camelCase';
    if (max === data.camel) type = 'camelCase';
    else if (max === data.kebab) type = 'kebab-case';
    else if (max === data.pascal) type = 'PascalCase';
    else if (max === data.snake) type = 'snake_case';
    result.push({ type, extension: ext, count: max, examples: data.examples });
  }
  return result.sort((a, b) => b.count - a.count).slice(0, 20);
}

function collectComponents(rootDir: string): ComponentPattern[] {
  const components: ComponentPattern[] = [];

  const walk = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(path.join(dir, e.name));
        } else if (e.isFile() && /\.(tsx?|jsx?)$/i.test(e.name)) {
          const filePath = path.join(dir, e.name);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const name = e.name.replace(/\.[^.]+$/, '');
            const hasProps = /interface\s+\w+Props|type\s+\w+Props\s*=|Props\s*[:=]/.test(content);
            const hasHooks = /useEffect|useState|useCallback|useMemo|useRef|useContext/.test(content);
            const hasStyles = /import.*\.(css|scss|less|styled)/.test(content) || /css`|styles\./ .test(content);
            const testFile = findTestFile(dir, name);
            components.push({
              name,
              hasProps,
              hasHooks,
              hasStyles,
              hasTests: testFile !== null,
              file: path.relative(rootDir, filePath),
            });
          } catch { /* skip unreadable */ }
        }
      }
    } catch { /* skip */ }
  };
  walk(rootDir);
  return components.slice(0, 100);
}

function findTestFile(dir: string, name: string): string | null {
  const patterns = [`${name}.test.ts`, `${name}.test.tsx`, `${name}.spec.ts`, `${name}.spec.tsx`, `__tests__/${name}.test.ts`, `__tests__/${name}.spec.ts`];
  for (const p of patterns) {
    const fp = path.join(dir, p);
    if (fs.existsSync(fp)) return fp;
  }
  const parentDir = path.dirname(dir);
  for (const p of patterns) {
    const fp = path.join(parentDir, '__tests__', p.replace(/^.*[/\\]/, ''));
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

function collectCommits(rootDir: string, maxCommits: number): CommitPattern[] {
  try {
    const raw = execFileSync(`git log --format="%s" --max-count=${maxCommits}`, { cwd: rootDir, encoding: 'utf8', timeout: 10000 });
    const lines = raw.trim().split('\n').filter(Boolean);
    const counts = new Map<string, { scope: string; count: number; examples: string[] }>();

    for (const line of lines) {
      const m = line.match(/^(\w+)(\([^)]+\))?:/);
      if (m) {
        const type = m[1];
        const scope = (m[2] || '').replace(/[()]/g, '') || 'global';
        const key = `${type}:${scope}`;
        if (!counts.has(key)) counts.set(key, { scope, count: 0, examples: [] });
        const entry = counts.get(key) ?? { scope, count: 0, examples: [] };
        entry.count++;
        if (entry.examples.length < 3) entry.examples.push(line);
      }
    }

    return Array.from(counts.entries())
      .map(([key, data]) => {
        const type = key.split(':')[0];
        return { conventionalType: type, scope: data.scope, count: data.count, examples: data.examples };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  } catch { return []; }
}

function collectTestPatterns(rootDir: string): TestPattern[] {
  const patterns: TestPattern[] = [];
  let jestCount = 0, vitestCount = 0, mochaCount = 0;
  let coLocated = 0, inTestsDir = 0;
  let testTsCount = 0, specTsCount = 0;

  const walk = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(path.join(dir, e.name));
        } else if (e.isFile() && /\.(test|spec)\.(ts|tsx|js|jsx)$/i.test(e.name)) {
          const lowerDir = dir.toLowerCase();
          if (lowerDir.includes('__tests__') || lowerDir.includes('__test__')) inTestsDir++;
          else coLocated++;
          if (/\.test\./.test(e.name)) testTsCount++;
          if (/\.spec\./.test(e.name)) specTsCount++;
        }
      }
    } catch { /* skip */ }
  };
  walk(rootDir);

  const pkg = findPackageJson(rootDir);
  if (pkg) {
    const devDeps = JSON.stringify(pkg.devDependencies || {}).toLowerCase();
    if (devDeps.includes('jest')) jestCount++;
    if (devDeps.includes('vitest')) vitestCount++;
    if (devDeps.includes('mocha')) mochaCount++;
  }

  const total = coLocated + inTestsDir;
  if (total === 0) return patterns;

  let framework: TestPattern['framework'] = 'unknown';
  if (jestCount > vitestCount && jestCount > mochaCount) framework = 'jest';
  else if (vitestCount > mochaCount) framework = 'vitest';
  else if (mochaCount > 0) framework = 'mocha';

  patterns.push({
    framework,
    location: inTestsDir > coLocated ? '__tests__' : 'co-located',
    naming: testTsCount >= specTsCount ? '*.test.ts' : '*.spec.ts',
    coverageStrategy: 'unit',
  });

  return patterns;
}

function findPackageJson(rootDir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  } catch { return null; }
}

function collectApiPatterns(rootDir: string): ApiPattern[] {
  const apis: ApiPattern[] = [];

  const walk = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(path.join(dir, e.name));
        } else if (e.isFile() && /\.ts$/i.test(e.name)) {
          const filePath = path.join(dir, e.name);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const routePattern = /(?:router|route|app)\s*\.\s*(get|post|put|delete|patch|options)\s*\(\s*['"]([^'"]+)['"]/gi;
            let match: RegExpExecArray | null;
            while ((match = routePattern.exec(content)) !== null) {
              const method = match[1].toUpperCase();
              const routePath = match[2];
              const hasAuth = /auth|jwt|token|middleware|authenticate/i.test(content.slice(Math.max(0, match.index - 200), match.index + 200));
              const hasValidation = /validate|schema|zod|yup|joi|class-validator/i.test(content.slice(Math.max(0, match.index - 200), match.index + 200));
              apis.push({
                name: routePath.split('/').filter(Boolean).pop() || routePath,
                method,
                path: routePath,
                file: path.relative(rootDir, filePath),
                hasAuth,
                hasValidation,
              });
              if (apis.length >= 50) return;
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
  const suggestions: string[] = [];

  if (patterns.naming.length > 0) {
    const topNaming = patterns.naming[0];
    suggestions.push(`Usar convenÃ§Ã£o ${topNaming.type} para arquivos .${topNaming.extension} (${topNaming.count} ocorrÃªncias)`);
  }

  const compCount = patterns.components.length;
  const withProps = patterns.components.filter(c => c.hasProps).length;
  const withHooks = patterns.components.filter(c => c.hasHooks).length;
  const withStyles = patterns.components.filter(c => c.hasStyles).length;
  const withTests = patterns.components.filter(c => c.hasTests).length;

  if (compCount > 0) {
    if (withProps / compCount > 0.5) suggestions.push(`Definir interface Props para componentes (${Math.round(withProps / compCount * 100)}% dos componentes)`);
    if (withHooks / compCount > 0.3) suggestions.push(`Usar hooks (useState/useEffect) em componentes (${Math.round(withHooks / compCount * 100)}%)`);
    if (withTests / compCount < 0.3) suggestions.push(`Aumentar cobertura de testes em componentes (apenas ${Math.round(withTests / compCount * 100)}% tÃªm testes)`);
    if (withStyles / compCount > 0.5) suggestions.push(`Manter arquivos de estilo separados para componentes (${Math.round(withStyles / compCount * 100)}%)`);
  }

  if (patterns.commits.length > 0) {
    const topCommit = patterns.commits[0];
    suggestions.push(`Manter padrÃ£o conventional commits: tipo "${topCommit.conventionalType}" mais frequente (${topCommit.count} commits)`);
  }

  if (patterns.tests.length > 0) {
    const t = patterns.tests[0];
    suggestions.push(`Testes em formato ${t.naming}, localizaÃ§Ã£o: ${t.location}, framework: ${t.framework}`);
  }

  if (patterns.apis.length > 0) {
    const withAuth = patterns.apis.filter(a => a.hasAuth).length;
    const withVal = patterns.apis.filter(a => a.hasValidation).length;
    if (withAuth / patterns.apis.length < 0.3) suggestions.push('Adicionar autenticaÃ§Ã£o a mais rotas de API');
    if (withVal / patterns.apis.length > 0.5) suggestions.push(`Manter validaÃ§Ã£o de entrada nas APIs (${Math.round(withVal / patterns.apis.length * 100)}% das rotas)`);
  }

  const dirsWithManyChildren = patterns.directory.filter(d => d.childCount > 10);
  if (dirsWithManyChildren.length > 0) {
    suggestions.push(`Considerar dividir diretÃ³rios com muitos arquivos: ${dirsWithManyChildren.slice(0, 3).map(d => d.path).join(', ')}`);
  }

  return suggestions;
}

/**
 * Processa repository.
 * @param opts - Valor opts.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function scanRepository(opts?: Partial<ScanOptions>): RepoPatterns {
  const rootDir = opts?.rootDir || process.cwd();
  const maxDepth = opts?.maxDepth || 8;
  const maxCommits = opts?.maxCommits || 200;

  const dirs = collectDirs(rootDir, maxDepth);
  const srcDirs = dirs.filter(d => d.path.includes('src') || d.path.includes('packages'));
  let totalFiles = 0, totalDirs = 0;
  const countEntries = (dir: string) => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          totalDirs++;
          countEntries(path.join(dir, e.name));
        } else if (e.isFile()) {
          totalFiles++;
        }
      }
    } catch { /* skip */ }
  };
  countEntries(rootDir);

  const naming = collectNamingConventions(rootDir);
  const components = collectComponents(rootDir);
  const commits = collectCommits(rootDir, maxCommits);
  const tests = collectTestPatterns(rootDir);
  const apis = collectApiPatterns(rootDir);

  const patterns: RepoPatterns = {
    directory: dirs,
    naming,
    components,
    commits,
    tests,
    apis,
    summary: {
      totalFiles,
      totalDirs,
      srcDirs: srcDirs.length,
      componentCount: components.length,
      testCount: tests.length > 0 ? (tests[0]?.naming === '*.test.ts' || tests[0]?.naming === '*.test.tsx' ? 1 : 1) : 0,
      commitCount: commits.reduce((s, c) => s + c.count, 0),
      apiCount: apis.length,
    },
    suggestions: [],
  };
  patterns.suggestions = generateSuggestions(patterns);
  return patterns;
}

/**
 * Formata pattern report.
 * @param patterns - Valor patterns.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function formatPatternReport(patterns: RepoPatterns): string {
  const lines: string[] = [];
  lines.push('=== Repositorio: Padroes Detectados ===');
  lines.push(`Arquivos: ${patterns.summary.totalFiles} | Diretorios: ${patterns.summary.totalDirs}`);
  lines.push('');

  if (patterns.naming.length > 0) {
    lines.push('[CONVENCOES] Convencoes de Nomenclatura:');
    for (const n of patterns.naming.slice(0, 10)) {
      lines.push(`  .${n.extension}: ${n.type} (${n.count} arquivos)`);
    }
    lines.push('');
  }

  if (patterns.components.length > 0) {
    lines.push('[COMPONENTES] Componentes:');
    const withProps = patterns.components.filter(c => c.hasProps).length;
    const withTests = patterns.components.filter(c => c.hasTests).length;
    const withHooks = patterns.components.filter(c => c.hasHooks).length;
    lines.push(`  Total: ${patterns.components.length} componentes`);
    lines.push(`  Com Props: ${withProps} (${Math.round(withProps / patterns.components.length * 100)}%)`);
    lines.push(`  Com Hooks: ${withHooks} (${Math.round(withHooks / patterns.components.length * 100)}%)`);
    lines.push(`  Com Testes: ${withTests} (${Math.round(withTests / patterns.components.length * 100)}%)`);
    lines.push('');
  }

  if (patterns.commits.length > 0) {
    lines.push('[COMMITS] Commits:');
    for (const c of patterns.commits.slice(0, 5)) {
      lines.push(`  ${c.conventionalType}(${c.scope}): ${c.count} ocorrencias`);
    }
    lines.push('');
  }

  if (patterns.tests.length > 0) {
    const t = patterns.tests[0];
    lines.push('[TESTES] Testes:');
    lines.push(`  Framework: ${t.framework}`);
    lines.push(`  Localizacao: ${t.location}`);
    lines.push(`  Nomenclatura: ${t.naming}`);
    lines.push('');
  }

  if (patterns.apis.length > 0) {
    lines.push('[APIS] APIs:');
    lines.push(`  Total de rotas: ${patterns.apis.length}`);
    lines.push(`  Com auth: ${patterns.apis.filter(a => a.hasAuth).length}`);
    lines.push(`  Com validacao: ${patterns.apis.filter(a => a.hasValidation).length}`);
    lines.push('');
  }

  if (patterns.suggestions.length > 0) {
    lines.push('[SUGESTOES] Sugestoes:');
    for (const s of patterns.suggestions) {
      lines.push(`  => ${s}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Processa for context.
 * @param patterns - Valor patterns.
 * @param context - Valor context.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function suggestForContext(patterns: RepoPatterns, context: string): string[] {
  const lowerContext = context.toLowerCase();
  const suggestions: string[] = [];

  if (lowerContext.includes('component') || lowerContext.includes('componente')) {
    const withProps = patterns.components.filter(c => c.hasProps).length;
    const withHooks = patterns.components.filter(c => c.hasHooks).length;
    const compPct = patterns.components.length > 0 ? Math.round(withProps / patterns.components.length * 100) : 0;
    if (compPct > 50) suggestions.push(`Criar interface Props (${compPct}% dos componentes existentes usam Props)`);
    if (withHooks > 0) suggestions.push('Usar hooks (useState/useEffect) seguindo padrÃ£o existente');
    if (patterns.naming.length > 0) {
      const tsxConv = patterns.naming.find(n => n.extension === '.tsx');
      if (tsxConv) suggestions.push(`Nomear arquivo seguindo convenÃ§Ã£o ${tsxConv.type} (padrÃ£o do repositÃ³rio)`);
    }
  }

  if (lowerContext.includes('api') || lowerContext.includes('route') || lowerContext.includes('rota')) {
    const withAuth = patterns.apis.filter(a => a.hasAuth).length;
    const withVal = patterns.apis.filter(a => a.hasValidation).length;
    if (withAuth > 0) suggestions.push(`Incluir middleware de autenticaÃ§Ã£o (${Math.round(withAuth / Math.max(1, patterns.apis.length) * 100)}% das rotas existentes tÃªm auth)`);
    if (withVal > 0) suggestions.push('Adicionar validaÃ§Ã£o de entrada com schema');
    if (patterns.commits.length > 0) {
      const apiCommits = patterns.commits.filter(c => c.scope === 'api' || c.scope === 'backend');
      if (apiCommits.length > 0) suggestions.push(`Prefixar commit com "${apiCommits[0]?.conventionalType ?? 'feat'}(api):" seguindo padrÃ£o`);
    }
  }

  if (lowerContext.includes('test') || lowerContext.includes('teste')) {
    if (patterns.tests.length > 0) {
      const t = patterns.tests[0];
      suggestions.push(`Localizar teste em diretÃ³rio ${t.location === 'co-located' ? 'ao lado do arquivo' : '__tests__/'}`);
      suggestions.push(`Nomear arquivo como ${t.naming}`);
    }
  }

  if (lowerContext.includes('file') || lowerContext.includes('arquivo') || lowerContext.includes('create')) {
    const topNaming = patterns.naming[0];
    if (topNaming) suggestions.push(`Usar ${topNaming.type} para nomes de arquivos .${topNaming.extension}`);
  }

  return suggestions;
}

/**
 * Persiste patterns.
 * @param patterns - Valor patterns.
 * @param rootDir - Valor dir.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function savePatterns(patterns: RepoPatterns, rootDir?: string): string {
  const dir = rootDir || process.cwd();
  const memoryDir = path.join(dir, '.ai/memory');
  if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

  const output: Record<string, unknown> = {
    extracted_at: new Date().toISOString(),
    summary: patterns.summary,
    naming_conventions: patterns.naming.map(n => ({ extension: n.extension, convention: n.type, count: n.count })),
    directory_patterns: patterns.directory.filter(d => d.childCount > 1).map(d => ({ path: d.path, naming: d.namingConvention, files: d.childCount })),
    testing: patterns.tests.length > 0 ? { framework: patterns.tests[0]?.framework ?? 'unknown', location: patterns.tests[0]?.location ?? 'co-located', naming: patterns.tests[0]?.naming ?? '*.test.ts' } : null,
    api_patterns: {
      total: patterns.apis.length,
      auth_percent: patterns.apis.length > 0 ? Math.round(patterns.apis.filter(a => a.hasAuth).length / patterns.apis.length * 100) : 0,
      validation_percent: patterns.apis.length > 0 ? Math.round(patterns.apis.filter(a => a.hasValidation).length / patterns.apis.length * 100) : 0,
    },
    suggestions: patterns.suggestions,
  };

  const filePath = path.join(memoryDir, 'patterns.yaml');
  const yamlContent = toYaml(output);
  fs.writeFileSync(filePath, yamlContent, 'utf8');
  return filePath;
}

function toYaml(obj: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${prefix}${key}: null`);
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${key}:`);
      for (const item of value) {
        if (typeof item === 'object' && item !== null) {
          lines.push(`${prefix}-`);
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
            lines.push(`${prefix}  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
          }
        } else {
          lines.push(`${prefix}- ${item}`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${prefix}${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`${prefix}  ${k}: ${v}`);
      }
    } else {
      lines.push(`${prefix}${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

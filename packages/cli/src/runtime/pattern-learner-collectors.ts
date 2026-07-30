import path from 'node:path';
import { createLogger } from '@ideia/logger';
import { execFileSync } from 'node:child_process';
import { getIO } from '../io';
import { DirPattern, NamingConvention, ComponentPattern, CommitPattern, TestPattern, ApiPattern } from './pattern-types';
const logger = createLogger('pattern-learner-collectors');

export function collectDirs(rootDir: string, maxDepth: number): DirPattern[] {
  const dirs: DirPattern[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    try {
      const entries = getIO().fs.readDirEntries(dir);
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
    while ((names[i] ?? '').indexOf(prefix) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

export function collectNamingConventions(rootDir: string): NamingConvention[] {
  const counters = new Map<string, { camel: number; kebab: number; pascal: number; snake: number; examples: string[] }>();

  const walk = (dir: string) => {
    try {
      const entries = getIO().fs.readDirEntries(dir);
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

export function collectComponents(rootDir: string): ComponentPattern[] {
  const components: ComponentPattern[] = [];

  const walk = (dir: string) => {
    try {
      const entries = getIO().fs.readDirEntries(dir);
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(path.join(dir, e.name));
        } else if (e.isFile() && /\.(tsx?|jsx?)$/i.test(e.name)) {
          const filePath = path.join(dir, e.name);
          try {
            const content = getIO().fs.read(filePath, 'utf8');
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
    if (getIO().fs.exists(fp)) return fp;
  }
  const parentDir = path.dirname(dir);
  for (const p of patterns) {
    const fp = path.join(parentDir, '__tests__', p.replace(/^.*[/\\]/, ''));
    if (getIO().fs.exists(fp)) return fp;
  }
  return null;
}

export function collectCommits(rootDir: string, maxCommits: number): CommitPattern[] {
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

export function collectTestPatterns(rootDir: string): TestPattern[] {
  const patterns: TestPattern[] = [];
  let jestCount = 0, vitestCount = 0, mochaCount = 0;
  let coLocated = 0, inTestsDir = 0;
  let testTsCount = 0, specTsCount = 0;

  const walk = (dir: string) => {
    try {
      const entries = getIO().fs.readDirEntries(dir);
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
    return JSON.parse(getIO().fs.read(path.join(rootDir, 'package.json'), 'utf8'));
  } catch { return null; }
}

export function collectApiPatterns(rootDir: string): ApiPattern[] {
  const apis: ApiPattern[] = [];

  const walk = (dir: string) => {
    try {
      const entries = getIO().fs.readDirEntries(dir);
      for (const e of entries) {
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
          walk(path.join(dir, e.name));
        } else if (e.isFile() && /\.ts$/i.test(e.name)) {
          const filePath = path.join(dir, e.name);
          try {
            const content = getIO().fs.read(filePath, 'utf8');
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

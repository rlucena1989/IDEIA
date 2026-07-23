import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de stack info. */
export interface StackInfo {
  language: string;
  framework: string;
  packageManager: string;
  database: string;
  ui: string;
  testing: string;
  ci: string;
  confidence: number;
  evidence: string[];
}

const DETECTORS: Array<{ name: string; detect: (files: string[]) => string | null; confidence: number; category: keyof StackInfo }> = [
  { name: 'Node.js', category: 'language', confidence: 0.95, detect: (files) => files.some(f => f.includes('package.json')) ? 'Node.js' : null },
  { name: 'Python', category: 'language', confidence: 0.95, detect: (files) => files.some(f => /requirements\.txt|Pipfile|pyproject\.toml/.test(f)) ? 'Python' : null },
  { name: 'Go', category: 'language', confidence: 0.95, detect: (files) => files.some(f => f.endsWith('go.mod')) ? 'Go' : null },
  { name: 'Rust', category: 'language', confidence: 0.95, detect: (files) => files.some(f => f.endsWith('Cargo.toml')) ? 'Rust' : null },
  { name: 'TypeScript', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('tsconfig.json')) ? 'TypeScript' : null },
  { name: 'NestJS', category: 'framework', confidence: 0.9, detect: (files) => files.some(f => f.includes('nest-cli.json') || f === 'nestconfig.json' || f.endsWith('nest-cli.json')) ? 'NestJS' : null },
  { name: 'Express', category: 'framework', confidence: 0.8, detect: (files) => {
    const pkgFile = files.find(f => path.basename(f) === 'package.json');
    if (!pkgFile) return null;
    try { const j = JSON.parse(fs.readFileSync(pkgFile, 'utf-8')); if (j.dependencies?.express || j.devDependencies?.express) return 'Express'; } catch {}
    return null;
  } },
  { name: 'Fastify', category: 'framework', confidence: 0.8, detect: (files) => {
    const pkgFile = files.find(f => path.basename(f) === 'package.json');
    if (!pkgFile) return null;
    try { const j = JSON.parse(fs.readFileSync(pkgFile, 'utf-8')); if (j.dependencies?.fastify) return 'Fastify'; } catch {}
    return null;
  } },
  { name: 'React', category: 'ui', confidence: 0.9, detect: (files) => files.some(f => f.includes('react') || f.includes('jsx') || f.includes('tsx')) ? 'React' : null },
  { name: 'Vue', category: 'ui', confidence: 0.9, detect: (files) => files.some(f => f.includes('.vue')) ? 'Vue' : null },
  { name: 'npm', category: 'packageManager', confidence: 0.9, detect: (files) => files.some(f => f.includes('package-lock.json')) ? 'npm' : null },
  { name: 'yarn', category: 'packageManager', confidence: 0.9, detect: (files) => files.some(f => f.includes('yarn.lock') || f.includes('.yarnrc')) ? 'yarn' : null },
  { name: 'pnpm', category: 'packageManager', confidence: 0.9, detect: (files) => files.some(f => f.includes('pnpm-lock.yaml')) ? 'pnpm' : null },
  { name: 'PostgreSQL', category: 'database', confidence: 0.8, detect: (files) => {
    const pkgFile = files.find(f => path.basename(f) === 'package.json');
    if (!pkgFile) return null;
    try { const j = JSON.parse(fs.readFileSync(pkgFile, 'utf-8')); const deps = { ...j.dependencies, ...j.devDependencies }; if (deps?.pg || deps?.typeorm || deps?.prisma) return 'PostgreSQL'; } catch {}
    return null;
  } },
  { name: 'MySQL', category: 'database', confidence: 0.8, detect: (files) => files.some(f => f.includes('mysql') || f.includes('mariadb')) ? 'MySQL' : null },
  { name: 'MongoDB', category: 'database', confidence: 0.8, detect: (files) => files.some(f => f.includes('mongoose') || f.includes('mongodb')) ? 'MongoDB' : null },
  { name: 'SQLite', category: 'database', confidence: 0.7, detect: (files) => files.some(f => f.includes('sqlite') || f.endsWith('.db')) ? 'SQLite' : null },
  { name: 'Jest', category: 'testing', confidence: 0.9, detect: (files) => files.some(f => f.includes('jest.config') || f.includes('.spec.ts') || f.includes('.test.ts')) ? 'Jest' : null },
  { name: 'Vitest', category: 'testing', confidence: 0.8, detect: (files) => files.some(f => f.includes('vitest.config')) ? 'Vitest' : null },
  { name: 'GitHub Actions', category: 'ci', confidence: 0.95, detect: (files) => files.some(f => f.includes('.github' + path.sep + 'workflows' + path.sep)) ? 'GitHub Actions' : null },
  { name: 'GitLab CI', category: 'ci', confidence: 0.95, detect: (files) => files.some(f => f.includes('.gitlab-ci.yml')) ? 'GitLab CI' : null },

  { name: 'Java', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('pom.xml') || f.endsWith('build.gradle') || f.endsWith('build.gradle.kts')) ? 'Java' : null },
  { name: 'Kotlin', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('.kt') || f.endsWith('build.gradle.kts')) ? 'Kotlin' : null },
  { name: 'Ruby', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('Gemfile') || f.endsWith('.gemspec')) ? 'Ruby' : null },
  { name: 'PHP', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('composer.json')) ? 'PHP' : null },
  { name: 'Swift', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('Package.swift')) ? 'Swift' : null },
  { name: 'C#', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('.csproj') || f.endsWith('.sln') || f.endsWith('.cs')) ? 'C#' : null },
  { name: 'Dart', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('pubspec.yaml')) ? 'Dart' : null },
  { name: 'Elixir', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('mix.exs')) ? 'Elixir' : null },
  { name: 'Haskell', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('.cabal') || f.endsWith('stack.yaml')) ? 'Haskell' : null },
  { name: 'Zig', category: 'language', confidence: 0.9, detect: (files) => files.some(f => f.endsWith('build.zig')) ? 'Zig' : null },
  { name: 'JavaScript', category: 'language', confidence: 0.85, detect: (files) => files.some(f => f.endsWith('package.json')) ? 'JavaScript' : null },
];

/**
 * Detecta linguagens de programação no diretório.
 * Retorna array de nomes de linguagens detectadas (ex: ['Node.js', 'TypeScript']).
 */
export function detectLanguages(rootDir?: string): string[] {
  const stack = detectStack(rootDir);
  const languages: string[] = [];
  if (stack.language !== 'unknown') languages.push(stack.language);
  if (stack.ui && stack.ui !== 'unknown' && ['React', 'Vue', 'Angular', 'Svelte'].includes(stack.ui)) {
    languages.push(stack.ui);
  }
  return languages;
}

/**
 * Detecta stack.
 * @param rootDir - Valor dir.
 * @returns O resultado da operação.
 */
export function detectStack(rootDir?: string): StackInfo {
  const base = rootDir || process.cwd();
  const allFiles: string[] = [];

  try {
    const walk = (dir: string, depth: number = 0): void => {
      if (depth > 3) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
          if (!entry.name.startsWith('.') || entry.name === '.github' || entry.name === '.gitlab') {
            walk(full, depth + 1);
          }
        } else if (entry.isFile()) {
          allFiles.push(full);
        }
      }
    };
    walk(base);
  } catch {
    return { language: 'unknown', framework: 'unknown', packageManager: 'unknown', database: 'unknown', ui: 'unknown', testing: 'unknown', ci: 'unknown', confidence: 0, evidence: [] };
  }

  const result: StackInfo = { language: 'unknown', framework: 'unknown', packageManager: 'unknown', database: 'unknown', ui: 'unknown', testing: 'unknown', ci: 'unknown', confidence: 0, evidence: [] };
  const evMap = new Map<string, string[]>();

  for (const d of DETECTORS) {
    try {
      const match = d.detect(allFiles);
      if (match) {
        if (!evMap.has(d.category)) evMap.set(d.category, []);
        evMap.get(d.category) ?? {}.push(match);
        const current = result[d.category];
        if (current === 'unknown' || d.confidence > 0.85) {
          (result as Record<string, unknown>)[d.category] = match;
        }
        result.evidence.push(`  ${d.category}: ${match}`);
      }
    } catch {}
  }

  const confidences: number[] = [];
  for (const [cat, vals] of evMap) {
    const maxConf = Math.max(...vals.map(v => {
      const det = DETECTORS.find(d => d.name === v && d.category === cat);
      return det ? det.confidence : 0;
    }));
    confidences.push(maxConf);
  }
  result.confidence = confidences.length > 0
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
    : 0;

  return result;
}

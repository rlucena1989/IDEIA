import path from 'node:path';
import { getIO } from '../io';

/** Interface que define a estrutura de module score. */
export interface ModuleScore {
  name: string;
  path: string;
  dimensions: Record<string, number>;
  overall: number;
  status: 'critical' | 'warning' | 'good' | 'excellent';
}

/** Interface que define a estrutura de granular scorecard. */
export interface GranularScorecard {
  generatedAt: string;
  modules: ModuleScore[];
  averages: Record<string, number>;
  overall: number;
  worstModule: string;
  bestModule: string;
  recommendations: string[];
}

const DIMENSION_NAMES = ['profundidade', 'cobertura', 'risco', 'complexidade', 'valor_de_negocio', 'maturidade', 'testabilidade'] as const;

const WEIGHTS: Record<string, number> = {
  profundidade: 0.10,
  cobertura: 0.15,
  risco: 0.15,
  complexidade: 0.10,
  valor_de_negocio: 0.20,
  maturidade: 0.15,
  testabilidade: 0.15,
};

function safeExists(p: string): boolean {
  try {
    return getIO().fs.exists(p);
  } catch {
    return false;
  }
}

function safeReaddir(p: string): string[] {
  try {
    if (!getIO().fs.exists(p)) return [];
    return getIO().fs.readDir(p);
  } catch {
    return [];
  }
}

function safeReaddirEntries(p: string): { name: string; isDirectory: () => boolean; isFile: () => boolean }[] {
  try {
    if (!getIO().fs.exists(p)) return [];
    return getIO().fs.readDirEntries(p);
  } catch {
    return [];
  }
}

function safeRead(p: string): string | null {
  try {
    if (!getIO().fs.exists(p)) return null;
    return getIO().fs.read(p, 'utf8');
  } catch {
    return null;
  }
}

function safeStat(p: string): { mtimeMs: number; size: number; isDirectory: () => boolean } | null {
  try {
    if (!getIO().fs.exists(p)) return null;
    return getIO().fs.stat(p);
  } catch {
    return null;
  }
}

function walkFiles(dir: string, maxDepth: number, _currentDepth = 0): string[] {
  if (_currentDepth > maxDepth) return [];
  const results: string[] = [];
  const entries = safeReaddirEntries(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, maxDepth, _currentDepth + 1));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

function countFiles(dir: string): number {
  try {
    return walkFiles(dir, 3).length;
  } catch {
    return 0;
  }
}

function findTestFiles(files: string[]): string[] {
  return files.filter(f => /\.(test|spec)\.(ts|tsx)$/.test(f));
}

function findSourceFiles(files: string[]): string[] {
  return files.filter(f => !/\.(test|spec)\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'));
}

/**
 * Processa modules.
 * @param baseDir - Valor dir.
 * @returns O resultado da operação.
 */
export function discoverModules(baseDir: string): { name: string; path: string }[] {
  const modules: { name: string; path: string }[] = [];
  const seen = new Set<string>();

  const candidates = [
    path.join(baseDir, 'src'),
    ...safeReaddir(path.join(baseDir, 'packages')).map(p => path.join(baseDir, 'packages', p, 'src')),
    path.join(baseDir, 'scripts'),
  ];

  for (const candidate of candidates) {
    if (!safeExists(candidate)) continue;
    const entries = safeReaddirEntries(candidate);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__' || entry.name === 'legacy') continue;
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      modules.push({ name: entry.name, path: path.join(candidate, entry.name) });
    }
  }

  modules.sort((a, b) => a.name.localeCompare(b.name));
  return modules;
}

/**
 * Calcula depth score.
 * @param modulePath - Valor path.
 * @param baseDir - Valor dir.
 * @returns O resultado da operação.
 */
export function calculateDepthScore(modulePath: string, baseDir: string): number {
  try {
    if (!safeExists(modulePath)) return 0;

    const relPath = path.relative(baseDir, modulePath);
    const depthSegments = relPath.split(path.sep).length;
    const depthScore = Math.min(100, depthSegments * 20);

    const fileCount = countFiles(modulePath);
    const fileScore = Math.min(100, fileCount * 5);

    return Math.round((depthScore + fileScore) / 2);
  } catch {
    return 50;
  }
}

function tryReadCoveragePct(): number | null {
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    const content = getIO().fs.read(coveragePath, 'utf8');
    const data = JSON.parse(content) as { total: Record<string, { pct: number }> };
    const lines = data.total?.lines?.pct;
    return typeof lines === 'number' ? Math.round(lines) : null;
  } catch {
    return null;
  }
}

/**
 * Calcula coverage score.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function calculateCoverageScore(modulePath: string): number {
  try {
    const coveragePct = tryReadCoveragePct();
    if (coveragePct !== null) return coveragePct;
  } catch {}

  try {
    const reportPath = path.join(modulePath, '..', '..', '.ai', 'reports', 'scorecard');
    const entries = safeReaddir(reportPath);
    if (entries.length > 0) {
      const jsonFiles = entries.filter(e => e.endsWith('.json'));
      if (jsonFiles.length > 0) return 80;
    }
  } catch {}

  try {
    const files = walkFiles(modulePath, 3);
    const sourceFiles = findSourceFiles(files);
    if (sourceFiles.length === 0) return 30;
    const hasTypes = sourceFiles.some(f => {
      const content = safeRead(f);
      return content !== null && (content.includes('interface ') || content.includes('type ') || content.includes('export '));
    });
    if (hasTypes) return 50;
    return 30;
  } catch {
    return 30;
  }
}

/**
 * Processa risk.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function assessRisk(modulePath: string): { score: number; factors: string[] } {
  const factors: string[] = [];

  try {
    const files = walkFiles(modulePath, 3);
    const sourceFiles = findSourceFiles(files);
    let anyCount = 0;
    let todoCount = 0;
    let largeFileCount = 0;

    for (const file of sourceFiles) {
      const content = safeRead(file);
      if (content === null) continue;
      const anyMatches = content.match(/\bany\b/g);
      if (anyMatches) anyCount += anyMatches.length;
      const todoMatches = content.match(/\bTODO\b/g);
      if (todoMatches) todoCount += todoMatches.length;

      const st = safeStat(file);
      if (st !== null && st.size > 50000) largeFileCount++;
    }

    let riskScore = 0;
    if (sourceFiles.length > 0) {
      const anyRatio = anyCount / sourceFiles.length;
      const todoRatio = todoCount / sourceFiles.length;
      riskScore = Math.min(100, Math.round(
        (anyRatio * 30) + (todoRatio * 30) + (largeFileCount * 10)
      ));
    }

    if (anyCount > 0) factors.push(`${anyCount} usos de any`);
    if (todoCount > 0) factors.push(`${todoCount} TODOs pendentes`);
    if (largeFileCount > 0) factors.push(`${largeFileCount} arquivos > 50KB`);

    return { score: riskScore, factors };
  } catch {
    return { score: 50, factors: ['erro ao analisar risco'] };
  }
}

/**
 * Estima complexity.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function estimateComplexity(modulePath: string): number {
  try {
    if (!safeExists(modulePath)) return 0;

    const files = walkFiles(modulePath, 3);
    const sourceFiles = findSourceFiles(files);
    if (sourceFiles.length === 0) return 0;

    let totalSize = 0;
    for (const file of sourceFiles) {
      const st = safeStat(file);
      if (st !== null) totalSize += st.size;
    }

    const avgSize = totalSize / sourceFiles.length;
    const avgSizeScore = Math.min(100, Math.round((avgSize / 5000) * 50));

    const fileCountScore = Math.min(100, sourceFiles.length * 5);

    const maxSegments = modulePath.split(path.sep).length;
    const depthScore = Math.min(100, maxSegments * 15);

    return Math.round((avgSizeScore + fileCountScore + depthScore) / 3);
  } catch {
    return 50;
  }
}

/**
 * Estima business value.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function estimateBusinessValue(modulePath: string): number {
  const name = path.basename(modulePath).toLowerCase();

  if (name.includes('core') || name.includes('domain') || name.includes('contract') || name.includes('adapter')) return 90;
  if (name.includes('command') || name.includes('service') || name.includes('module')) return 80;
  if (name.includes('utils') || name.includes('helper') || name.includes('common') || name.includes('shared')) return 50;
  if (name.includes('test') || name.includes('mock') || name.includes('fixture') || name.includes('spec')) return 30;
  if (name.includes('config') || name.includes('constant') || name.includes('type') || name.includes('types')) return 60;
  if (name.includes('plugin') || name.includes('provider') || name.includes('middleware')) return 75;
  if (name.includes('migration') || name.includes('seed') || name.includes('script')) return 40;
  if (name.includes('hook') || name.includes('handler') || name.includes('controller')) return 85;

  return 65;
}

/**
 * Calcula testability.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function calculateTestability(modulePath: string): number {
  try {
    if (!safeExists(modulePath)) return 0;

    const files = walkFiles(modulePath, 3);
    const sourceFiles = findSourceFiles(files);
    const testFiles = findTestFiles(files);

    if (sourceFiles.length === 0) return 0;

    const ratio = testFiles.length / sourceFiles.length;
    return Math.round(Math.min(100, ratio * 100));
  } catch {
    return 0;
  }
}

/**
 * Processa maturity.
 * @param modulePath - Valor path.
 * @returns O resultado da operação.
 */
export function assessMaturity(modulePath: string): number {
  let score = 0;

  try {
    if (!safeExists(modulePath)) return 0;

    const name = path.basename(modulePath);

    const readmePath = path.join(modulePath, 'README.md');
    const readmeUpPath = path.join(modulePath, '..', `${name}.md`);
    if (safeExists(readmePath) || safeExists(readmeUpPath)) score += 20;

    const parentDir = path.dirname(modulePath);
    for (const p of [parentDir, path.join(parentDir, '..')]) {
      const changelogPath = path.join(p, 'CHANGELOG.md');
      if (safeExists(changelogPath)) { score += 20; break; }
    }

    const aiDir = path.join(modulePath, '.ai');
    const parentAiDir = path.join(parentDir, '.ai');
    if (safeExists(aiDir) || safeExists(parentAiDir)) score += 20;

    const files = walkFiles(modulePath, 3);
    const testFiles = findTestFiles(files);
    if (testFiles.length > 0) score += 20;

    const _sourceFiles = findSourceFiles(files);
    let hasLintConfig = false;
    for (const p of [modulePath, parentDir, path.join(parentDir, '..')]) {
      for (const lintFile of ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', 'tsconfig.json', '.prettierrc']) {
        if (safeExists(path.join(p, lintFile))) { hasLintConfig = true; break; }
      }
      if (hasLintConfig) break;
    }
    if (hasLintConfig) score += 20;

    return Math.min(100, score);
  } catch {
    return 0;
  }
}

function determineStatus(score: number): 'critical' | 'warning' | 'good' | 'excellent' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

/**
 * Gera recommendations.
 * @param modules - Valor modules.
 * @returns O resultado da operação.
 */
export function generateRecommendations(modules: ModuleScore[]): string[] {
  const recommendations: string[] = [];

  for (const mod of modules) {
    if (mod.overall >= 60) continue;

    if ((mod.dimensions.profundidade || 0) < 40) {
      recommendations.push(`${mod.name}: baixa profundidade — considere adicionar mais arquivos ou estrutura de diretórios`);
    }
    if ((mod.dimensions.cobertura || 0) < 40) {
      recommendations.push(`${mod.name}: cobertura baixa — adicione relatórios de scorecard ou fortaleça definições de tipos`);
    }
    if ((mod.dimensions.risco || 0) > 60) {
      recommendations.push(`${mod.name}: risco elevado — reduza usos de any, resolva TODOs e divida arquivos grandes`);
    }
    if ((mod.dimensions.complexidade || 0) > 70) {
      recommendations.push(`${mod.name}: complexidade alta — divida módulos grandes em submódulos menores`);
    }
    if ((mod.dimensions.valor_de_negocio || 0) < 50) {
      recommendations.push(`${mod.name}: baixo valor de negócio percebido — avalie se o módulo ainda é necessário`);
    }
    if ((mod.dimensions.maturidade || 0) < 40) {
      recommendations.push(`${mod.name}: maturidade baixa — adicione README, testes e configuração de lint`);
    }
    if ((mod.dimensions.testabilidade || 0) < 30) {
      recommendations.push(`${mod.name}: testabilidade baixa — crie arquivos de teste (.test.ts) para os módulos existentes`);
    }
  }

  if (recommendations.length === 0 && modules.length > 0) {
    recommendations.push('todos os módulos estão com pontuação adequada — mantenha o padrão atual');
  }

  return recommendations;
}

/**
 * Gera granular scorecard.
 * @param projectDir - Valor dir.
 * @param options - Valor options.
 * @returns O resultado da operação.
 */
export function generateGranularScorecard(
  projectDir?: string,
  options?: { includePatterns?: string[]; excludePatterns?: string[] }
): GranularScorecard {
  const baseDir = projectDir || getIO().fs.cwd();
  const modules = discoverModules(baseDir);

  const filtered = modules.filter(mod => {
    if (options?.includePatterns && options.includePatterns.length > 0) {
      return options.includePatterns.some(p => mod.name.includes(p) || mod.path.includes(p));
    }
    if (options?.excludePatterns && options.excludePatterns.length > 0) {
      return !options.excludePatterns.some(p => mod.name.includes(p) || mod.path.includes(p));
    }
    return true;
  });

  const moduleScores: ModuleScore[] = filtered.map(mod => {
    const depth = calculateDepthScore(mod.path, baseDir);
    const coverage = calculateCoverageScore(mod.path);
    const riskResult = assessRisk(mod.path);
    const risk = riskResult.score;
    const complexity = estimateComplexity(mod.path);
    const businessValue = estimateBusinessValue(mod.path);
    const maturity = assessMaturity(mod.path);
    const testability = calculateTestability(mod.path);

    const dimensions: Record<string, number> = {
      profundidade: depth,
      cobertura: coverage,
      risco: risk,
      complexidade: complexity,
      valor_de_negocio: businessValue,
      maturidade: maturity,
      testabilidade: testability,
    };

    const overall = Math.round(
      (depth * WEIGHTS.profundidade) +
      (coverage * WEIGHTS.cobertura) +
      ((100 - risk) * WEIGHTS.risco) +
      ((100 - complexity) * WEIGHTS.complexidade) +
      (businessValue * WEIGHTS.valor_de_negocio) +
      (maturity * WEIGHTS.maturidade) +
      (testability * WEIGHTS.testabilidade)
    );

    const status = determineStatus(overall);

    return { name: mod.name, path: mod.path, dimensions, overall, status };
  });

  const dimensionAverages: Record<string, number> = {};
  for (const dim of DIMENSION_NAMES) {
    const values = moduleScores.map(m => m.dimensions[dim]).filter(v => v !== undefined);
    dimensionAverages[dim] = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 0;
  }

  const overallAvg = moduleScores.length > 0
    ? Math.round(moduleScores.reduce((a, m) => a + m.overall, 0) / moduleScores.length)
    : 0;

  let worstModule = '';
  let bestModule = '';
  if (moduleScores.length > 0) {
    let worst = Infinity;
    let best = -Infinity;
    for (const m of moduleScores) {
      if (m.overall < worst) { worst = m.overall; worstModule = m.name; }
      if (m.overall > best) { best = m.overall; bestModule = m.name; }
    }
  }

  const recommendations = generateRecommendations(moduleScores);

  return {
    generatedAt: new Date().toISOString(),
    modules: moduleScores,
    averages: dimensionAverages,
    overall: overallAvg,
    worstModule,
    bestModule,
    recommendations,
  };
}

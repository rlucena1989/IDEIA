import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

/** Interface que define a estrutura de test signals. */
export interface TestSignals {
  assertionReal: number;
  sensitiveToChange: number;
  semanticValue: number;
  deterministic: number;
  isolated: number;
  mockRobustness: number;
  usefulCoverage: number;
  completeness: number;
}

/** Interface que define a estrutura de test verdict. */
export interface TestVerdict {
  testId: string;
  filePath: string;
  score: number;
  maxScore: number;
  classification: 'valid' | 'incomplete' | 'invalid';
  signals: TestSignals;
  blockingFlags: string[];
}

const AXIS_WEIGHTS: Record<keyof TestSignals, number> = {
  assertionReal: 3,
  sensitiveToChange: 3,
  semanticValue: 3,
  deterministic: 2,
  isolated: 2,
  mockRobustness: 2,
  usefulCoverage: 2,
  completeness: 3,
};

const MAX_AXIS = 3;
/** Processa a x_ s c o r e. */
export const MAX_SCORE = Object.values(AXIS_WEIGHTS).reduce((a, b) => a + b * MAX_AXIS, 0);

/**
 * Processa test.
 * @param filePath - Valor path.
 * @param content - Valor content.
 * @returns O resultado da operação.
 */
export function classifyTest(filePath: string, content?: string): TestVerdict {
  const source = content ?? (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '');
  const lines = source.split('\n');
  const testId = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

  const signals = evaluateSignals(source, lines);
  const blockingFlags = detectBlockingFlags(source);

  const rawScore = computeRawScore(signals);
  const score = Math.round(rawScore);

  let classification: TestVerdict['classification'];
  if (blockingFlags.length > 0) {
    classification = 'invalid';
  } else {
    classification = decideClassification(signals, score);
  }

  return { testId, filePath, score, maxScore: MAX_SCORE, classification, signals, blockingFlags };
}

const STRONG_ASSERT_RE = /expect\s*\([^)]*\)\s*\.\s*(toBe|toEqual|toStrictEqual|toMatchObject|toContain|toHaveLength|toHaveProperty|toThrow)\s*\(/;
const WEAK_ASSERT_RE = /expect\s*\([^)]*\)\s*\.\s*(toBeDefined|toBeNull|toBeUndefined|toBeTruthy|toBeFalsy|toBeGreaterThan|toBeLessThan|toMatch|toContainEqual)\s*\(/;
const CALL_ASSERT_RE = /toHaveBeenCalled/;

function evaluateSignals(source: string, lines: string[]): TestSignals {
  const hasDescribe = /describe\s*\(/.test(source);
  const hasIt = /it\s*\(/.test(source);
  const hasExpect = /expect\s*\(/.test(source);
  const hasStrongAssert = STRONG_ASSERT_RE.test(source);
  const hasWeakAssert = WEAK_ASSERT_RE.test(source);
  const hasCallAssert = CALL_ASSERT_RE.test(source);
  const hasMock = /jest\.fn|jest\.spyOn|mockResolvedValue|mockImplementation/.test(source);
  const hasBeforeEach = /beforeEach\s*\(/.test(source);
  const hasAfterEach = /afterEach\s*\(/.test(source);
  const hasTryCatch = /try\s*\{[\s\S]*?catch/.test(source);
  const noopPattern = /expect\s*\(true\)\.toBe\s*\(true\)/.test(source);
  const hasExternalDep = /(fetch|axios|http\.|new\s+Date\s*\(|Math\.random)/.test(source);
  const hasLogic = lines.some(l => /\b(if\s*\(|for\s*\(|while\s*\(|switch\s*\()/.test(l));
  const itCount = (source.match(/it\s*\(/g) || []).length;
  const lineCount = lines.length;

  const assertionReal = !hasStrongAssert && !hasWeakAssert ? 0 : noopPattern ? 1 : hasStrongAssert && hasLogic ? 3 : hasStrongAssert ? 2 : 1;
  const sensitiveToChange = assertionReal >= 2 ? assertionReal : hasCallAssert && hasStrongAssert ? 2 : hasCallAssert ? 1 : 0;
  const semanticValue = hasStrongAssert && hasDescribe ? 3 : hasExpect ? 2 : 0;
  const deterministic = !hasExternalDep && !hasTryCatch ? 3 : hasBeforeEach && hasAfterEach ? 2 : 1;
  const isolated = !hasExternalDep ? 3 : hasMock ? 2 : 1;
  const mockRobustness = hasMock && !noopPattern ? 2 : !hasMock ? 3 : 1;
  const usefulCoverage = hasStrongAssert && itCount >= 2 ? 3 : hasIt ? 2 : 0;
  const completeness = lineCount > 20 && itCount >= 2 && hasBeforeEach ? 3 : lineCount > 10 && itCount >= 1 ? 2 : 1;

  return { assertionReal, sensitiveToChange, semanticValue, deterministic, isolated, mockRobustness, usefulCoverage, completeness };
}

function detectBlockingFlags(source: string): string[] {
  const flags: string[] = [];

  const hasAnyAssert = /expect\s*\(/.test(source);
  if (!hasAnyAssert) flags.push('no_useful_assertion');

  const hasStrongAssert = STRONG_ASSERT_RE.test(source);
  const hasWeakAssert = WEAK_ASSERT_RE.test(source);
  const hasCallAssert = CALL_ASSERT_RE.test(source);

  if (hasCallAssert && !hasStrongAssert && !hasWeakAssert) {
    flags.push('only_call_assertion');
  }

  if (/\/\/\s*(TODO|FIXME|HACK)/i.test(source)) {
    flags.push('comment_substitute');
  }

  if (/expect\s*\(true\)\.toBe\s*\(true\)/.test(source)) {
    flags.push('stub_terminal');
  }

  return [...new Set(flags)];
}

function computeRawScore(signals: TestSignals): number {
  let total = 0;
  for (const [axis, weight] of Object.entries(AXIS_WEIGHTS)) {
    total += (signals[axis as keyof TestSignals] || 0) * weight;
  }
  return total;
}

function decideClassification(signals: TestSignals, score: number): TestVerdict['classification'] {
  const m = (v: number) => v >= 2 ? 'high' : v === 1 ? 'medium' : 'low';

  const ar = m(signals.assertionReal);
  const sc = m(signals.sensitiveToChange);
  const sv = m(signals.semanticValue);
  const det = m(signals.deterministic);
  const comp = m(signals.completeness);

  const decisionMatrix: { ar: string; sc: string; sv: string; det: string; comp: string; result: TestVerdict['classification'] }[] = [
    { ar: 'high', sc: 'high', sv: 'high', det: 'high', comp: 'high', result: 'valid' },
    { ar: 'medium', sc: 'high', sv: 'high', det: 'high', comp: 'medium', result: 'incomplete' },
    { ar: 'low', sc: 'low', sv: 'low', det: 'high', comp: 'high', result: 'invalid' },
    { ar: 'high', sc: 'medium', sv: 'medium', det: 'medium', comp: 'low', result: 'incomplete' },
    { ar: 'low', sc: 'medium', sv: 'low', det: 'medium', comp: 'low', result: 'invalid' },
  ];

  for (const row of decisionMatrix) {
    if (ar === row.ar && sc === row.sc && sv === row.sv && det === row.det && comp === row.comp) {
      return row.result;
    }
  }

  const ratio = score / MAX_SCORE;
  if (ar === 'high' && ratio >= 0.5) return 'valid';
  if (ar === 'low' && sc === 'low' && sv === 'low') return 'invalid';
  if (ar === 'medium' && (sc === 'low' || sv === 'low')) return 'incomplete';
  if (ratio >= 0.6) return 'valid';
  if (ratio >= 0.3) return 'incomplete';
  return 'invalid';
}

/**
 * Processa directory.
 * @param dirPath - Valor path.
 * @returns O resultado da operação.
 */
export function evaluateDirectory(dirPath: string): TestVerdict[] {
  const results: TestVerdict[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...evaluateDirectory(fullPath));
    } else if (
      entry.name.endsWith('.test.ts') ||
      entry.name.endsWith('.spec.ts') ||
      entry.name.endsWith('.test.tsx') ||
      entry.name.endsWith('.spec.tsx') ||
      entry.name.endsWith('.test.js') ||
      entry.name.endsWith('.spec.js')
    ) {
      try {
        results.push(classifyTest(fullPath));
      } catch {}
    }
  }
  return results;
}

/**
 * Resume results.
 * @param results - Valor results.
 * @returns O resultado da operação.
 */
export function summarizeResults(results: TestVerdict[]): {
  total: number;
  valid: number;
  incomplete: number;
  invalid: number;
  averageScore: number;
} {
  const counts = { total: results.length, valid: 0, incomplete: 0, invalid: 0, averageScore: 0 };
  let scoreSum = 0;
  for (const r of results) {
    if (r.classification === 'valid') counts.valid++;
    else if (r.classification === 'incomplete') counts.incomplete++;
    else counts.invalid++;
    scoreSum += r.score;
  }
  counts.averageScore = results.length > 0 ? Math.round(scoreSum / results.length) : 0;
  return counts;
}

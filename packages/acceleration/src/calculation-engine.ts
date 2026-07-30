import { ComplexityLevel } from './types';
import { createLogger } from '@ideia/logger';
import { evaluateSimpleMath, extractNumbers } from './math-parser';
import { evaluateFormula } from './formula-registry';
import { summary, median, correlation, linearRegression } from './stats-engine';
import { mean, stddev, variance, sum, sumKahan } from './numerical-engine';
import * as physics from './physics-engine';
import { IncrementalEngine } from './incremental-engine';

const DOMAIN_PRECISION_MAP: Record<string, number> = {
  finance: 2,
  physics: 4,
  engineering: 3,
  statistics: 6,
  general: 4,
};

export type CalculationRequest = {
  type: 'math' | 'statistics' | 'physics' | 'formula' | 'symbolic' | 'auto';
  input: string;
  params?: number[];
  formulaName?: string;
  precision?: number;
};

export type CalculationResult = {
  success: boolean;
  result: unknown;
  method: string;
  durationMs: number;
  precision?: number;
  domain?: string;
};

function detectDomain(input: string): string {
  const lower = input.toLowerCase();
  if (/correlation|variance|stddev|statistics|median|regression/.test(lower)) return 'statistics';
  if (/force|energy|velocity|physics|gravity|momentum|f=ma/.test(lower)) return 'physics';
  if (/bmi|imc|density|area|engineering|volume/.test(lower)) return 'engineering';
  if (/cost|price|budget|finance|usd|dollar/.test(lower)) return 'finance';
  return 'general';
}

function domainPrecision(domain: string): number {
  return DOMAIN_PRECISION_MAP[domain] ?? DOMAIN_PRECISION_MAP.general;
}

function withMeta<T>(result: T, method: string, ms: number, input: string): CalculationResult {
  const domain = detectDomain(input);
  const prec = domainPrecision(domain);
  const out: CalculationResult = { success: true, result, method, durationMs: ms, precision: prec, domain };
  if (typeof result === 'number') {
    const f = 10 ** prec;
    out.result = Math.round(result * f) / f;
  }
  return out;
}

export function executeCalculation(req: CalculationRequest): CalculationResult {
  const start = Date.now();

  try {
    if ((req.type === 'math' || req.type === 'auto') && /[+\-*/^%]/.test(req.input)) {
      const simple = evaluateSimpleMath(req.input);
      if (simple !== null) return withMeta(simple, 'math.evaluateSimpleMath', Date.now() - start, req.input);
    }

    if (req.type === 'statistics' && req.params) {
      const data = req.params;
      if (req.input.includes('median')) return withMeta(median(data), 'stats.median', Date.now() - start, req.input);
      if (req.input.includes('correlation') && data.length >= 2) {
        const half = Math.floor(data.length / 2);
        return withMeta(correlation(data.slice(0, half), data.slice(half)), 'stats.correlation', Date.now() - start, req.input);
      }
      if (req.input.includes('regression') && data.length >= 4) {
        const half = Math.floor(data.length / 2);
        return withMeta(linearRegression(data.slice(0, half), data.slice(half)), 'stats.linearRegression', Date.now() - start, req.input);
      }
      if (req.input.includes('stddev')) return withMeta(stddev(data), 'stats.stddev', Date.now() - start, req.input);
      if (req.input.includes('variance')) return withMeta(variance(data), 'stats.variance', Date.now() - start, req.input);
      if (req.input.includes('mean') || req.input.includes('average')) return withMeta(mean(data), 'stats.mean', Date.now() - start, req.input);
      return withMeta(summary(data), 'stats.summary', Date.now() - start, req.input);
    }

    if (req.type === 'physics' && req.params) {
      const [a, b] = req.params;
      if (req.input.includes('force') || /f\s*=\s*m\s*a/i.test(req.input)) return withMeta(physics.force(a, b), 'physics.force', Date.now() - start, req.input);
      if (req.input.includes('kinetic') || req.input.includes('energy')) return withMeta(physics.kineticEnergy(a, b), 'physics.kineticEnergy', Date.now() - start, req.input);
      if (req.input.includes('potential') || req.input.includes('height')) return withMeta(physics.potentialEnergy(a, b), 'physics.potentialEnergy', Date.now() - start, req.input);
      return withMeta(physics.force(a, b), 'physics.force', Date.now() - start, req.input);
    }

    if (req.type === 'formula' && req.formulaName && req.params) {
      const result = evaluateFormula(req.formulaName, ...req.params);
      if (result !== null) return withMeta(result, `formula.${req.formulaName}`, Date.now() - start, req.input);
    }

    if (req.type === 'auto' || (req.type === 'statistics' && !req.params)) {
      const lower = req.input.toLowerCase();
      const arrays = [...req.input.matchAll(/\[([^\]]+)\]/g)].map(m =>
        m[1].split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n))
      );
      const nums = extractNumbers(req.input);

      if (/correlation|correlação/.test(lower) && arrays.length >= 2) {
        return withMeta(correlation(arrays[0], arrays[1]), 'auto.correlation', Date.now() - start, req.input);
      }

      if (nums.length > 0) {
        if (/f\s*=\s*m\s*\*?\s*a/i.test(lower)) {
          return withMeta(physics.force(nums[0], nums[1]), 'auto.force', Date.now() - start, req.input);
        }
        if (/mean|average|média/.test(lower)) return withMeta(mean(nums), 'auto.mean', Date.now() - start, req.input);
        if (/stddev|desvio/.test(lower)) return withMeta(stddev(nums), 'auto.stddev', Date.now() - start, req.input);
        if (/variance|variância/.test(lower)) return withMeta(variance(nums), 'auto.variance', Date.now() - start, req.input);
        if (/median|mediana/.test(lower)) return withMeta(median(nums), 'auto.median', Date.now() - start, req.input);
        if (/force|força|fisica|physics/.test(lower)) return withMeta(physics.force(nums[0], nums[1]), 'auto.force', Date.now() - start, req.input);
        if (/bmi|imc/.test(lower)) {
          const weight = nums[0];
          const height = nums[1];
          return withMeta(Math.round((weight / (height * height)) * 100) / 100, 'auto.bmi', Date.now() - start, req.input);
        }
        const total = sum(nums);
        return { success: true, result: { sum: total, count: nums.length, mean: mean(nums), min: Math.min(...nums), max: Math.max(...nums) }, method: 'auto.extract', durationMs: Date.now() - start, domain: detectDomain(req.input), precision: domainPrecision(detectDomain(req.input)) };
      }
    }

    return { success: false, result: null, method: 'none', durationMs: Date.now() - start };
  } catch (_err) {
    return { success: false, result: String(_err), method: 'error', durationMs: Date.now() - start };
  }
}

export function isLocallySolvable(input: string): boolean {
  const lowered = input.toLowerCase();
  const patterns = [/[+\-*/]/, /\bsum\b/, /\bmean\b/, /\baverage\b/, /\bm[ée]dia\b/, /\btotal\b/, /\bstddev\b/, /\bvariance\b/, /\bvariância\b/, /\bdesvio\b/, /\bforce\b/, /\bforça\b/, /\bf\s*=\s*m\s*a\b/, /\benergy\b/, /\benergia\b/, /\bbmi\b/, /\bimc\b/, /\bdiscount\b/, /\barea\b/, /\bcircumference\b/, /\bcorrelation\b/, /\bcorrelação\b/];
  return patterns.some(p => p.test(lowered));
}

// --- Incremental cache integration (opt-in) ---

const calcCache = new IncrementalEngine();

function cacheKey(req: CalculationRequest): string {
  return `calc:${req.type}:${req.input}:${req.formulaName ?? ''}`;
}

function cacheInputs(req: CalculationRequest): unknown[] {
  return [req.input, req.params ?? [], req.formulaName ?? ''];
}

export function calculateCached(req: CalculationRequest): CalculationResult {
  return calcCache.compute<CalculationResult>(
    cacheKey(req),
    cacheInputs(req),
    () => executeCalculation(req),
  );
}

export function clearCalcCache(): void {
  calcCache.clear();
}

export function markCalcDirty(key?: string): void {
  if (key) {
    calcCache.markDirty(key);
  } else {
    calcCache.markAllDirty();
  }
}

export function getCalcCacheStats(): { entries: number; hits: number; misses: number; dirtyCount: number; hitRate: number } {
  return calcCache.getStats();
}

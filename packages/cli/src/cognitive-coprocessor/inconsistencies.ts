import type { InconsistencyOutput, Inconsistency, Rule } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('inconsistencies');

function detectLogical(raw: unknown): Inconsistency[] {
  const results: Inconsistency[] = [];
  if (raw === null || raw === undefined || typeof raw !== 'object') return results;

  const obj = raw as Record<string, unknown>;

  if (obj.positive === true && obj.negative === true) {
    results.push({ field: 'positive/negative', type: 'logical', message: 'Campo positive e negative são ambos true', severity: 'high', confidence: 0.95 });
  }
  if (typeof obj.min === 'number' && typeof obj.max === 'number' && obj.min > obj.max) {
    results.push({ field: 'min/max', type: 'logical', message: `min (${obj.min}) é maior que max (${obj.max})`, severity: 'high', confidence: 0.95 });
  }
  if (typeof obj.start_date === 'string' && typeof obj.end_date === 'string' && obj.start_date > obj.end_date) {
    results.push({ field: 'start_date/end_date', type: 'logical', message: 'start_date é posterior a end_date', severity: 'high', confidence: 0.9 });
  }
  return results;
}

function detectNumerical(raw: unknown): Inconsistency[] {
  const results: Inconsistency[] = [];
  if (raw === null || raw === undefined || typeof raw !== 'object') return results;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.total === 'number' && Array.isArray(obj.items)) {
    const itemSum = obj.items.reduce((s: number, v: unknown) => s + (typeof v === 'number' ? v : 0), 0);
    if (Math.abs(itemSum - obj.total) > 0.01) {
      results.push({ field: 'total/items', type: 'numerical', message: `Soma dos itens (${itemSum}) difere do total (${obj.total})`, severity: 'high', confidence: 0.9 });
    }
  }

  if (typeof obj.percentage === 'number' && (obj.percentage < 0 || obj.percentage > 100)) {
    results.push({ field: 'percentage', type: 'numerical', message: `Percentual ${obj.percentage} fora do intervalo [0,100]`, severity: 'medium', confidence: 1 });
  }
  return results;
}

function detectPolicy(raw: unknown, rules?: Rule[]): Inconsistency[] {
  const results: Inconsistency[] = [];
  if (!rules || rules.length === 0 || raw === null || raw === undefined || typeof raw !== 'object') return results;
  const obj = raw as Record<string, unknown>;

  for (const rule of rules) {
    const value = obj[rule.field];
    if (value === undefined) continue;

    switch (rule.condition) {
      case 'eq':
        if (value !== rule.expected) {
          results.push({ field: rule.field, type: 'policy', message: `Valor ${value} difere do esperado ${rule.expected}`, severity: 'medium', confidence: 0.85 });
        }
        break;
      case 'gt':
        if (typeof value === 'number' && typeof rule.expected === 'number' && value <= rule.expected) {
          results.push({ field: rule.field, type: 'policy', message: `Valor ${value} não é maior que ${rule.expected}`, severity: 'medium', confidence: 0.85 });
        }
        break;
      case 'lt':
        if (typeof value === 'number' && typeof rule.expected === 'number' && value >= rule.expected) {
          results.push({ field: rule.field, type: 'policy', message: `Valor ${value} não é menor que ${rule.expected}`, severity: 'medium', confidence: 0.85 });
        }
        break;
      case 'in_range': {
        const [lo, hi] = rule.expected as [number, number];
        if (typeof value === 'number' && (value < lo || value > hi)) {
          results.push({ field: rule.field, type: 'policy', message: `Valor ${value} fora do intervalo [${lo}, ${hi}]`, severity: 'medium', confidence: 0.9 });
        }
        break;
      }
    }
  }
  return results;
}

function aggregateSeverity(inconsistencies: Inconsistency[]): 'none' | 'low' | 'medium' | 'high' {
  if (inconsistencies.length === 0) return 'none';
  if (inconsistencies.some(i => i.severity === 'high')) return 'high';
  if (inconsistencies.some(i => i.severity === 'medium')) return 'medium';
  return 'low';
}

/**
 * Detecta inconsistencies.
 * @param data - Valor data.
 * @param rules - Valor rules.
 * @returns O resultado da operação.
 */
export function detectInconsistencies(data: unknown, rules?: Rule[]): InconsistencyOutput {
  const logical = detectLogical(data);
  const numerical = detectNumerical(data);
  const policy = detectPolicy(data, rules);
  const all = [...logical, ...numerical, ...policy];

  const confidence = all.length > 0
    ? Math.round(all.reduce((s, i) => s + i.confidence, 0) / all.length * 100) / 100
    : 1;

  return {
    inconsistencies: all,
    severity: aggregateSeverity(all),
    confidence,
  };
}

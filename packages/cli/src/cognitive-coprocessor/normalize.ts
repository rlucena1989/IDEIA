import type { NormalizedOutput, Anomaly, Feature, Metadata } from './types';
import { createLogger } from '@ideia/logger';

function detectType(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function detectAnomalies(raw: unknown, path: string = ''): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (raw === null || raw === undefined) {
    anomalies.push({ field: path || 'root', type: 'null', message: 'Valor nulo ou indefinido', severity: 'high' });
    return anomalies;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      anomalies.push(...detectAnomalies(val, path ? `${path}.${key}` : key));
    }
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      anomalies.push({ field: path || 'root', type: 'inconsistent', message: 'Array vazio', severity: 'low' });
    }
    raw.forEach((item, i) => anomalies.push(...detectAnomalies(item, `${path}[${i}]`)));
  }
  if (typeof raw === 'number' && (isNaN(raw) || !isFinite(raw))) {
    anomalies.push({ field: path || 'root', type: 'out_of_range', message: `Valor numérico inválido: ${raw}`, severity: 'high' });
  }
  return anomalies;
}

function extractFeatures(raw: unknown): Feature[] {
  const features: Feature[] = [];
  if (raw === null || raw === undefined) return features;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const entries = Object.entries(raw as Record<string, unknown>);
    features.push({ name: 'field_count', value: entries.length, category: 'structure' });
    const types = entries.map(([, v]) => detectType(v));
    const typeCounts = types.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {} as Record<string, number>);
    features.push({ name: 'type_distribution', value: JSON.stringify(typeCounts), category: 'structure' });
  }
  if (Array.isArray(raw)) {
    features.push({ name: 'array_length', value: raw.length, category: 'structure' });
    const numericValues = raw.filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (numericValues.length > 0) {
      features.push({ name: 'numeric_count', value: numericValues.length, category: 'content' });
      features.push({ name: 'numeric_min', value: Math.min(...numericValues), category: 'statistics' });
      features.push({ name: 'numeric_max', value: Math.max(...numericValues), category: 'statistics' });
    }
  }
  if (typeof raw === 'string') {
    features.push({ name: 'string_length', value: raw.length, category: 'content' });
    features.push({ name: 'word_count', value: raw.split(/\s+/).filter(Boolean).length, category: 'content' });
  }
  return features;
}

/**
 * Normaliza input.
 * @param raw - Valor raw.
 * @param schema - Valor schema.
 * @returns O resultado da operação.
 */
export function normalizeInput(raw: unknown, schema?: { validate: (data: unknown) => { success: boolean; error?: string } }): NormalizedOutput {
  const start = Date.now();
  const anomalies = detectAnomalies(raw);
  const features = extractFeatures(raw);
  let schemaValid = true;
  if (schema) {
    const result = schema.validate(raw);
    schemaValid = result.success;
    if (!result.success) {
      anomalies.push({ field: 'schema', type: 'type_mismatch', message: result.error || 'Falha na validação do schema', severity: 'high' });
    }
  }
  let normalized = raw;
  if (typeof raw === 'string') {
    normalized = raw.trim().replace(/\s+/g, ' ');
  }
  if (Array.isArray(raw)) {
    normalized = raw.filter(v => v !== null && v !== undefined);
  }
  return {
    normalized,
    anomalies,
    features,
    metadata: {
      inputType: detectType(raw),
      recordCount: Array.isArray(raw) ? raw.length : 1,
      schemaValid,
      processingTimeMs: Date.now() - start,
    },
  };
}

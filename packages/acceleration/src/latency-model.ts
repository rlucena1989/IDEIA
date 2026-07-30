import { ProviderKind } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('latency-model');

export interface LatencyEntry {
  provider: ProviderKind;
  model: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

const LATENCY_TABLE: LatencyEntry[] = [
  { provider: 'openai', model: 'gpt-4o', p50Ms: 800, p95Ms: 3000, p99Ms: 8000 },
  { provider: 'openai', model: 'gpt-4o-mini', p50Ms: 400, p95Ms: 1500, p99Ms: 4000 },
  { provider: 'anthropic', model: 'claude-3.5-sonnet', p50Ms: 600, p95Ms: 2500, p99Ms: 6000 },
  { provider: 'anthropic', model: 'claude-3-haiku', p50Ms: 300, p95Ms: 1200, p99Ms: 3000 },
  { provider: 'google', model: 'gemini-2.0-flash', p50Ms: 500, p95Ms: 2000, p99Ms: 5000 },
  { provider: 'local', model: 'llama-3-8b', p50Ms: 100, p95Ms: 500, p99Ms: 1500 },
  { provider: 'local', model: 'mistral-7b', p50Ms: 80, p95Ms: 400, p99Ms: 1200 },
  { provider: 'ollama', model: 'llama3', p50Ms: 50, p95Ms: 300, p99Ms: 800 },
  { provider: 'mock', model: 'mock-v1', p50Ms: 1, p95Ms: 5, p99Ms: 10 },
];

export function getLatency(provider: ProviderKind, model: string): LatencyEntry | undefined {
  return LATENCY_TABLE.find(e => e.provider === provider && e.model === model);
}

export function estimateLatencyMs(provider: ProviderKind, model: string, tokens: number): number {
  const entry = getLatency(provider, model);
  if (!entry) return 1000;
  const base = entry.p50Ms;
  const perTokenMultiplier = Math.max(tokens / 1000, 0.1);
  return Math.round(base * perTokenMultiplier);
}

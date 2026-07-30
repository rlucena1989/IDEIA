import { ProviderKind } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cost-model');

export interface CostEntry {
  provider: ProviderKind;
  model: string;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  maxTokens: number;
}

const COST_TABLE: CostEntry[] = [
  { provider: 'openai', model: 'gpt-4o', costPer1kInputTokens: 0.01, costPer1kOutputTokens: 0.03, maxTokens: 128000 },
  { provider: 'openai', model: 'gpt-4o-mini', costPer1kInputTokens: 0.0015, costPer1kOutputTokens: 0.006, maxTokens: 128000 },
  { provider: 'anthropic', model: 'claude-3.5-sonnet', costPer1kInputTokens: 0.003, costPer1kOutputTokens: 0.015, maxTokens: 200000 },
  { provider: 'anthropic', model: 'claude-3-haiku', costPer1kInputTokens: 0.00025, costPer1kOutputTokens: 0.00125, maxTokens: 200000 },
  { provider: 'google', model: 'gemini-2.0-flash', costPer1kInputTokens: 0.0001, costPer1kOutputTokens: 0.0004, maxTokens: 1048576 },
  { provider: 'local', model: 'llama-3-8b', costPer1kInputTokens: 0.0001, costPer1kOutputTokens: 0.0002, maxTokens: 8192 },
  { provider: 'local', model: 'mistral-7b', costPer1kInputTokens: 0.0001, costPer1kOutputTokens: 0.0002, maxTokens: 8192 },
  { provider: 'ollama', model: 'llama3', costPer1kInputTokens: 0.00005, costPer1kOutputTokens: 0.0001, maxTokens: 8192 },
  { provider: 'mock', model: 'mock-v1', costPer1kInputTokens: 0.0, costPer1kOutputTokens: 0.0, maxTokens: 999999 },
];

export function getCostEntry(provider: ProviderKind, model: string): CostEntry | undefined {
  return COST_TABLE.find(e => e.provider === provider && e.model === model);
}

export function calculateCost(entry: CostEntry, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * entry.costPer1kInputTokens + (outputTokens / 1000) * entry.costPer1kOutputTokens;
}

export function listModels(provider?: ProviderKind): CostEntry[] {
  return provider ? COST_TABLE.filter(e => e.provider === provider) : [...COST_TABLE];
}

export function cheapestModel(provider: ProviderKind): CostEntry {
  const models = COST_TABLE.filter(e => e.provider === provider).sort((a, b) => a.costPer1kInputTokens - b.costPer1kInputTokens);
  return models[0];
}

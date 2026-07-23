import crypto from 'node:crypto';
import { ExperimentRun, ExperimentResult } from './types';
import { findModelInRegistry } from './registry';
import { getProvider } from '../provider-router';

function generateId(): string {
  return crypto.randomUUID().substring(0, 8);
}

function computeCost(modelId: string, tokensIn: number, tokensOut: number, root: string): number {
  const reg = findModelInRegistry(root, modelId);
  if (!reg) return 0;
  return (tokensIn / 1000) * reg.costPer1KInput + (tokensOut / 1000) * reg.costPer1KOutput;
}

function computeQualityScore(response: string): number {
  const trimmed = response.trim();
  if (!trimmed) return 0;
  const wordCount = trimmed.split(/\s+/).length;
  const charCount = trimmed.length;
  const avgWordLen = charCount / Math.max(wordCount, 1);
  const uniqueWords = new Set(trimmed.toLowerCase().split(/\s+/)).size;
  const lexicalDiversity = uniqueWords / Math.max(wordCount, 1);
  const lengthScore = Math.min(wordCount / 50, 1) * 40;
  const diversityScore = Math.min(lexicalDiversity / 0.7, 1) * 30;
  const structureScore = (trimmed.includes('\n') || trimmed.includes('.') ? 20 : 5);
  const avgWordScore = Math.max(0, 30 - Math.abs(avgWordLen - 5) * 5);
  return Math.min(100, Math.round(lengthScore + diversityScore + structureScore + avgWordScore));
}

async function querySingleModel(
  prompt: string,
  modelId: string,
  provider: string,
  root: string,
  timeoutMs: number
): Promise<ExperimentResult> {
  const start = Date.now();
  try {
    if (provider === 'ollama') {
      const { queryOllama } = await import('../ollama');
      const content = await queryOllama(prompt, modelId, root, 'experiment', timeoutMs);
      const latencyMs = Date.now() - start;
      const tokensOut = content.split(/\s+/).length;
      const tokensIn = prompt.split(/\s+/).length;
      return {
        modelId, provider, response: content, latencyMs,
        tokensIn, tokensOut, costUsd: computeCost(modelId, tokensIn, tokensOut, root),
        status: 'success', qualityScore: computeQualityScore(content),
      };
    }
    const providerInstance = getProvider(provider);
    if (!providerInstance) {
      return { modelId, provider, response: '', latencyMs: 0, tokensIn: 0, tokensOut: 0, costUsd: 0, status: 'error', error: `Provider "${provider}" nao encontrado` };
    }
    const result = await providerInstance.query(prompt, modelId, { timeoutMs });
    const latencyMs = Date.now() - start;
    const tokensOut = result.content.split(/\s+/).length;
    const tokensIn = prompt.split(/\s+/).length;
    return {
      modelId, provider, response: result.content, latencyMs,
      tokensIn, tokensOut, costUsd: computeCost(modelId, tokensIn, tokensOut, root),
      status: 'success', qualityScore: computeQualityScore(result.content),
    };
  } catch (_err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { modelId, provider, response: '', latencyMs: Date.now() - start, tokensIn: 0, tokensOut: 0, costUsd: 0, status: 'error', error: msg };
  }
}

/**
 * Executa experiment.
 * @param prompt - Valor prompt.
 * @param models - Valor models.
 * @param root - Valor root.
 * @param options - Valor options.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function runExperiment(
  prompt: string,
  models: Array<{ modelId: string; provider: string }>,
  root: string,
  options: { parallel?: boolean; timeoutMs?: number } = {}
): Promise<ExperimentRun> {
  const timeoutMs = options.timeoutMs || 30000;
  const id = generateId();
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

  const query = (m: { modelId: string; provider: string }) => querySingleModel(prompt, m.modelId, m.provider, root, timeoutMs);

  let results: ExperimentResult[];
  if (options.parallel !== false) {
    results = await Promise.allSettled(models.map(query)).then(r =>
      r.map((res, i) => res.status === 'fulfilled' ? res.value : ({ modelId: models[i]!.modelId, provider: models[i]!.provider, response: '', latencyMs: 0, tokensIn: 0, tokensOut: 0, costUsd: 0, status: 'error', error: res.reason?.message || 'Promise rejected' } as ExperimentResult))
    );
  } else {
    results = [];
    for (const m of models) {
      results.push(await query(m));
    }
  }

  return {
    id, prompt, promptHash,
    createdAt: new Date().toISOString(),
    results,
  };
}

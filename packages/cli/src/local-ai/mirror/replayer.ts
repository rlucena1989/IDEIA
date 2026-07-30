import { MirrorEntry, ReplayResult } from './types';
import { createLogger } from '@ideia/logger';
import { getProvider } from '../provider-router';

function cosineSimilarity(a: string, b: string): number {
  const tokenize = (s: string): string[] => s.toLowerCase().split(/\W+/).filter(Boolean);
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const allTokens = new Set([...tokensA, ...tokensB]);
  const vecA = Array.from(allTokens).map(t => tokensA.filter(x => x === t).length);
  const vecB = Array.from(allTokens).map(t => tokensB.filter(x => x === t).length);
  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

/**
 * Processa entry.
 * @param original - Valor original.
 * @param root - Valor root.
 * @param options - Valor options.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function replayEntry(
  original: MirrorEntry,
  root: string,
  options?: { modelId?: string; provider?: string; timeoutMs?: number }
): Promise<ReplayResult> {
  if (!original) throw new Error('original is required');
  const modelId = options?.modelId || original.modelId;
  const provider = options?.provider || original.provider;
  const timeoutMs = options?.timeoutMs || 30000;

  const start = Date.now();
  let replayResponse: string;
  let replayStatus: 'success' | 'error';
  let replayError: string | undefined;

  try {
    if (provider === 'ollama') {
      const { queryOllama } = await import('../ollama');
      replayResponse = await queryOllama(original.prompt, modelId, root, 'mirror-replay', timeoutMs);
    } else {
      const providerInstance = getProvider(provider);
      if (!providerInstance) throw new Error(`Provider "${provider}" nao encontrado`);
      const result = await providerInstance.query(original.prompt, modelId, { timeoutMs });
      replayResponse = result.content;
    }
    replayStatus = 'success';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    replayResponse = '';
    replayStatus = 'error';
    replayError = msg;
  }

  const latencyMs = Date.now() - start;
  const tokensIn = original.prompt.split(/\s+/).length;
  const tokensOut = replayResponse ? replayResponse.split(/\s+/).length : 0;

  const diff = {
    identical: original.response === replayResponse,
    similarityScore: replayResponse ? cosineSimilarity(original.response, replayResponse) : 0,
    lengthDelta: replayResponse ? (replayResponse.length - original.response.length) / Math.max(original.response.length, 1) : 0,
  };

  return {
    original,
    replay: {
      response: replayResponse,
      latencyMs,
      tokensIn,
      tokensOut,
      costUsd: 0,
      modelId,
      provider,
      status: replayStatus,
      error: replayError,
    },
    diff,
  };
}

/**
 * Formata replay result.
 * @param result - Valor result.
 * @returns O resultado da operação.
 */
export function formatReplayResult(result: ReplayResult): string {
  const lines: string[] = [];
  lines.push('=== Replay Result ===');
  lines.push('');
  lines.push('Original:');
  lines.push(`  Modelo: ${result.original.modelId} (${result.original.provider})`);
  lines.push(`  Latencia: ${result.original.latencyMs}ms`);
  lines.push(`  Tokens: ${result.original.tokensIn} in / ${result.original.tokensOut} out`);
  lines.push('');
  lines.push('Replay:');
  lines.push(`  Modelo: ${result.replay.modelId} (${result.replay.provider})`);
  lines.push(`  Status: ${result.replay.status === 'success' ? '✅' : '❌'} ${result.replay.status}`);
  lines.push(`  Latencia: ${result.replay.latencyMs}ms`);
  lines.push(`  Tokens: ${result.replay.tokensIn} in / ${result.replay.tokensOut} out`);
  lines.push('');
  lines.push('Diff:');
  lines.push(`  Identico: ${result.diff.identical ? '✅ Sim' : '❌ Nao'}`);
  lines.push(`  Similaridade: ${(result.diff.similarityScore * 100).toFixed(1)}%`);
  lines.push(`  Variacao tamanho: ${(result.diff.lengthDelta * 100).toFixed(1)}%`);
  if (result.replay.error) lines.push(`  Erro: ${result.replay.error}`);
  return lines.join('\n');
}

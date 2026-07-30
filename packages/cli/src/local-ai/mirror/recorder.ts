import crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
import { MirrorEntry } from './types';
import { loadMirrorConfig, appendEntry } from './ledger';

let root: string = '';

/**
 * Define mirror root.
 * @param r - Valor r.
 */
export function setMirrorRoot(r: string): void {
  root = r;
}

/**
 * Verifica se mirror active.
 * @returns O resultado da operação.
 */
export function isMirrorActive(): boolean {
  if (!root) return false;
  const config = loadMirrorConfig(root);
  return config.enabled;
}

/**
 * Verifica se privacy mode.
 * @returns O resultado da operação.
 */
export function isPrivacyMode(): boolean {
  if (!root) return false;
  const config = loadMirrorConfig(root);
  return config.privacy_mode;
}

/**
 * Processa call.
 * @param prompt - Valor prompt.
 * @param response - Valor response.
 * @param modelId - Valor id.
 * @param provider - Valor provider.
 * @param latencyMs - Valor ms.
 * @param tokensIn - Valor in.
 * @param tokensOut - Valor out.
 * @param costUsd - Valor usd.
 * @param command - Valor command.
 * @param status - Valor status.
 * @param error - Valor error.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function recordCall(
  prompt: string,
  response: string,
  modelId: string,
  provider: string,
  latencyMs: number,
  tokensIn: number,
  tokensOut: number,
  costUsd: number,
  command: string,
  status: 'success' | 'error',
  error?: string
): Promise<MirrorEntry | null> {
  if (!isMirrorActive()) return null;

  const privacy = isPrivacyMode();
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
  const responseHash = crypto.createHash('sha256').update(response).digest('hex');

  return appendEntry(root, {
    timestamp: new Date().toISOString(),
    promptHash,
    prompt: privacy ? '' : prompt,
    responseHash,
    response: privacy ? '' : response,
    modelId,
    provider,
    latencyMs,
    tokensIn,
    tokensOut,
    costUsd,
    command,
    status,
    error,
  });
}

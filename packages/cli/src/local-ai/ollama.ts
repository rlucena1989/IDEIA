import fs from 'node:fs';
import path from 'node:path';
import { InferenceLogEntry, hashPrompt } from './classifier';
import { recordCall } from './mirror/recorder';
import { loadConfig } from './config';

const INFERENCES_LOG = '.ai/reports/local-ai/inferences.jsonl';

/**
 * Consulta ollama.
 * @param prompt - Valor prompt.
 * @param model - Valor model.
 * @param root - Valor root.
 * @param route - Valor route.
 * @param timeoutMs - Valor ms.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function queryOllama(
  prompt: string,
  model: string,
  root: string,
  route: string,
  timeoutMs: number = 30000
): Promise<string> {
  const start = Date.now();
  const ph = hashPrompt(prompt);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const cfg = loadConfig(root);
    const baseUrl = cfg.ollama.base_url.replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`ollama HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json() as { response?: string; eval_count?: number };
    clearTimeout(timer);
    const duration = Date.now() - start;
    const content = (data.response || '').trim();

    logInference(root, { timestamp: new Date().toISOString(), route, model, prompt_hash: ph, tokens: data.eval_count, duration_ms: duration, success: true });

    const tokensIn = prompt.split(/\s+/).length;
    const tokensOut = content.split(/\s+/).length;
    recordCall(prompt, content, model, 'ollama', duration, tokensIn, tokensOut, 0, route, 'success').catch(() => {});

    return content;
  } catch (_err) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    logInference(root, { timestamp: new Date().toISOString(), route, model, prompt_hash: ph, duration_ms: duration, success: false, error: msg });
    recordCall(prompt, '', model, 'ollama', duration, 0, 0, 0, route, 'error', msg).catch(() => {});
    throw err;
  }
}

function logInference(root: string, entry: InferenceLogEntry): void {
  const logPath = path.join(root, INFERENCES_LOG);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
}

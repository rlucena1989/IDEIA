import { AiProvider, ProviderConfig, ProviderResponse } from './providers/index';
import { OpenAiProvider } from './providers/openai';
import { OpenRouterProvider } from './providers/openrouter';
import { AnthropicProvider } from './providers/anthropic';
import { GoogleProvider } from './providers/google';
import { AwsProvider } from './providers/aws';
import { loadConfig, saveConfig, DEFAULT_PROVIDER_PRIORITY } from './config';
import { queryOllama } from './ollama';
import fs from 'node:fs';
import path from 'node:path';
import { recordCall } from './mirror/recorder';

interface LatencyEntry {
  provider: string;
  model: string;
  latencyMs: number;
  timestamp: number;
  success: boolean;
}

const LATENCY_LOG = '.ai/reports/local-ai/routing.jsonl';

const providers: Record<string, AiProvider> = {
  openai: new OpenAiProvider(),
  openrouter: new OpenRouterProvider(),
  anthropic: new AnthropicProvider(),
  google: new GoogleProvider(),
  aws: new AwsProvider(),
};

/**
 * Obtém provider.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function getProvider(name: string): AiProvider | undefined {
  return providers[name];
}

/**
 * Obtém all providers.
 * @returns O resultado da operação.
 */
export function getAllProviders(): AiProvider[] {
  return Object.values(providers);
}

/**
 * Obtém available providers na ordem de prioridade da config.
 * @param root - Diretório raiz do projeto.
 * @returns Lista de providers disponíveis na ordem configurada.
 */
export function getAvailableProviders(root: string): AiProvider[] {
  const config = loadConfig(root);
  const priority = config.provider_priority || DEFAULT_PROVIDER_PRIORITY;
  const configs = config.provider_configs || {};

  return priority
    .map(name => {
      const provider = providers[name];
      if (!provider) return null;
      const entry = configs[name];
      if (entry && entry.enabled === false) return null;
      return provider;
    })
    .filter((p): p is AiProvider => p !== null);
}

/**
 * Consulta provider.
 * @param prompt - Valor prompt.
 * @param providerName - Valor name.
 * @param modelId - Valor id.
 * @param root - Valor root.
 * @param config - Valor config.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function queryProvider(
  prompt: string,
  providerName: string,
  modelId: string,
  root: string,
  config?: ProviderConfig
): Promise<ProviderResponse> {
  const start = Date.now();
  const safePrompt = prompt || '';
  const safeProvider = providerName || 'unknown';
  const safeModel = modelId || 'default';
  const tokensIn = safePrompt.split(/\s+/).length;

  try {
    if (safeProvider === 'ollama') {
      const content = await queryOllama(safePrompt, safeModel, root, 'provider-query', config?.timeoutMs || 30000);
      const latencyMs = Date.now() - start;
      const tokensOut = content.split(/\s+/).length;
    recordCall(safePrompt, content, safeModel, 'ollama', latencyMs, tokensIn, tokensOut, 0, 'provider-query', 'success').catch(() => {});
    return { content, model: safeModel, provider: 'ollama', latencyMs };
  }

  const provider = getProvider(safeProvider);
  if (!provider) return { content: '', model: safeModel, provider: safeProvider, latencyMs: Date.now() - start };

  const result = await provider.query(safePrompt, safeModel, config);
    const latencyMs = Date.now() - start;
    const tokensOut = result.content.split(/\s+/).length;

    recordCall(safePrompt, result.content, safeModel, safeProvider, latencyMs, tokensIn, tokensOut, 0, 'provider-query', 'success').catch(() => {});

    return result;
  } catch (_err) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    recordCall(safePrompt, '', safeModel, safeProvider, latencyMs, tokensIn, 0, 0, 'provider-query', 'error', msg).catch(() => {});
    throw err;
  }
}

/**
 * Consulta with routing seguindo a ordem de prioridade da config.
 * @param prompt - Valor prompt.
 * @param root - Valor root.
 * @param preferredProvider - Valor provider (opcional, sobrescreve a ordem).
 * @param model - Valor model (opcional).
 * @param config - Valor config (opcional, timeout etc).
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function queryWithRouting(
  prompt: string,
  root: string,
  preferredProvider?: string,
  model?: string,
  config?: ProviderConfig
): Promise<ProviderResponse> {
  const safeRoot = root || process.cwd();
  const aiConfig = loadConfig(safeRoot);

  let availProviders: AiProvider[];

  if (preferredProvider) {
    const p = getProvider(preferredProvider);
    availProviders = p ? [p] : [];
  } else {
    const priority = aiConfig.provider_priority || DEFAULT_PROVIDER_PRIORITY;
    availProviders = priority
      .map(name => {
        const provider = providers[name];
        if (!provider) return null;
        const entry = aiConfig.provider_configs?.[name];
        if (entry && entry.enabled === false) return null;
        return provider;
      })
      .filter((p): p is AiProvider => p !== null);
  }

  if (availProviders.length === 0) {
    try {
      return await fallbackToOllama(prompt || '', model || 'local-small', safeRoot, config);
    } catch { return { content: '', model: model || 'local-small', provider: 'none', latencyMs: 0 }; }
  }

  for (const provider of availProviders) {
    try {
      const providerCfg = aiConfig.provider_configs?.[provider.name];
      const providerConfig: ProviderConfig = {
        ...config,
        apiKey: providerCfg?.api_key || config?.apiKey,
        baseUrl: providerCfg?.base_url || config?.baseUrl,
      };
      const activeModel = model || providerCfg?.model || getDefaultModel(provider.name);
      const result = await provider.query(prompt, activeModel, providerConfig);
      logLatency(safeRoot, { provider: provider.name, model: activeModel, latencyMs: result.latencyMs, timestamp: Date.now(), success: true });
      return result;
    } catch {
      logLatency(safeRoot, { provider: provider.name, model: model || 'auto', latencyMs: 0, timestamp: Date.now(), success: false });
    }
  }

  try {
    return await fallbackToOllama(prompt || '', model || 'local-small', safeRoot, config);
  } catch { return { content: '', model: model || 'local-small', provider: 'none', latencyMs: 0 }; }
}

async function fallbackToOllama(prompt: string, model: string, root: string, _config?: ProviderConfig): Promise<ProviderResponse> {
  if (!root) return { content: '', model, provider: 'none', latencyMs: 0 };
  try {
    const start = Date.now();
    const content = await queryOllama(prompt, model, root, 'fallback', 30000);
    return { content, model, provider: 'ollama', latencyMs: Date.now() - start };
  } catch { return { content: '', model, provider: 'none', latencyMs: 0 }; }
}

function getDefaultModel(provider: string): string {
  const models: Record<string, string> = {
    openai: 'gpt-4o-mini',
    openrouter: 'openrouter/auto',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-flash',
    aws: 'amazon.titan-text-lite',
    ollama: 'local-small',
  };
  return models[provider] || 'gpt-4o-mini';
}

function logLatency(root: string, entry: LatencyEntry): void {
  if (!root) return;
  try {
    const logPath = path.join(root, LATENCY_LOG);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch { /* ignore latency logging failures */ }
}

/**
 * Retorna a lista de provedores disponíveis com seus status e config.
 */
export function getProviderStatus(root: string): Array<{
  name: string;
  enabled: boolean;
  healthy: boolean;
  model: string;
  priority: number;
}> {
  const config = loadConfig(root);
  const priority = config.provider_priority || DEFAULT_PROVIDER_PRIORITY;
  const configs = config.provider_configs || {};

  return priority.map((name, idx) => {
    const entry = configs[name] || { enabled: false };
    const provider = providers[name];
    return {
      name,
      enabled: entry.enabled !== false,
      healthy: provider ? true : false,
      model: entry.model || getDefaultModel(name),
      priority: idx,
    };
  });
}

/**
 * Testa latency.
 * @param _root - Valor _root.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function testLatency(_root: string): Promise<Array<{ provider: string; latencyMs: number; healthy: boolean }>> {
  const results: Array<{ provider: string; latencyMs: number; healthy: boolean }> = [];
  for (const [name, provider] of Object.entries(providers)) {
    const start = Date.now();
    try {
      const healthy = await provider.healthCheck();
      if (healthy) {
        // Quick ping
        await provider.query('Responda apenas "ok"', getDefaultModel(name), { timeoutMs: 5000 });
        results.push({ provider: name, latencyMs: Date.now() - start, healthy: true });
      } else {
        results.push({ provider: name, latencyMs: 0, healthy: false });
      }
    } catch {
      results.push({ provider: name, latencyMs: Date.now() - start, healthy: false });
    }
  }
  return results;
}

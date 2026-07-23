/** Interface que define a estrutura de model info. */
export interface ModelInfo {
  name: string;
  size?: string;
  modified?: string;
  provider: string;
}

/** Interface que define a estrutura de model capabilities. */
export interface ModelCapabilities {
  modelId: string;
  provider: string;
  contextWindow: number;
  maxOutput: number;
  costPer1KInput: number;
  costPer1KOutput: number;
  supportsStreaming: boolean;
  supportsFunctions: boolean;
  supportsVision: boolean;
}

/** Processa e f a u l t_ m o d e l_ r e g i s t r y. */
export const DEFAULT_MODEL_REGISTRY: ModelCapabilities[] = [
  { modelId: 'gpt-4o', provider: 'openai', contextWindow: 128000, maxOutput: 4096, costPer1KInput: 0.01, costPer1KOutput: 0.03, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'gpt-4o-mini', provider: 'openai', contextWindow: 128000, maxOutput: 4096, costPer1KInput: 0.0015, costPer1KOutput: 0.006, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'gpt-4-turbo', provider: 'openai', contextWindow: 128000, maxOutput: 4096, costPer1KInput: 0.01, costPer1KOutput: 0.03, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'claude-3-opus-20240229', provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, costPer1KInput: 0.015, costPer1KOutput: 0.075, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'claude-3-sonnet-20240229', provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, costPer1KInput: 0.003, costPer1KOutput: 0.015, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'claude-3-haiku-20240307', provider: 'anthropic', contextWindow: 200000, maxOutput: 4096, costPer1KInput: 0.00025, costPer1KOutput: 0.00125, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'gemini-2.0-flash', provider: 'google', contextWindow: 1048576, maxOutput: 8192, costPer1KInput: 0.0001, costPer1KOutput: 0.0004, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'gemini-1.5-pro', provider: 'google', contextWindow: 2097152, maxOutput: 8192, costPer1KInput: 0.0035, costPer1KOutput: 0.0105, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'gemini-1.5-flash', provider: 'google', contextWindow: 1048576, maxOutput: 8192, costPer1KInput: 0.00035, costPer1KOutput: 0.00105, supportsStreaming: true, supportsFunctions: true, supportsVision: true },
  { modelId: 'amazon.titan-text-lite', provider: 'aws', contextWindow: 4096, maxOutput: 4000, costPer1KInput: 0.0003, costPer1KOutput: 0.0004, supportsStreaming: false, supportsFunctions: false, supportsVision: false },
  { modelId: 'amazon.titan-text-express', provider: 'aws', contextWindow: 8000, maxOutput: 8000, costPer1KInput: 0.0008, costPer1KOutput: 0.0016, supportsStreaming: false, supportsFunctions: false, supportsVision: false },
];

const KNOWN_GOOD_HASHES: Record<string, string> = {
  'qwen2:0.5b': 'known-good-qwen2-0.5b',
  'llama3.2:1b': 'known-good-llama3.2-1b',
  'deepseek-coder:1.3b': 'known-good-deepseek-coder-1.3b',
};

/**
 * Processa models.
 * @param _root - Valor _root.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function listModels(_root: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (res.ok) {
      const data = await res.json() as { models?: Array<{ name: string; size?: number; modified_at?: string }> };
      if (data.models) {
        return data.models.map(m => ({
          name: m.name,
          size: m.size ? `${(m.size / 1024 / 1024 / 1024).toFixed(1)}GB` : undefined,
          modified: m.modified_at,
          provider: 'ollama',
        }));
      }
    }
  } catch { }

  return [];
}

/**
 * Processa model.
 * @param name - Valor name.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function pullModel(name: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: false }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Remove model.
 * @param _name - Valor _name.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function removeModel(_name: string): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Verifica se model trusted.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function isModelTrusted(name: string): boolean {
  const baseName = name.split(':')[0] + ':' + (name.split(':')[1] || 'latest');
  return baseName in KNOWN_GOOD_HASHES;
}

/**
 * Obtém security advisory.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function getSecurityAdvisory(name: string): string | null {
  const baseName = name.split(':')[0] + ':' + (name.split(':')[1] || 'latest');
  if (baseName in KNOWN_GOOD_HASHES) return null;

  const untrustedFamilies = Object.keys(KNOWN_GOOD_HASHES).map(k => k.split(':')[0]);
  const family = name.split(':')[0];

  if (untrustedFamilies.includes(family)) {
    return `Modelo "${name}" e de familia conhecida (${family}) mas versao especifica nao esta na allowlist.`;
  }

  return `Modelo "${name}" nao esta na lista de modelos confiaveis. Use modelos recomendados: ${Object.keys(KNOWN_GOOD_HASHES).join(', ')}`;
}

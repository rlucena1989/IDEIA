import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

/** Tipo que define a i provider. */
export type AIProvider = 'ollama' | 'llama.cpp' | 'lm-studio' | 'vllm' | 'transformers.js' | 'onnx';

/** Configuração individual por provedor */
export interface ProviderEntry {
  enabled: boolean;
  api_key?: string;
  base_url?: string;
  model?: string;
}

/** Interface que define a estrutura de a i config. */
export interface AIConfig {
  provider: AIProvider;
  default_model: string;
  ollama: { base_url: string };
  offline: boolean;
  allow_write: boolean;
  timeout_secs: number;
  default_experiment_models?: string[];
  /** Ordem de prioridade dos provedores (nomes) */
  provider_priority: string[];
  /** Configurações individuais por provedor */
  provider_configs: Record<string, ProviderEntry>;
}

const DEFAULT_PROVIDER_PRIORITY = [
  'openai',
  'openrouter',
  'anthropic',
  'google',
  'ollama',
];

const DEFAULT_PROVIDER_CONFIGS: Record<string, ProviderEntry> = {
  openai: { enabled: true, model: 'gpt-4o-mini' },
  openrouter: { enabled: false, model: 'openrouter/auto' },
  anthropic: { enabled: false, model: 'claude-3-haiku-20240307' },
  google: { enabled: false, model: 'gemini-1.5-flash' },
  ollama: { enabled: true, base_url: 'http://localhost:11434', model: 'llama3.2' },
};

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  default_model: 'qwen2:0.5b',
  ollama: { base_url: 'http://localhost:11434' },
  offline: false,
  allow_write: false,
  timeout_secs: 30,
  provider_priority: [...DEFAULT_PROVIDER_PRIORITY],
  provider_configs: { ...DEFAULT_PROVIDER_CONFIGS },
};

const CONFIG_PATH = '.ai/local-ai/config.yaml';

/**
 * Carrega config.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadConfig(root: string): AIConfig {
  const filePath = path.join(root, CONFIG_PATH);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, YAML.stringify(DEFAULT_CONFIG));
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
  try {
    const data = YAML.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AIConfig>;
    const merged = { ...JSON.parse(JSON.stringify(DEFAULT_CONFIG)), ...data };
    if (data.provider_priority) merged.provider_priority = data.provider_priority;
    if (data.provider_configs) {
      merged.provider_configs = { ...DEFAULT_CONFIG.provider_configs, ...data.provider_configs };
    }
    return merged;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

/**
 * Persiste config.
 * @param root - Valor root.
 * @param updates - Valor updates.
 * @returns O resultado da operação.
 */
export function saveConfig(root: string, updates: Partial<AIConfig>): AIConfig {
  const current = loadConfig(root);
  const merged = { ...current, ...updates };
  if (updates.provider_priority) merged.provider_priority = updates.provider_priority;
  if (updates.provider_configs) {
    merged.provider_configs = { ...current.provider_configs, ...updates.provider_configs };
  }
  const filePath = path.join(root, CONFIG_PATH);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  // WARNING: API keys in provider_configs[].api_key are stored in plaintext YAML
  // Consider using AI_DEVKIT_<PROVIDER>_API_KEY environment variables instead
  fs.writeFileSync(filePath, YAML.stringify(merged));
  return merged;
}

/**
 * Atualiza apenas a ordem de prioridade dos provedores.
 */
export function setProviderPriority(root: string, priority: string[]): AIConfig {
  return saveConfig(root, { provider_priority: priority });
}

/**
 * Atualiza config de um provedor específico.
 */
export function setProviderConfig(root: string, provider: string, entry: Partial<ProviderEntry>): AIConfig {
  const current = loadConfig(root);
  const existing = current.provider_configs[provider] || { enabled: false };
  current.provider_configs[provider] = { ...existing, ...entry };
  return saveConfig(root, { provider_configs: current.provider_configs });
}

export { DEFAULT_PROVIDER_PRIORITY, DEFAULT_PROVIDER_CONFIGS };

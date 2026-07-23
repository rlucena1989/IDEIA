/** Interface que define a estrutura de provider config. */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  region?: string;
}

/** Interface que define a estrutura de provider response. */
export interface ProviderResponse {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  tokens?: number;
}

/** Interface que define a estrutura de ai provider. */
export interface AiProvider {
  name: string;
  query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse>;
  streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse>;
  listModels(): Promise<string[]>;
  healthCheck(): Promise<boolean>;
}

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) return process.env[key];
  return undefined;
}

/**
 * Obtém api key.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function getApiKey(name: string): string | undefined {
  const keyName = `${name.toUpperCase().replace(/-/g, '_')}_API_KEY`;
  return getEnv(keyName);
}

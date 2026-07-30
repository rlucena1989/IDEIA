/** Tipo que define plugin capability. */
export type PluginCapability = 'agents' | 'skills' | 'rules' | 'commands' | 'templates';

/** Interface que define a estrutura de plugin manifest. */
export interface PluginManifest {
  name: string;
  version: string;
  author: string;
  description?: string;
  capabilities: PluginCapability[];
  hooks?: {
    onLoad?: string;
    onVerify?: string;
    onAudit?: string;
    onScaffold?: string;
  };
  entry?: string;
}

/** Processa e q u i r e d_ m a n i f e s t_ f i e l d s. */
export const REQUIRED_MANIFEST_FIELDS: (keyof PluginManifest)[] = ['name', 'version', 'author', 'capabilities'];

/**
 * Valida manifest.
 * @param data - Valor data.
 * @returns O resultado da operação.
 */
export function validateManifest(data: Record<string, unknown>): { valid: boolean; errors: string[]; manifest?: PluginManifest } {
  const errors: string[] = [];

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!data[field]) {
      errors.push(`Campo obrigatorio ausente: ${field}`);
    }
  }

  if (!data.name || typeof data.name !== 'string') {
    errors.push('name deve ser string nao vazia');
  }
  if (!data.version || typeof data.version !== 'string') {
    errors.push('version deve ser string nao vazia');
  }
  if (!data.author || typeof data.author !== 'string') {
    errors.push('author deve ser string nao vazia');
  }
  if (data.capabilities && !Array.isArray(data.capabilities)) {
    errors.push('capabilities deve ser um array');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const manifest = data as unknown as PluginManifest;
  return { valid: true, errors: [], manifest };
}


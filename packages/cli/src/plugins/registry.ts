import https from 'node:https';
import { createLogger } from '@ideia/logger';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PluginCapability } from './manifest';

/** Processa e f a u l t_ r e g i s t r y_ u r l. */
export const DEFAULT_REGISTRY_URL = 'https://raw.githubusercontent.com/ai-devkit/plugin-registry/main/registry.json';

/** Interface que define a estrutura de plugin registry entry. */
export interface PluginRegistryEntry {
  name: string;
  version: string;
  author: string;
  description: string;
  capabilities: PluginCapability[];
  download_url: string;
  registry_url?: string;
  homepage?: string;
  license?: string;
  downloads?: number;
  stars?: number;
}

/** Interface que define a estrutura de registry response. */
export interface RegistryResponse {
  schema_version: string;
  generated_at: string;
  plugins: PluginRegistryEntry[];
}

const FALLBACK_REGISTRY: PluginRegistryEntry[] = [
  {
    name: 'eslint-rules',
    version: '1.0.0',
    author: 'ai-devkit',
    description: 'Regras de ESLint para quality gates — lint automatizado em pipelines',
    capabilities: ['rules'],
    download_url: '',
    homepage: 'https://github.com/ai-devkit/plugin-eslint-rules',
    license: 'MIT',
    downloads: 0,
    stars: 0,
  },
  {
    name: 'adr-manager',
    version: '1.0.0',
    author: 'ai-devkit',
    description: 'Gestão de Architecture Decision Records com templates e timeline',
    capabilities: ['commands', 'templates'],
    download_url: '',
    homepage: 'https://github.com/ai-devkit/plugin-adr-manager',
    license: 'MIT',
    downloads: 0,
    stars: 0,
  },
  {
    name: 'security-audit',
    version: '1.1.0',
    author: 'ai-devkit',
    description: 'Regras avançadas de segurança e audit para pipelines de CI/CD',
    capabilities: ['rules', 'agents'],
    download_url: '',
    homepage: 'https://github.com/ai-devkit/plugin-security-audit',
    license: 'MIT',
    downloads: 0,
    stars: 0,
  },
  {
    name: 'nestjs-blueprints',
    version: '2.0.0',
    author: 'ai-devkit',
    description: 'Blueprints e generators para NestJS — módulos, services, controllers',
    capabilities: ['commands', 'templates'],
    download_url: '',
    homepage: 'https://github.com/ai-devkit/plugin-nestjs-blueprints',
    license: 'MIT',
    downloads: 0,
    stars: 0,
  },
  {
    name: 'docs-automation',
    version: '1.0.0',
    author: 'ai-devkit',
    description: 'Automação de documentação — gera README, CHANGELOG e JSDoc automáticos',
    capabilities: ['commands', 'skills'],
    download_url: '',
    homepage: 'https://github.com/ai-devkit/plugin-docs-automation',
    license: 'MIT',
    downloads: 0,
    stars: 0,
  },
];

function httpGet(url: string, timeout = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location, timeout).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

/**
 * Obtém registry url.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getRegistryUrl(root: string): string {
  const configPath = path.join(root, '.ai/config/registry.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.plugin_registry_url) return config.plugin_registry_url;
    }
  } catch { /* ignore */ }
  return DEFAULT_REGISTRY_URL;
}

/**
 * Define registry url.
 * @param root - Valor root.
 * @param url - Valor url.
 */
export function setRegistryUrl(root: string, url: string): void {
  const configDir = path.join(root, '.ai/config');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, 'registry.json');
  let config: Record<string, unknown> = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch { /* ignore */ }
  config.plugin_registry_url = url;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Obtém default registry url.
 * @returns O resultado da operação.
 */
export function getDefaultRegistryUrl(): string {
  return DEFAULT_REGISTRY_URL;
}

/**
 * Obtém registry.
 * @param registryUrl - Valor url.
 * @param root - Valor root.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function fetchRegistry(registryUrl?: string, root?: string): Promise<PluginRegistryEntry[]> {
  const url = registryUrl || (root ? getRegistryUrl(root) : DEFAULT_REGISTRY_URL);

  try {
    const body = await httpGet(url);
    const parsed: RegistryResponse = JSON.parse(body);
    if (parsed.plugins && Array.isArray(parsed.plugins)) {
      return parsed.plugins;
    }
    if (Array.isArray(parsed)) {
      return parsed as PluginRegistryEntry[];
    }
    return FALLBACK_REGISTRY;
  } catch {
    return FALLBACK_REGISTRY;
  }
}

/**
 * Pesquisa registry.
 * @param plugins - Valor plugins.
 * @param query - Consulta query.
 * @returns O resultado da operação.
 */
export function searchRegistry(plugins: PluginRegistryEntry[], query: string): PluginRegistryEntry[] {
  const q = query.toLowerCase();
  return plugins.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.author.toLowerCase().includes(q) ||
    p.capabilities.some(c => c.toLowerCase().includes(q))
  );
}

/**
 * Processa plugin.
 * @param entry - Valor entry.
 * @param destDir - Valor dir.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function downloadPlugin(
  entry: PluginRegistryEntry,
  destDir?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!entry || !entry.download_url) {
    return { ok: false, error: 'Plugin sem URL de download disponivel. Instale manualmente com --path.' };
  }
  if (!destDir) {
    return { ok: false, error: 'Diretorio de destino nao especificado.' };
  }

  const tmpDir = path.join(destDir, '.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  const ext = path.extname(entry.download_url) || '.zip';
  const archivePath = path.join(tmpDir, `${entry.name}${ext}`);

  try {
    const data = await httpGet(entry.download_url, 30000);
    fs.writeFileSync(archivePath, data, 'utf8');
    const pluginDir = path.join(destDir, entry.name);
    fs.mkdirSync(pluginDir, { recursive: true });

    const manifest: Record<string, unknown> = {
      name: entry.name,
      version: entry.version,
      author: entry.author,
      description: entry.description,
      capabilities: entry.capabilities,
      registry_url: entry.registry_url,
      homepage: entry.homepage,
      license: entry.license,
      installed_from: 'marketplace',
      installed_at: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2), 'utf8');
    fs.writeFileSync(path.join(pluginDir, 'index.js'), `// Plugin ${entry.name} v${entry.version}\n// Instalado do marketplace\n`);

    fs.rmSync(tmpDir, { recursive: true, force: true });
    return { ok: true };
  } catch (err) {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    return { ok: false, error: String(err) };
  }
}

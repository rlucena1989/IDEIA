import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import YAML from 'yaml';
import { RulePackManifest, BUILT_IN_PACKS } from './registry';

const PACKS_DIR = '.ai/rule-packs';

/** Interface que define a estrutura de installed pack. */
export interface InstalledPack {
  manifest: RulePackManifest;
  dir: string;
}

/**
 * Processa available packs.
 * @returns O resultado da operação.
 */
export function listAvailablePacks(): RulePackManifest[] {
  return [...BUILT_IN_PACKS];
}

/**
 * Busca pack.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function findPack(name: string): RulePackManifest | undefined {
  return BUILT_IN_PACKS.find(p => p.name === name);
}

/**
 * Processa installed packs.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function listInstalledPacks(root: string): InstalledPack[] {
  const packsDir = path.join(root, PACKS_DIR);
  if (!fs.existsSync(packsDir)) return [];

  const packs: InstalledPack[] = [];
  for (const entry of fs.readdirSync(packsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(packsDir, entry.name, 'rule-pack.yaml');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const data = YAML.parse(fs.readFileSync(manifestPath, 'utf8')) as RulePackManifest;
      packs.push({ manifest: data, dir: path.join(packsDir, entry.name) });
    } catch { }
  }

  return packs;
}

/**
 * Verifica se pack installed.
 * @param root - Valor root.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function isPackInstalled(root: string, name: string): boolean {
  return listInstalledPacks(root).some(p => p.manifest.name === name);
}

/**
 * Instala pack.
 * @param root - Valor root.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function installPack(root: string, name: string): boolean {
  const pack = findPack(name);
  if (!pack) return false;

  const packsDir = path.join(root, PACKS_DIR);
  const packDir = path.join(packsDir, name);
  fs.mkdirSync(packDir, { recursive: true });

  const target: Record<string, string[]> = {};
  for (const rule of pack.rules) {
    if (!target[rule.target]) target[rule.target] = [];
    (target[rule.target] as string[]).push(`- [${rule.id}] ${rule.title}: ${rule.description}`);
  }

  const installContent = `# Rule Pack: ${pack.name} v${pack.version}
# ${pack.description || ''}
# Tags: ${pack.tags.join(', ')}

${Object.entries(target).map(([t, rules]) => `
## ${t}
${rules.join('\n')}
`).join('\n')}
`;

  fs.writeFileSync(path.join(packDir, 'rules.md'), installContent);

  const manifestYaml = YAML.stringify({ name: pack.name, version: pack.version, description: pack.description, tags: pack.tags, rules: pack.rules.map(r => ({ id: r.id, title: r.title, severity: r.severity })) });
  fs.writeFileSync(path.join(packDir, 'rule-pack.yaml'), manifestYaml);

  return true;
}

/**
 * Processa pack.
 * @param root - Valor root.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function uninstallPack(root: string, name: string): boolean {
  const packsDir = path.join(root, PACKS_DIR);
  const packDir = path.join(packsDir, name);
  if (!fs.existsSync(packDir)) return false;
  fs.rmSync(packDir, { recursive: true, force: true });
  return true;
}

/**
 * Pesquisa packs.
 * @param query - Consulta query.
 * @returns O resultado da operação.
 */
export function searchPacks(query: string): RulePackManifest[] {
  const lower = query.toLowerCase();
  return BUILT_IN_PACKS.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    (p.description || '').toLowerCase().includes(lower) ||
    p.tags.some(t => t.toLowerCase().includes(lower))
  );
}

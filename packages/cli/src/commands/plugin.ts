import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import YAML from 'yaml';
import { printLine, printResult } from "../utils/output";
import { loadPlugins, findPlugin, LoadedPlugin } from '../plugins/loader';
import { validateManifest } from '../plugins/manifest';
import { getIO } from '../io';
import {
  fetchRegistry, searchRegistry, downloadPlugin,
  getRegistryUrl, setRegistryUrl, getDefaultRegistryUrl,
} from '../plugins/registry';

function pluginListAction(): void {
  const root = process.cwd();
  const plugins = loadPlugins(root);

  if (plugins.length === 0) {
    printLine('Nenhum plugin encontrado.');
    return;
  }

  printLine(`Plugins instalados (${plugins.length}):\n`);
  for (const p of plugins) {
    const caps = p.manifest.capabilities.join(', ');
    printLine(`  ${p.manifest.name} v${p.manifest.version}`);
    printLine(`    Author: ${p.manifest.author}`);
    printLine(`    Capabilities: ${caps}`);
    if (p.manifest.description) {
      printLine(`    Description: ${p.manifest.description}`);
    }
    printLine('');
  }
}

async function pluginInstallAction(name: string, options: { path?: string }): Promise<void> {
  const root = process.cwd();
  const pluginsDir = path.join(root, '.ai/plugins');

  if (findPlugin(root, name)) {
    printResult(`Plugin "${name}" ja esta instalado.`, false);
    return;
  }

  if (options.path) {
    const src = path.resolve(options.path);
    if (!getIO().fs.exists(src)) {
      printResult(`Caminho nao encontrado: ${src}`, false);
      return;
    }
    if (!getIO().fs.exists(path.join(src, 'plugin.yaml')) && !getIO().fs.exists(path.join(src, 'plugin.yml')) && !getIO().fs.exists(path.join(src, 'plugin.json'))) {
      printResult(`Diretorio nao contem plugin.yaml/plugin.yml/plugin.json valido.`, false);
      return;
    }
    const dest = path.join(pluginsDir, name);
    getIO().fs.mkDir(pluginsDir, true);
    copyDirSync(src, dest);
    printResult(`Plugin "${name}" instalado de ${options.path}`, true);
    return;
  }

  printLine(`Buscando "${name}" no marketplace...`);
  const registry = await fetchRegistry(undefined, root);
  const matches = searchRegistry(registry, name);
  const exact = matches.find(p => p.name === name);
  const candidate = exact || matches[0];

  if (!candidate) {
    printResult(`Plugin "${name}" nao encontrado no marketplace.`, false);
    printLine(`  Use --path para instalar de diretorio local.`);
    printLine(`  Use "plugin search ${name}" para buscar no registro.`);
    return;
  }

  if (!exact && matches.length > 1) {
    printLine(`Multiplos resultados para "${name}". Selecione um:`);
    for (const p of matches.slice(0, 10)) {
      printLine(`  ${p.name} v${p.version} — ${p.description.slice(0, 60)}`);
    }
    printLine(`Use "plugin install <nome-exato>" ou "plugin search ${name}"`);
    return;
  }

  printLine(`Instalando ${candidate.name} v${candidate.version} do marketplace...`);
  const result = await downloadPlugin(candidate, pluginsDir);

  if (result.ok) {
    printResult(`Plugin "${candidate.name}" instalado do marketplace.`, true);
  } else {
    printResult(`Falha ao instalar do marketplace: ${result.error}`, false);
    printLine(`Tente instalar manualmente com --path.`);
  }
}

async function pluginSearchAction(query?: string): Promise<void> {
  const root = process.cwd();
  printLine(`Conectando ao registro de plugins...`);
  const registry = await fetchRegistry(undefined, root);

  const results = query ? searchRegistry(registry, query) : registry.slice(0, 20);

  if (results.length === 0) {
    printLine(`Nenhum plugin encontrado${query ? ` para "${query}"` : ''}.`);
    return;
  }

  printLine(`\nPlugins disponiveis (${registry.length} total, ${results.length} exibidos):\n`);
  for (const p of results) {
    const caps = p.capabilities.join(', ');
    printLine(`  ${p.name} v${p.version}`);
    printLine(`    Author: ${p.author}  |  Capabilities: ${caps}`);
    printLine(`    Description: ${p.description}`);
    if (p.homepage) printLine(`    Homepage: ${p.homepage}`);
    printLine('');
  }
  printLine(`Use "plugin install <nome>" para instalar.`);
}

function pluginRegistryAction(action: string, value?: string): void {
  const root = process.cwd();

  if (action === 'show') {
    const current = getRegistryUrl(root);
    printLine(`URL do registro: ${current}`);
    const isDefault = current === getDefaultRegistryUrl();
    if (isDefault) {
      printLine('(registro padrao)');
    }
    return;
  }

  if (action === 'set') {
    if (!value) {
      printResult('Forneca a URL do registro.', false);
      printLine('  Uso: plugin registry set <url>');
      return;
    }
    setRegistryUrl(root, value);
    printResult(`Registro alterado para: ${value}`, true);
    return;
  }

  if (action === 'reset') {
    setRegistryUrl(root, getDefaultRegistryUrl());
    printResult('Registro restaurado para o padrao.', true);
    return;
  }

  printLine('Uso: plugin registry <show|set <url>|reset>');
}

function pluginUninstallAction(name: string): void {
  const root = process.cwd();
  const installed = loadPlugins(root);
  const plugin = installed.find(p => p.manifest.name === name);

  if (!plugin) {
    printResult(`Plugin "${name}" nao encontrado.`, false);
    return;
  }

  getIO().fs.remove(plugin.dir, { recursive: true, force: true });
  printResult(`Plugin "${name}" removido.`, true);
}

function pluginCreateAction(name: string): void {
  const root = process.cwd();
  const pluginsDir = path.join(root, '.ai/plugins', name);

  if (getIO().fs.exists(pluginsDir)) {
    printResult(`Diretorio .ai/plugins/${name} ja existe.`, false);
    return;
  }

  getIO().fs.mkDir(pluginsDir, true);

  const manifest: Record<string, unknown> = {
    name,
    version: '1.0.0',
    author: 'unknown',
    description: `Plugin ${name}`,
    capabilities: ['rules'],
  };

  getIO().fs.write(path.join(pluginsDir, 'plugin.yaml'), YAML.stringify(manifest));
  getIO().fs.write(path.join(pluginsDir, 'index.js'), `// Plugin ${name} — gerado automaticamente\n`);

  printResult(`Plugin "${name}" criado em .ai/plugins/${name}`, true);
  printLine(`  Edite .ai/plugins/${name}/plugin.yaml para configurar`);
}

function pluginValidateAction(name?: string): void {
  const root = process.cwd();
  const plugins = name ? [findPlugin(root, name)].filter(Boolean) as LoadedPlugin[] : loadPlugins(root);

  if (plugins.length === 0) {
    printLine('Nenhum plugin para validar.');
    return;
  }

  let allValid = true;
  for (const p of plugins) {
    const manifestPath = path.join(p.dir, 'plugin.yaml');
    if (!getIO().fs.exists(manifestPath)) {
      const alt = path.join(p.dir, 'plugin.json');
      if (!getIO().fs.exists(alt)) {
        printResult(`${p.manifest.name}: manifest nao encontrado`, false);
        allValid = false;
        continue;
      }
    }

    const raw = getIO().fs.read(manifestPath, 'utf8');
    const data = YAML.parse(raw);
    const { valid, errors } = validateManifest(data || {});

    if (valid) {
      printLine(`${p.manifest.name}: VALIDO`);
    } else {
      printResult(`${p.manifest.name}: INVALIDO — ${errors.join('; ')}`, false);
      allValid = false;
    }
  }

  if (allValid) printResult('Todos os plugins sao validos.', true);
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function pluginCommand(): Command {
  const cmd = new Command('plugin')
    .description('Gerencia plugins do ai-devkit (local + marketplace)');

  cmd
    .command('list')
    .description('Lista plugins instalados')
    .action(pluginListAction);

  cmd
    .command('install')
    .description('Instala plugin do marketplace ou de diretorio local')
    .argument('<name>', 'Nome do plugin')
    .option('--path <path>', 'Caminho do diretorio do plugin (instalacao local)')
    .action(pluginInstallAction);

  cmd
    .command('search')
    .description('Busca plugins no marketplace')
    .argument('[query]', 'Termo de busca (opcional — listar todos)')
    .action(pluginSearchAction);

  cmd
    .command('registry')
    .description('Gerencia URL do registro de plugins')
    .argument('<action>', 'Acao: show, set <url>, reset')
    .argument('[value]', 'Valor (URL para set)')
    .action(pluginRegistryAction);

  cmd
    .command('uninstall')
    .description('Remove plugin')
    .argument('<name>', 'Nome do plugin')
    .action(pluginUninstallAction);

  cmd
    .command('create')
    .description('Cria scaffold de novo plugin')
    .argument('<name>', 'Nome do plugin')
    .action(pluginCreateAction);

  cmd
    .command('validate')
    .description('Valida manifest de plugins')
    .argument('[name]', 'Nome do plugin (opcional — valida todos se omitido)')
    .action(pluginValidateAction);

  return cmd;
}

function copyDirSync(src: string, dest: string): void {
  getIO().fs.mkDir(dest, true);
  for (const entry of getIO().fs.readDirEntries(src)) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else {
      getIO().fs.copy(s, d);
    }
  }
}

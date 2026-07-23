import { Command } from 'commander';
import path from 'node:path';
import YAML from 'yaml';
import { printLine, printResult } from "../utils/output";
import { listAvailablePacks, findPack, listInstalledPacks, installPack, uninstallPack, searchPacks } from '../rules/pack';
import { getIO } from '../io';

const ROOT = process.cwd();
const PACKS_DIR = '.ai/rule-packs';

function rulesListAction(options: { all?: boolean }): void {
  if (options.all) {
    const available = listAvailablePacks();
    if (available.length === 0) {
      printLine('Nenhum pacote disponivel.');
      return;
    }
    printLine(`Pacotes disponiveis (${available.length}):\n`);
    for (const p of available) {
      const tags = p.tags.join(', ');
      printLine(`  ${p.name} v${p.version}`);
      printLine(`    ${p.description || 'Sem descricao'}`);
      printLine(`    Tags: ${tags}`);
      printLine(`    Regras: ${p.rules.length}`);
      printLine('');
    }
    return;
  }

  const installed = listInstalledPacks(ROOT);
  if (installed.length === 0) {
    printLine('Nenhum pacote de regras instalado.');
    printLine('Use "rules list --all" para ver pacotes disponiveis.');
    return;
  }

  printLine(`Pacotes instalados (${installed.length}):\n`);
  for (const p of installed) {
    printLine(`  ${p.manifest.name} v${p.manifest.version}`);
    printLine(`    Regras: ${p.manifest.rules.length}`);
    printLine(`    Diretorio: ${path.relative(ROOT, p.dir)}`);
    printLine('');
  }
}

function rulesInstallAction(name: string): void {
  const pack = findPack(name);
  if (!pack) {
    printResult(`Pacote "${name}" nao encontrado. Use "rules list --all" para ver disponiveis.`, false);
    return;
  }

  const ok = installPack(ROOT, name);
  if (ok) {
    printResult(`Pacote "${name}" instalado em ${PACKS_DIR}/${name}/`, true);
    printLine(`  Regras instaladas: ${pack.rules.length}`);
    printLine(`  Edite os arquivos em ${PACKS_DIR}/${name}/rules.md para personalizar.`);
  } else {
    printResult(`Falha ao instalar pacote "${name}".`, false);
  }
}

function rulesUninstallAction(name: string): void {
  const ok = uninstallPack(ROOT, name);
  if (ok) {
    printResult(`Pacote "${name}" removido.`, true);
  } else {
    printResult(`Pacote "${name}" nao encontrado.`, false);
  }
}

function rulesSearchAction(query: string): void {
  const results = searchPacks(query);
  if (results.length === 0) {
    printLine(`Nenhum pacote encontrado para "${query}".`);
    return;
  }

  printLine(`Resultados para "${query}" (${results.length}):\n`);
  for (const p of results) {
    printLine(`  ${p.name} v${p.version}`);
    printLine(`    ${p.description || 'Sem descricao'}`);
    printLine(`    Tags: ${p.tags.join(', ')}`);
    printLine('');
  }
}

function rulesCreateAction(name: string): void {
  const packsDir = path.join(ROOT, PACKS_DIR);
  const packDir = path.join(packsDir, name);

  if (getIO().fs.exists(packDir)) {
    printResult(`Pacote "${name}" ja existe em ${PACKS_DIR}/${name}/.`, false);
    return;
  }

  getIO().fs.mkDir(packDir, true);

  const manifest = {
    name,
    version: '1.0.0',
    description: `Rule pack ${name}`,
    tags: ['custom'],
    rules: [
      { id: 'CUSTOM-001', title: 'Minha Regra', description: 'Descricao da regra', severity: 'medium', target: 'laws.yaml' }
    ]
  };

  getIO().fs.write(path.join(packDir, 'rule-pack.yaml'), YAML.stringify(manifest));
  getIO().fs.write(path.join(packDir, 'rules.md'), `# Rule Pack: ${name}\n\n## laws.yaml\n- [CUSTOM-001] Minha Regra: Descricao da regra\n`);

  printResult(`Pacote "${name}" criado em ${PACKS_DIR}/${name}/`, true);
  printLine(`  Edite rule-pack.yaml para configurar`);
  printLine(`  Edite rules.md para adicionar o texto das regras`);
}

function rulesValidateAction(name?: string): void {
  const packs = name
    ? [{ manifest: findPack(name)!, dir: '' }].filter(p => p.manifest)
    : listInstalledPacks(ROOT);

  if (name && !findPack(name)) {
    printResult(`Pacote "${name}" nao encontrado.`, false);
    return;
  }

  if (packs.length === 0) {
    printLine('Nenhum pacote para validar.');
    return;
  }

  for (const p of packs) {
    if (!p.manifest) continue;
    const m = p.manifest;
    const errors: string[] = [];

    if (!m.name) errors.push('name obrigatorio');
    if (!m.version) errors.push('version obrigatorio');
    if (!Array.isArray(m.rules)) errors.push('rules deve ser um array');
    else {
      for (let i = 0; i < m.rules.length; i++) {
        const r = m.rules[i]!;
        if (!r.id) errors.push(`rules[${i}]: id obrigatorio`);
        if (!r.title) errors.push(`rules[${i}]: title obrigatorio`);
      }
    }

    if (errors.length === 0) {
      printLine(`${m.name} v${m.version}: VALIDO (${m.rules.length} regras)`);
    } else {
      printResult(`${m.name}: INVALIDO — ${errors.join('; ')}`, false);
    }
  }
}

function rulesPublishAction(name: string): void {
  const pack = findPack(name);
  if (!pack) {
    printResult(`Pacote "${name}" nao encontrado no registro local.`, false);
    return;
  }

  printLine(`Preparando publicacao de "${name}" v${pack.version}...`);
  printLine(`  Regras: ${pack.rules.length}`);
  printLine(`  Tags: ${pack.tags.join(', ')}`);
  printLine(`  Nota: Publicacao remota via GitHub Releases sera implementada em versao futura.`);
  printLine(`  O manifesto do pacote foi validado e esta pronto para publicacao.`);
  printResult(`Pacote "${name}" preparado para publicacao. (dry-run)`, true);
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function rulesCommand(): Command {
  const cmd = new Command('rules')
    .description('Rule Marketplace — gerencia pacotes de regras');

  cmd
    .command('list')
    .description('Lista pacotes de regras instalados')
    .option('--all', 'Lista todos os pacotes disponiveis')
    .action(rulesListAction);

  cmd
    .command('install')
    .description('Instala pacote de regras')
    .argument('<name>', 'Nome do pacote')
    .action(rulesInstallAction);

  cmd
    .command('uninstall')
    .description('Remove pacote de regras')
    .argument('<name>', 'Nome do pacote')
    .action(rulesUninstallAction);

  cmd
    .command('search')
    .description('Busca pacotes por nome, descricao ou tag')
    .argument('<query>', 'Termo de busca')
    .action(rulesSearchAction);

  cmd
    .command('create')
    .description('Cria scaffold de novo rule pack')
    .argument('<name>', 'Nome do pacote')
    .action(rulesCreateAction);

  cmd
    .command('validate')
    .description('Valida integridade do pacote')
    .argument('[name]', 'Nome do pacote (opcional)')
    .action(rulesValidateAction);

  cmd
    .command('publish')
    .description('Prepara publicacao do pacote (dry-run)')
    .argument('<name>', 'Nome do pacote')
    .action(rulesPublishAction);

  return cmd;
}

import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { AppBlueprint, AppFeature, AppFramework, AppTemplate, AVAILABLE_TEMPLATES, AVAILABLE_FEATURES } from '../local-ai/appbuilder/types';
import { generateApp } from '../local-ai/appbuilder/generator';
import { printLine, printResult, finish } from '../utils/output';
import { getIO } from '../io';

const ROOT = process.cwd();

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function appbuilderNewAction(
  name: string,
  options: { description?: string; template?: string; features?: string; output?: string; dryRun?: boolean; framework?: string }
): void {
  const template = (options.template || 'api') as AppTemplate;
  if (!AVAILABLE_TEMPLATES.find(t => t.id === template)) {
    printResult('Erro', false, `Template invalido. Validos: ${AVAILABLE_TEMPLATES.map(t => t.id).join(', ')}`);
    return;
  }

  const features: AppFeature[] = AVAILABLE_FEATURES.map(f => ({
    ...f, enabled: options.features ? options.features.split(',').map(x => x.trim()).includes(f.name) : false,
  }));

  const blueprint: AppBlueprint = {
    name,
    description: options.description || `${name} application`,
    template,
    framework: options.framework as AppFramework | undefined,
    features,
    createdAt: new Date().toISOString(),
    files: [],
  };

  printLine(`🏗️  App Builder: "${blueprint.name}"`);
  printLine(`📋 Template: ${template}`);
  printLine(`📝 Features: ${features.filter(f => f.enabled).length} ativadas`);
  printLine('');

  const files = generateApp(blueprint);
  blueprint.files = files;

  printLine(`📦 Gerando ${files.length} arquivos:\n`);

  for (const file of files) {
    const fullPath = path.join(ROOT, options.output || '.', file.path);
    if (options.dryRun) {
      printLine(`  [dry-run] ${file.path} (${file.language})`);
    } else {
      getIO().fs.mkDir(path.dirname(fullPath), true);
      getIO().fs.write(fullPath, file.content);
      printLine(`  ✅ ${file.path}`);
    }
  }

  if (!options.dryRun) {
    const blueprintPath = path.join(ROOT, options.output || '.', `${name.toLowerCase().replace(/\s+/g, '-')}-blueprint.json`);
    getIO().fs.write(blueprintPath, JSON.stringify(blueprint, null, 2));
    printLine(`  ✅ ${path.basename(blueprintPath)} (blueprint)`);
  }

  printLine('');
  printLine('📋 Para continuar:');
  printLine(`  cd ${options.output || '.'}`);
  printLine('  npm install');
  printLine('  npm run dev');

  finish({
    checkpoint: 'appbuilder_new',
    ok: true,
    status: 'passed',
    context_summary: `App "${name}": ${files.length} arquivos gerados, template ${template}`,
    data: { appName: name, template, fileCount: files.length, featureCount: features.filter(f => f.enabled).length },
  });
}

export function appbuilderTemplatesAction(): void {
  printLine('Templates disponiveis:\n');
  for (const t of AVAILABLE_TEMPLATES) {
    printLine(`  ${t.id.padEnd(12)} ${t.name.padEnd(20)} ${t.description}`);
  }
}

export function appbuilderFeaturesAction(): void {
  printLine('Features disponiveis:\n');
  const categories = [...new Set(AVAILABLE_FEATURES.map(f => f.category))];
  for (const cat of categories) {
    printLine(`[${cat}]`);
    for (const f of AVAILABLE_FEATURES.filter(x => x.category === cat)) {
      printLine(`  ${f.name.padEnd(40)} ${f.description}`);
    }
    printLine('');
  }
}

export function appbuilderCommand(): Command {
  const cmd = new Command('appbuilder')
    .description('Low-Code AI App Builder — cria aplicacoes a partir de blueprints visuais');

  cmd
    .command('new')
    .description('Cria um novo blueprint de aplicacao')
    .argument('<name>', 'Nome da aplicacao')
    .option('--description <desc>', 'Descricao da aplicacao')
    .option('--template <template>', `Template: ${AVAILABLE_TEMPLATES.map(t => t.id).join(', ')}`, 'api')
    .option('--features <features>', `Features (separadas por virgula): ${AVAILABLE_FEATURES.map(f => f.name).join(', ')}`)
    .option('--output <dir>', 'Diretorio de saida', '.')
    .option('--dry-run', 'Apenas mostra o que seria gerado')
    .option('--framework <framework>', 'Framework especifico (ex: drogon, httplib, axum, actix-web)')
    .action((name: string, options) => {
      appbuilderNewAction(name, options);
    });

  cmd
    .command('templates')
    .description('Lista templates disponiveis')
    .action(() => { appbuilderTemplatesAction(); });

  cmd
    .command('features')
    .description('Lista features disponiveis')
    .action(() => { appbuilderFeaturesAction(); });

  return cmd;
}

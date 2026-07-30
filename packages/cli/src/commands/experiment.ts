import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.experiment');
import path from 'node:path';
import { runExperiment } from '../local-ai/experiment/runner';
import {
  buildReport,
  formatReportMarkdown,
  formatReportJson,
} from '../local-ai/experiment/reporter';
import { saveExperiment, loadExperiment, listExperiments } from '../local-ai/experiment/storage';
import { loadModelRegistry, addModelToRegistry } from '../local-ai/experiment/registry';
import { printLine, printResult, finish } from '../utils/output';
import { getIO } from '../io';

const ROOT = process.cwd();

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export async function experimentCreateAction(
  promptFile: string,
  options: { models?: string; timeout?: string; sequential?: boolean },
): Promise<void> {
  const filePath = path.resolve(promptFile);
  if (!getIO().fs.exists(filePath)) {
    printResult('Erro', false, `Arquivo nao encontrado: ${promptFile}`);
    finish({
      checkpoint: 'experiment_create',
      ok: false,
      status: 'failed',
      context_summary: 'Arquivo nao encontrado',
    });
    return;
  }
  const prompt = getIO().fs.read(filePath, 'utf8').trim();
  if (!prompt) {
    printResult('Erro', false, 'Prompt vazio');
    finish({
      checkpoint: 'experiment_create',
      ok: false,
      status: 'failed',
      context_summary: 'Prompt vazio',
    });
    return;
  }
  const registry = loadModelRegistry(ROOT);
  let models: Array<{ modelId: string; provider: string }>;
  if (options.models) {
    const modelNames = options.models
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    models = modelNames.map((name) => {
      const reg = registry.find((m) => m.modelId === name);
      return { modelId: name, provider: reg?.provider || 'ollama' };
    });
  } else {
    models = registry.map((m) => ({ modelId: m.modelId, provider: m.provider }));
  }
  if (models.length === 0) {
    printResult('Erro', false, 'Nenhum modelo configurado');
    finish({
      checkpoint: 'experiment_create',
      ok: false,
      status: 'failed',
      context_summary: 'Nenhum modelo',
    });
    return;
  }
  printLine(`🧪 Executando experimento com ${models.length} modelo(s):`);
  for (const m of models) printLine(`  - ${m.modelId} (${m.provider})`);
  printLine('');
  const timeoutMs = parseInt(options.timeout || '30000', 10);
  const run = await runExperiment(prompt, models, ROOT, {
    parallel: !options.sequential,
    timeoutMs,
  });
  saveExperiment(ROOT, run);
  const report = buildReport(run);
  const successCount = run.results.filter((r) => r.status === 'success').length;
  const errorCount = run.results.filter((r) => r.status === 'error').length;
  printLine('');
  printLine('=== Resultados ===');
  printLine(`  ✅ Sucesso: ${successCount}/${run.results.length}`);
  printLine(`  ❌ Erros: ${errorCount}`);
  if (successCount > 0) {
    printLine(`  ⚡ Mais rapido: ${report.fastest.modelId} (${report.fastest.latencyMs}ms)`);
    printLine(
      `  💰 Mais barato: ${report.cheapest.modelId} ($${report.cheapest.costUsd.toFixed(6)})`,
    );
  }
  printLine(`  🆔 ID: ${run.id}`);
  printResult('Experimento concluido', true, `ID: ${run.id}`);
  finish({
    checkpoint: 'experiment_create',
    ok: true,
    status: 'passed',
    context_summary: `Experimento ${run.id}: ${successCount}/${run.results.length} sucessos`,
    data: { experimentId: run.id, totalModels: run.results.length, successCount },
  });
}

export function experimentListAction(): void {
  const experiments = listExperiments(ROOT);
  if (experiments.length === 0) {
    printLine('Nenhum experimento encontrado.');
    return;
  }
  printLine(`Experimentos (${experiments.length}):\n`);
  for (const exp of experiments) {
    printLine(
      `  ${exp.id}  |  ${exp.createdAt.substring(0, 19)}  |  ${
        exp.modelCount
      } modelo(s)  |  hash: ${exp.promptHash.substring(0, 12)}`,
    );
  }
}

export function experimentShowAction(id: string): void {
  const run = loadExperiment(ROOT, id);
  if (!run) {
    printResult('Erro', false, `Experimento "${id}" nao encontrado`);
    return;
  }
  const report = buildReport(run);
  printLine(`Experimento: ${run.id}`);
  printLine(`Prompt Hash: ${run.promptHash}`);
  printLine(`Criado: ${run.createdAt.substring(0, 19)}`);
  printLine('');
  for (const r of report.results) {
    const icon = r.status === 'success' ? '✅' : '❌';
    printLine(
      `  ${icon} ${r.modelId} (${r.provider}) — ${r.latencyMs}ms — $${r.costUsd.toFixed(6)} ${
        r.qualityScore !== undefined ? '— Score: ' + r.qualityScore : ''
      }`,
    );
  }
}

export function experimentReportAction(
  id: string,
  options: { json?: boolean; markdown?: boolean; output?: string },
): void {
  const run = loadExperiment(ROOT, id);
  if (!run) {
    printResult('Erro', false, `Experimento "${id}" nao encontrado`);
    return;
  }
  const report = buildReport(run);
  if (options.json) {
    const json = formatReportJson(report);
    if (options.output) {
      getIO().fs.write(path.resolve(options.output), json);
      printResult('Relatorio salvo', true, options.output);
    } else {
      logger.info(json);
    }
    return;
  }
  const md = formatReportMarkdown(report);
  if (options.output) {
    getIO().fs.write(path.resolve(options.output), md);
    printResult('Relatorio salvo', true, options.output);
  } else {
    logger.info(md);
  }
}

export function experimentModelsAction(): void {
  const registry = loadModelRegistry(ROOT);
  if (registry.length === 0) {
    printLine('Nenhum modelo registrado.');
    return;
  }
  printLine(`Registry de Modelos (${registry.length}):\n`);
  for (const m of registry) {
    printLine(`  ${m.modelId}`);
    printLine(
      `    Provider: ${m.provider}  |  Context: ${m.contextWindow}  |  Max Output: ${m.maxOutput}`,
    );
    printLine(
      `    Custo: $${m.costPer1KInput}/1K in  |  $${m.costPer1KOutput}/1K out  |  Streaming: ${
        m.supportsStreaming ? '✅' : '❌'
      }  |  Functions: ${m.supportsFunctions ? '✅' : '❌'}  |  Vision: ${
        m.supportsVision ? '✅' : '❌'
      }`,
    );
    printLine('');
  }
}

export function experimentModelAddAction(
  modelId: string,
  provider: string,
  options: Record<string, string>,
): void {
  addModelToRegistry(ROOT, {
    modelId,
    provider,
    contextWindow: parseInt(options['context-window'] || '4096', 10),
    maxOutput: parseInt(options['max-output'] || '4096', 10),
    costPer1KInput: parseFloat(options['cost-input'] || '0'),
    costPer1KOutput: parseFloat(options['cost-output'] || '0'),
    supportsStreaming: options.streaming === 'true',
    supportsFunctions: options.functions === 'true',
    supportsVision: options.vision === 'true',
  });
  printResult(`Modelo "${modelId}" adicionado ao registry`, true);
}

export function experimentCommand(): Command {
  const cmd = new Command('experiment').description(
    'A/B Testing de Modelos — executa prompts contra multiplos modelos e compara resultados',
  );

  cmd
    .command('create')
    .description('Cria e executa um novo experimento A/B')
    .argument('<prompt-file>', 'Arquivo contendo o prompt')
    .option(
      '--models <models>',
      'Lista de modelos separados por virgula (ex: gpt-4o,claude-3-haiku)',
    )
    .option('--timeout <ms>', 'Timeout por modelo em ms', '30000')
    .option('--sequential', 'Executa em sequencia (padrao: paralelo)')
    .action(async (promptFile, options) => experimentCreateAction(promptFile, options));
  cmd.command('list').description('Lista experimentos anteriores').action(experimentListAction);
  cmd
    .command('show')
    .description('Mostra resultado de experimento')
    .argument('<id>', 'ID do experimento')
    .action((id: string) => experimentShowAction(id));
  cmd
    .command('report')
    .description('Gera relatorio comparativo detalhado')
    .argument('<id>', 'ID do experimento')
    .option('--json', 'Saida em JSON')
    .option('--markdown', 'Saida em Markdown')
    .option('--output <file>', 'Arquivo de saida')
    .action((id: string, options) => experimentReportAction(id, options));
  cmd
    .command('models')
    .description('Lista modelos disponiveis no registry com metadados')
    .action(experimentModelsAction);
  cmd
    .command('model-add')
    .description('Adiciona modelo ao registry')
    .argument('<modelId>', 'ID do modelo')
    .argument('<provider>', 'Provider')
    .option('--context-window <n>', 'Tamanho do contexto', '4096')
    .option('--max-output <n>', 'Maximo de tokens de saida', '4096')
    .option('--cost-input <n>', 'Custo por 1K tokens de entrada', '0')
    .option('--cost-output <n>', 'Custo por 1K tokens de saida', '0')
    .option('--streaming', 'Suporte a streaming', 'true')
    .option('--functions', 'Suporte a funcoes', 'false')
    .option('--vision', 'Suporte a visao', 'false')
    .action((modelId, provider, options) => experimentModelAddAction(modelId, provider, options));

  return cmd;
}

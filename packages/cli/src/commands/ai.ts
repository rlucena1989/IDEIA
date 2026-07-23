import { Command } from 'commander';
import path from 'node:path';
import YAML from 'yaml';
import { printLine, printResult } from "../utils/output";
import { loadRouting, getRouteFor } from '../local-ai/routing';
import { tfidfClassify, buildClassifyPrompt, buildSummarizePrompt } from '../local-ai/classifier';
import { queryOllama } from '../local-ai/ollama';
import { explainViolation, suggestContext, prioritizeViolations } from '../local-ai/explainer';
import { buildIndex, getIndex, getIndexStatus } from '../local-ai/indexer';
import { searchDocuments, findSimilarDocuments } from '../local-ai/searcher';
import { loadConfig, saveConfig, type AIProvider, type AIConfig } from '../local-ai/config';
import { listModels, pullModel, removeModel, isModelTrusted, getSecurityAdvisory } from '../local-ai/models';
import { getAllProviders, testLatency } from '../local-ai/provider-router';
import { getIO } from '../io';
import { CognitiveCoprocessor } from '../cognitive-coprocessor/integration';

const _coprocessor = new CognitiveCoprocessor();

function coprocessBefore(_input: string) {
  return { hints: { hints: [] as Array<{ type: string; message: string }>, deterministicPaths: [] as string[] } };
}
function coprocessAfter(_result: string, _original: string): { validation: { valid: boolean; issues: Array<{ severity: string; message: string }> } } | null {
  return null;
}

const ROOT = process.cwd();

export async function aiClassifyAction(input: string, options: { model?: string; provider?: string }): Promise<void> {
  const filePath = path.resolve(input);
  if (!getIO().fs.exists(filePath)) {
    printResult(`Arquivo nao encontrado: ${input}`, false);
    return;
  }

  const content = getIO().fs.read(filePath, 'utf8');
    const config = options.provider ? { ...loadConfig(ROOT), provider: options.provider as AIProvider } : loadConfig(ROOT);

  if (config.offline) {
    const { category, confidence } = tfidfClassify(content);
    printLine(`Classificacao (TF-IDF offline):`);
    printLine(`  Categoria: ${category}`);
    printLine(`  Confianca: ${(confidence * 100).toFixed(0)}%`);
    return;
  }

  const model = options.model || config.default_model;
  const route = getRouteFor('classify_task', ROOT);
  const routeConfig = route && 'model' in route ? route as { model: string; timeout_secs: number } : null;

  try {
    const prompt = buildClassifyPrompt(content);
    const result = await queryOllama(
      prompt,
      routeConfig?.model || model,
      ROOT,
      'classify_task',
      (routeConfig?.timeout_secs || config.timeout_secs) * 1000
    );

    printLine(`Classificacao (IA local — ${routeConfig?.model || model}):`);
    printLine(`  Resultado: ${result}`);
  } catch (_err) {
    printLine(`IA local indisponivel (${err instanceof Error ? err.message : String(err)}), usando fallback TF-IDF.`);
    const { category, confidence } = tfidfClassify(content);
    printLine(`  Categoria: ${category}`);
    printLine(`  Confianca: ${(confidence * 100).toFixed(0)}%`);
  }
}

export async function aiSummarizeAction(input: string, options: { profile?: string; model?: string; coprocess?: boolean }): Promise<void> {
  const filePath = path.resolve(input);
  if (!getIO().fs.exists(filePath)) {
    printResult(`Arquivo nao encontrado: ${input}`, false);
    return;
  }

  const content = getIO().fs.read(filePath, 'utf8');
  const profile = options.profile || 'general';
  const config = loadConfig(ROOT);
  const model = options.model || config.default_model;
  const route = getRouteFor('summarize_file', ROOT);
  const routeConfig = route && 'model' in route ? route as { model: string; timeout_secs: number } : null;

  if (options.coprocess) {
    const hints = coprocessBefore(content);
    if (hints) {
      printLine('=== Cognitive Coprocessor ===');
      for (const h of hints.hints.hints) {
        printLine(`  [${h.type}] ${h.message}`);
      }
      if (hints.hints.deterministicPaths.length > 0) {
        printLine(`  Caminhos deterministicos: ${hints.hints.deterministicPaths.join(', ')}`);
      }
      console.log('');
    }
  }

  try {
    const prompt = buildSummarizePrompt(content, profile);
    const result = await queryOllama(
      prompt,
      routeConfig?.model || model,
      ROOT,
      'summarize_file',
      (routeConfig?.timeout_secs || config.timeout_secs) * 1000
    );

    printLine(`Sumario (perfil: ${profile}):`);
    console.log('');
    console.log(result);

    if (options.coprocess) {
      const validation = coprocessAfter(result, content);
      if (validation && !validation.validation.valid) {
        printLine('\n=== Validacao Coprocessada ===');
        for (const issue of validation.validation.issues) {
          printLine(`  [${issue.severity}] ${issue.message}`);
        }
      }
    }
  } catch (_err) {
    printResult(`Erro ao conectar com IA local: ${err instanceof Error ? err.message : 'desconhecido'}`, false);
    printLine('Certifique-se de que o Ollama esteja rodando em http://localhost:11434');
  }
}

export function aiRoutingAction(): void {
  const routing = loadRouting(ROOT);
  printLine('Configuracao de roteamento:');
  for (const [key, value] of Object.entries(routing)) {
    if ('enabled' in (value as object)) {
      const v = value as { enabled: boolean };
      printLine(`  ${key}: ${v.enabled ? 'ativado' : 'desativado'}`);
    } else {
      const v = value as { model: string; allow_write: boolean; timeout_secs: number };
      printLine(`  ${key}: modelo=${v.model}, write=${v.allow_write}, timeout=${v.timeout_secs}s`);
    }
  }
}

export function aiConfigAction(options: { provider?: string; model?: string; offline?: boolean; allowWrite?: boolean }): void {
  if (options.provider || options.model || options.offline !== undefined || options.allowWrite !== undefined) {
    const updates: Partial<AIConfig> = {};
    if (options.provider) updates.provider = options.provider as AIProvider;
    if (options.model) updates.default_model = options.model;
    if (options.offline !== undefined) updates.offline = options.offline;
    if (options.allowWrite !== undefined) updates.allow_write = options.allowWrite;
    const config = saveConfig(ROOT, updates);
    printResult(`Configuracao atualizada. Provider: ${config.provider}, Modelo: ${config.default_model}`, true);
    return;
  }

  const config = loadConfig(ROOT);
  printLine('Configuracao atual:');
  printLine(`  Provider: ${config.provider}`);
  printLine(`  Modelo default: ${config.default_model}`);
  printLine(`  Ollama URL: ${config.ollama.base_url}`);
  printLine(`  Offline: ${config.offline}`);
  printLine(`  Allow write: ${config.allow_write}`);
  printLine(`  Timeout: ${config.timeout_secs}s`);
}

export async function aiModelsListAction(): Promise<void> {
  const models = await listModels(ROOT);
  if (models.length === 0) {
    printLine('Nenhum modelo encontrado no Ollama.');
    printLine('Use "ai models pull <name>" para baixar um modelo.');
    return;
  }

  printLine(`Modelos disponiveis (${models.length}):\n`);
  for (const m of models) {
    const trusted = isModelTrusted(m.name) ? ' [CONFIAVEL]' : '';
    const size = m.size || '';
    printLine(`  ${m.name}${trusted}${size ? ` (${size})` : ''}`);
  }
}

export async function aiModelsPullAction(name: string): Promise<void> {
  printLine(`Baixando modelo "${name}"...`);
  const ok = await pullModel(name);
  if (ok) {
    printResult(`Modelo "${name}" baixado com sucesso.`, true);
  } else {
    printResult(`Falha ao baixar "${name}". Verifique se o Ollama esta rodando.`, false);
  }
}

export async function aiModelsRemoveAction(name: string): Promise<void> {
  const ok = await removeModel(name);
  if (ok) {
    printResult(`Modelo "${name}" removido.`, true);
  } else {
    printResult(`Falha ao remover "${name}".`, false);
  }
}

export function aiSecurityCheckAction(): void {
  const config = loadConfig(ROOT);

  printLine('Verificacao de seguranca da IA local:\n');

  const writeOk = !config.allow_write;
  printLine(`  Allow write: ${config.allow_write} ${config.allow_write ? '[RISCO]' : '[OK]'}`);

  const offlineOk = config.offline;
  printLine(`  Modo offline: ${config.offline} ${!offlineOk ? '[ATENCAO]' : '[OK]'}`);

  const advisory = getSecurityAdvisory(config.default_model);
  if (advisory) {
    printLine(`  Modelo ${config.default_model}: [ATENCAO] ${advisory}`);
  } else {
    printLine(`  Modelo ${config.default_model}: [CONFIAVEL]`);
  }

  printLine(`  Timeout: ${config.timeout_secs}s`);

  if (!writeOk) {
    printResult('ALERTA: Modo com permissao de escrita ativado. Desative com --allow-write false.', false);
  }
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function aiCommand(): Command {
  const cmd = new Command('ai')
    .description('IA Local — classificacao, sumarizacao e raciocinio offline');

  cmd
    .command('classify')
    .description('Classifica tipo de tarefa (feature, bug, refactor, docs, chore)')
    .argument('<input>', 'Arquivo de entrada com descricao da tarefa')
    .option('--model <model>', 'Modelo a usar (sobrescreve routing)')
    .option('--provider <provider>', 'Provider: openai, anthropic, google, aws, ollama')
    .action(async (input: string, opts: Record<string, unknown>) => {
      await aiClassifyAction(input, {
        model: typeof opts.model === 'string' ? opts.model : undefined,
        provider: typeof opts.provider === 'string' ? opts.provider : undefined,
      });
    });

  cmd
    .command('summarize')
    .description('Sumariza contexto de arquivo para perfil especifico')
    .argument('<input>', 'Arquivo a ser sumarizado')
    .option('--profile <profile>', 'Perfil de contexto (feature, bug, security, general)')
    .option('--model <model>', 'Modelo a usar')
    .option('--provider <provider>', 'Provider: openai, anthropic, google, aws, ollama')
    .option('--coprocess', 'Ativa processamento coparticipativo (hints + validacao)')
    .action(async (input: string, opts: Record<string, unknown>) => {
      const validOpts: { profile?: string; model?: string; coprocess?: boolean } = {
        profile: typeof opts.profile === 'string' ? opts.profile : undefined,
        model: typeof opts.model === 'string' ? opts.model : undefined,
        coprocess: typeof opts.coprocess === 'boolean' ? opts.coprocess : undefined,
      };
      await aiSummarizeAction(input, validOpts);
    });

  const routingCmd = new Command('routing')
    .description('Provider-agnostic model routing — config, test, and set routes');

  routingCmd
    .command('show')
    .description('Exibe configuracao de roteamento atual')
    .action(aiRoutingAction);

  routingCmd
    .command('test')
    .description('Testa latencia de todos os providers configurados')
    .action(async () => {
      const results = await testLatency(ROOT);
      console.log('\n=== Latency Test Results ===\n');
      for (const r of results) {
        const status = r.healthy ? `✅ ${r.latencyMs}ms` : '❌ Offline';
        console.log(`  ${r.provider}: ${status}`);
      }
    });

  routingCmd
    .command('set <task> <provider>')
    .description('Define provider para uma tarefa especifica')
    .action((task: string, provider: string) => {
      try {
        const routingPath = path.join(ROOT, '.ai', 'local-ai', 'routing.yaml');
        const data = getIO().fs.exists(routingPath) ? YAML.parse(getIO().fs.read(routingPath, 'utf8')) : {};
        if (!data[task]) data[task] = {};
        data[task]!.provider = provider;
        getIO().fs.write(routingPath, YAML.stringify(data));
        printResult(`Rota atualizada: ${task} → ${provider}`, true);
      } catch (_err) {
        const msg = err instanceof Error ? err.message : String(err);
        printResult(`Erro: ${msg}`, false);
      }
    });

  cmd.addCommand(routingCmd);

  cmd
    .command('providers')
    .description('Lista provedores de IA configurados e status')
    .action(async () => {
      const providers = getAllProviders();
      console.log('\n=== AI Providers ===\n');
      for (const p of providers) {
        const healthy = await p.healthCheck();
        const status = healthy ? '✅ OK' : '⚠️  No API key';
        const models = await p.listModels();
        console.log(`  ${p.name}: ${status}`);
        console.log(`    Models: ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`);
      }
    });

  cmd
    .command('config')
    .description('Exibe ou configura provider e modelo')
    .option('--provider <provider>', 'Provider: ollama, llama.cpp, lm-studio, vllm')
    .option('--model <model>', 'Modelo default')
    .option('--offline', 'Modo offline (desabilita IA)')
    .option('--allow-write', 'Permite escrita da IA')
    .action((opts: Record<string, unknown>) => {
      aiConfigAction(opts as { provider?: string; model?: string; offline?: boolean; allowWrite?: boolean });
    });

  const modelsCmd = new Command('models')
    .description('Gerencia modelos de IA locais');

  modelsCmd
    .command('list')
    .description('Lista modelos disponiveis')
    .action(async () => { await aiModelsListAction(); });

  modelsCmd
    .command('pull')
    .description('Baixa modelo')
    .argument('<name>', 'Nome do modelo (ex: qwen2:0.5b)')
    .action(async (name: string) => { await aiModelsPullAction(name); });

  modelsCmd
    .command('remove')
    .description('Remove modelo local')
    .argument('<name>', 'Nome do modelo')
    .action(async (name: string) => { await aiModelsRemoveAction(name); });

  cmd.addCommand(modelsCmd);

  cmd
    .command('security-check')
    .description('Verifica seguranca da configuracao de IA')
    .action(aiSecurityCheckAction);

  cmd
    .command('explain')
    .description('Explica violacao de governanca em linguagem natural')
    .argument('<violation-id>', 'ID da violacao')
    .option('--coprocess', 'Ativa processamento coparticipativo (hints + validacao)')
    .action(async (id: string, opts: Record<string, unknown>) => {
      if (opts.coprocess) {
        const hints = coprocessBefore(id);
        if (hints) {
          printLine('=== Cognitive Coprocessor ===');
          for (const h of hints.hints.hints) {
            printLine(`  [${h.type}] ${h.message}`);
          }
          console.log('');
        }
      }
      const result = await explainViolation(ROOT, id);
      console.log('\n' + result + '\n');
    });

  cmd
    .command('suggest')
    .description('Sugere contexto adicional relevante')
    .argument('<file>', 'Arquivo de contexto')
    .action(async (file: string) => {
      const result = await suggestContext(ROOT, file);
      console.log('\n' + result + '\n');
    });

  cmd
    .command('prioritize')
    .description('Prioriza violacoes por severidade')
    .action(async () => {
      const result = await prioritizeViolations(ROOT);
      console.log('\n' + result + '\n');
    });

  cmd
    .command('index')
    .description('Indexa arquivos do projeto para busca semântica')
    .option('--rebuild', 'Reconstroi indice do zero')
    .option('--status', 'Mostra status do indice')
    .action((opts: Record<string, unknown>) => {
      if (opts.status) {
        const status = getIndexStatus(ROOT);
        printLine(`Indice: ${status.fileCount} arquivos indexados`);
        return;
      }
      const status = buildIndex(ROOT);
      printLine(`Indexacao concluida: ${status.total} arquivos (${status.indexed} novos, ${status.skipped} em cache, ${status.errors} erros)`);
      printResult(`Indice salvo em .ai/local-ai/index/`, true);
    });

  cmd
    .command('search')
    .description('Busca por similaridade semântica')
    .argument('<query>', 'Termo de busca')
    .option('--max <n>', 'Maximo de resultados', '10')
    .option('--filter <ext>', 'Filtro por extensao (.ts, .md, .yaml)')
    .action((query: string, opts: Record<string, unknown>) => {
      const docs = getIndex(ROOT);
      if (docs.length === 0) {
        printLine('Indice vazio. Execute "ai index" primeiro.');
        return;
      }
      const results = searchDocuments(docs, query, parseInt(opts.max as string, 10), opts.filter as string);
      if (results.length === 0) {
        printLine('Nenhum resultado encontrado.');
        return;
      }
      printLine(`Resultados para "${query}" (${results.length}):\n`);
      for (const r of results) {
        const bar = '█'.repeat(Math.round(r.score * 10)) + '░'.repeat(10 - Math.round(r.score * 10));
        printLine(`  ${(r.score * 100).toFixed(0)}% ${bar} ${r.path}`);
        printLine(`     ${r.chunk.slice(0, 120)}`);
        printLine('');
      }
    });

  cmd
    .command('similar')
    .description('Encontra arquivos similares')
    .argument('<file>', 'Caminho do arquivo de referencia')
    .option('--max <n>', 'Maximo de resultados', '5')
    .action((file: string, opts: Record<string, unknown>) => {
      const docs = getIndex(ROOT);
      if (docs.length === 0) {
        printLine('Indice vazio. Execute "ai index" primeiro.');
        return;
      }
      const results = findSimilarDocuments(docs, file, parseInt(opts.max as string, 10));
      if (results.length === 0) {
        printLine(`Nenhum arquivo similar a "${file}" encontrado.`);
        return;
      }
      printLine(`Arquivos similares a "${file}":\n`);
      for (const r of results) {
        const bar = '█'.repeat(Math.round(r.score * 10)) + '░'.repeat(10 - Math.round(r.score * 10));
        printLine(`  ${(r.score * 100).toFixed(0)}% ${bar} ${r.path}`);
      }
    });

  return cmd;
}

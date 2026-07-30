import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.optimize');
import { spawnSync, execFileSync } from 'node:child_process';
import path from 'node:path';
import { printHeader, printLine, finish } from "../utils/output";
import { getIO } from '../io';
import {
  readJson,
} from './optimize-pipeline';
import { handleOptimizeRun } from './optimize-run';
import { handleOptimizeServe } from './optimize-serve';
import { handleOptimizeClassify } from './optimize-classify';
import { handleOptimizeExplain } from './optimize-explain';
import { handleOptimizeDryRun } from './optimize-dry-run';
import {
  handleTokenEconomyAnalyze,
  handleTokenEconomyEstimate,
  handleTokenEconomyContextAdd,
  handleTokenEconomyCacheAdd,
  handleTokenEconomyStatus,
} from './optimize-token-economy';
import { handleBudgetCalculate, handleBudgetCheck } from './optimize-budget';

export function optimizeCommand(): Command {
  const cmd = new Command('optimize')
    .description('Decision Optimization Layer — analisa impacto, minimiza contexto, calcula risco e qualidade');

  cmd.command('run <request-file>')
    .description('Executa pipeline completa de otimizacao para uma tarefa')
    .option('--budget <file>', 'Arquivo de configuracao de orcamento (YAML/JSON)')
    .option('--auto-classify', 'Classifica tipo de tarefa automaticamente antes de executar')
    .option('--pipeline <mode>', 'Forcar modo: short|full|forensic')
    .action(handleOptimizeRun);

  cmd.command('status')
    .description('Mostra status do ultimo optimizer run')
    .action(() => {
      const cwd = process.cwd();
      const decision = readJson(path.join(cwd, '.ai/optimizer/runtime/latest-decision.json'));
      const quality = readJson(path.join(cwd, '.ai/reports/latest/quality-score.json'));
      const risk = readJson(path.join(cwd, '.ai/reports/latest/risk-score.json'));

      printHeader('Optimizer Status');

      if (!decision && !quality && !risk) {
        printLine('Nenhuma execucao anterior encontrada.');
        printLine('Execute: ai-devkit optimize run <request.json>');
        return;
      }

      if (decision) {
        printLine('=== Ultima Decisao ===');
        printLine(`Task Type: ${decision.task_type}`);
        printLine(`Risk Level: ${decision.risk_level} (${decision.risk_score}/100)`);
        printLine(`Execution Mode: ${decision.execution_mode}`);
        printLine(`Context Profile: ${decision.context_profile}`);
        printLine(`Scope: ${decision.estimated_scope}`);
        printLine(`Agents: ${(decision.recommended_agents as string[] || []).join(', ')}`);
      }

      if (quality) {
        printLine('');
        printLine(`=== Qualidade: ${quality.score}/100 (${quality.level}) ===`);
        for (const reason of (quality.reasons as string[] || [])) {
          printLine(`  - ${reason}`);
        }
      }

      if (risk) {
        printLine('');
        printLine(`=== Risco: ${risk.score}/100 (${risk.level}) ===`);
        for (const reason of (risk.reasons as string[] || [])) {
          printLine(`  - ${reason}`);
        }
      }
    });

  cmd.command('validate')
    .description('Valida configuracao do optimizer')
    .action(() => {
      const result = spawnSync('node', [path.join(process.cwd(), '.ai/optimizer/bin/validate-optimizer-config.js')], {
        cwd: process.cwd(),
        stdio: 'inherit',
        encoding: 'utf-8'
      });
      if (result.status !== 0) {
        finish({ checkpoint: 'optimize_validate', ok: false, status: 'failed', context_summary: 'Configuracao invalida', data: {} });
      } else {
        finish({ checkpoint: 'optimize_validate', ok: true, status: 'passed', context_summary: 'Configuracao valida', data: {} });
      }
    });

  cmd.command('memory')
    .description('Mostra memorias do repositório (patterns, decisions, incidents)')
    .action(() => {
      const cwd = process.cwd();
      const memoryDir = path.join(cwd, '.ai/optimizer/memory');
      if (!getIO().fs.exists(memoryDir)) {
        printLine('Memory directory not found.');
        return;
      }

      const memoryFiles = ['patterns.yaml', 'decisions.yaml', 'incidents.yaml'];
      for (const file of memoryFiles) {
        const filePath = path.join(memoryDir, file);
        if (getIO().fs.exists(filePath)) {
          printLine(`\n=== ${file} ===`);
          const content = getIO().fs.read(filePath, 'utf8');
          printLine(content);
        }
      }
    });

  cmd.command('serve')
    .description('Inicia servidor HTTP para o dashboard do optimizer')
    .option('-p, --port <number>', 'Porta do servidor', '3456')
    .option('-H, --host <host>', 'Host do servidor', 'localhost')
    .option('--open', 'Abre o navegador automaticamente')
    .action(handleOptimizeServe);

  cmd.command('budget-calculate <request-file>')
    .description('Calcula orcamento recomendado para uma tarefa')
    .action(handleBudgetCalculate);

  cmd.command('budget-check')
    .description('Verifica orcamento atual vs limites configurados')
    .action(handleBudgetCheck);

  cmd.command('classify <request-file>')
    .description('Classifica tipo de tarefa automaticamente (bugfix, feature, refactor, docs, etc.)')
    .option('--explain', 'Mostra fatores que influenciaram a classificacao')
    .option('--json', 'Saida em JSON')
    .action(handleOptimizeClassify);

  cmd.command('explain <request-file>')
    .description('Explica quais etapas do pipeline seriam executadas e por que')
    .option('--json', 'Saida em JSON')
    .action(handleOptimizeExplain);

  cmd.command('dry-run <request-file>')
    .description('Simula pipeline sem aplicar mudancas')
    .option('--pipeline <mode>', 'Forcar modo: short|full|forensic')
    .option('--json', 'Saida em JSON')
    .action(handleOptimizeDryRun);

  const economy = cmd.command('token-economy')
    .description('Token Economy Engine — otimizacao de custos de LLM');

  economy.command('analyze <request-file>')
    .description('Analisa uso de tokens e otimizacao para uma tarefa')
    .option('--budget <tokens>', 'Orcamento de tokens para a tarefa')
    .option('--json', 'Saida em JSON')
    .action(handleTokenEconomyAnalyze);

  economy.command('estimate <text>')
    .description('Estima economia de tokens para um prompt')
    .option('--type <type>', 'Tipo de tarefa (bugfix|feature|refactor|etc)')
    .option('--files <n>', 'Numero de arquivos envolvidos', '5')
    .option('--json', 'Saida em JSON')
    .action(handleTokenEconomyEstimate);

  const ctxCmd = economy.command('context')
    .description('Gerencia itens de contexto para otimizacao');
  ctxCmd.command('add <source> <content>')
    .description('Adiciona item de contexto')
    .option('--type <type>', 'Tipo: file|code|architecture|config|decision', 'file')
    .option('--priority <n>', 'Prioridade 1-10', '5')
    .action(handleTokenEconomyContextAdd);

  const cacheCmd = economy.command('cache')
    .description('Gerencia cache de decisoes');
  cacheCmd.command('add <id> <decision> <context> <outcome>')
    .description('Adiciona decisao ao cache')
    .option('--type <type>', 'Tipo de tarefa', 'feature')
    .action(handleTokenEconomyCacheAdd);

  economy.command('status')
    .description('Status do Token Economy Engine')
    .action(handleTokenEconomyStatus);

  cmd.command('score-risk <request-file>')
    .description('Calcula score de risco para uma tarefa')
    .option('--json', 'Saida em JSON')
    .action((requestFile: string, options: { json?: boolean }) => {
      const cwd = process.cwd();
      const script = path.join(cwd, '.ai', 'optimizer', 'bin', 'score-risk.js');
      try {
        const result = execFileSync('node', [script, requestFile], { cwd, encoding: 'utf8', timeout: 30000 }).toString().trim();
        if (options.json) { logger.info(result); }
        else { printHeader('Score de Risco'); printLine(result); }
        finish({ checkpoint: 'score_risk', ok: true, status: 'passed', context_summary: 'Score de risco calculado' });
      } catch {
        printLine('[WARN] score-risk.js not found (run pipeline first)');
        finish({ checkpoint: 'score_risk', ok: false, status: 'failed', context_summary: 'Script nao encontrado' });
      }
    });

  cmd.command('rollback-last')
    .description('Reverte ultima otimizacao aplicada')
    .action(() => {
      const cwd = process.cwd();
      const script = path.join(cwd, '.ai', 'optimizer', 'bin', 'rollback-last.js');
      try {
        const result = execFileSync('node', [script], { cwd, encoding: 'utf8', timeout: 30000 }).toString().trim();
        printHeader('Rollback'); printLine(result);
        finish({ checkpoint: 'rollback', ok: true, status: 'passed', context_summary: 'Rollback executado' });
      } catch {
        printLine('[WARN] rollback-last.js not found (run pipeline first)');
        finish({ checkpoint: 'rollback', ok: false, status: 'failed', context_summary: 'Script nao encontrado' });
      }
    });

  cmd.command('minimize-context <file>')
    .description('Minimiza contexto de um arquivo para economizar tokens')
    .action((file: string) => {
      const cwd = process.cwd();
      const fullPath = path.resolve(cwd, file);
      const script = path.join(cwd, '.ai', 'optimizer', 'bin', 'minimize-context.js');
      try {
        const result = execFileSync('node', [script, fullPath], { cwd, encoding: 'utf8', timeout: 30000 }).toString().trim();
        printHeader('Context Minimized'); printLine(result);
        finish({ checkpoint: 'minimize_context', ok: true, status: 'passed', context_summary: `Contexto minimizado: ${file}` });
      } catch {
        printLine('[WARN] minimize-context.js not found (run pipeline first)');
        finish({ checkpoint: 'minimize_context', ok: false, status: 'failed', context_summary: 'Script nao encontrado' });
      }
    });

  cmd.command('get-repository-memory')
    .description('Exibe memorias do repositorio coletadas pelo optimizer')
    .option('--json', 'Saida em JSON')
    .action((options: { json?: boolean }) => {
      const cwd = process.cwd();
      const script = path.join(cwd, '.ai', 'optimizer', 'bin', 'get-repository-memory.js');
      try {
        const result = execFileSync('node', [script], { cwd, encoding: 'utf8', timeout: 30000 }).toString().trim();
        if (options.json) { logger.info(result); }
        else { printHeader('Repository Memory'); printLine(result); }
        finish({ checkpoint: 'repo_memory', ok: true, status: 'passed', context_summary: 'Repository memory loaded' });
      } catch {
        printLine('[WARN] get-repository-memory.js not found (run pipeline first)');
        finish({ checkpoint: 'repo_memory', ok: false, status: 'failed', context_summary: 'Script nao encontrado' });
      }
    });

  return cmd;
}

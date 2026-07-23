import { Command } from 'commander';
import { buildDevkitState } from '../state/state-builder';
import { renderStateMarkdown, renderStateJSON } from '../state/state-renderer';
import { readOrBuildState } from '../state/state-reader';
import { summarizeState } from '../state/state-summary';
import { validateState } from '../state/state-validator';
import { checkConsistency } from '../hardening/consistency-checker';
import { buildConsistencyReport } from '../state/consistency-builder';
import { buildHardeningReport } from '../hardening/hardening-report';
import { syncStateToFile, getDefaultStatePath } from '../hardening/state-sync';
import { prioritizeInconsistencies, summarizePriorities } from '../state/consistency-prioritizer';
import { printHeader, printLine, printResult, finish } from '../utils/output';

export function stateCommand(): Command {
  const cmd = new Command('state')
    .description('Estado consolidado do ai-devkit — Fase 8');

  cmd
    .command('show')
    .description('Exibe o estado consolidado em markdown')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const { state } = readOrBuildState(process.cwd());
        if (opts.json) {
          printLine(renderStateJSON(state));
        } else {
          printLine(renderStateMarkdown(state));
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir estado: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('summary')
    .description('Exibe resumo do estado')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const { state } = readOrBuildState(process.cwd());
        const summary = summarizeState(state);
        if (opts.json) {
          printLine(JSON.stringify(summary, null, 2));
        } else {
          printHeader('Resumo do Estado');
          printResult('Total de blocos', true, String(summary.totalBlocks));
          printResult('Concluídos', true, String(summary.doneBlocks));
          if (summary.partialBlocks > 0) printResult('Parciais', false, String(summary.partialBlocks));
          if (summary.blockedBlocks > 0) printResult('Bloqueados', false, String(summary.blockedBlocks));
          printResult('Comandos ativos', true, String(summary.activeCommands));
          printResult('Completude', summary.completionPct >= 50, `${summary.completionPct}%`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir resumo: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida completude do estado')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const { state } = readOrBuildState(process.cwd());
        const result = validateState(state);
        if (opts.json) {
          printLine(JSON.stringify(result, null, 2));
        } else {
          printHeader('Validação do Estado');
          printResult('Válido', result.valid);
          for (const err of result.errors) printLine(`  ERRO: ${err}`);
          for (const warn of result.warnings) printLine(`  AVISO: ${warn}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao validar estado: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Gera relatório completo com estado, consistência e hardening')
    .option('--json', 'Saída em JSON')
    .option('--save', 'Salva estado em .ai/state.json')
    .action((opts) => {
      try {
        const { state } = readOrBuildState(process.cwd());
        const consistency = checkConsistency(buildConsistencyReport());
        const report = buildHardeningReport(state, consistency);

        if (opts.json) {
          printLine(JSON.stringify(report, null, 2));
        } else {
          printHeader('Relatório de Hardening');
          printResult('Estado', true, state.summary.substring(0, 60));
          printResult('Consistência', consistency.ok, `${consistency.attentionCount} atenção, ${consistency.blockedCount} bloqueados`);
          for (const rec of report.recommendations) printLine(`  → ${rec}`);
        }

        if (opts.save) {
          const statePath = getDefaultStatePath(process.cwd());
          const syncResult = syncStateToFile(state, statePath);
          printResult('Estado salvo', syncResult.written, statePath);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao gerar relatório: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('priorities')
    .description('Exibe gaps priorizados por risco')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const report = buildConsistencyReport();
        const prioritized = prioritizeInconsistencies(report);
        const summary = summarizePriorities(prioritized);

        if (opts.json) {
          printLine(JSON.stringify({ prioritized, summary }, null, 2));
          return;
        }

        printHeader('Gaps Priorizados');
        for (const item of prioritized) {
          const icon = item.risk === 'critical' ? '❌' : item.risk === 'high' ? '⚠️' : item.risk === 'medium' ? '⚡' : '✅';
          printLine(`  ${icon} ${item.area} (score: ${item.score}, risco: ${item.risk})`);
          for (const gap of item.gaps) printLine(`     - ${gap}`);
          printLine(`     → ${item.recommendation}`);
        }
        for (const s of summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar prioridades: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

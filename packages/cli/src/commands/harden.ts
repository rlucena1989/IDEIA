import { Command } from 'commander';
import { buildDevkitState } from '../state/state-builder';
import { buildConsistencyReport } from '../state/consistency-builder';
import { checkConsistency } from '../hardening/consistency-checker';
import { buildHardeningReport } from '../hardening/hardening-report';
import { createOkOutput, createErrorOutput, createEnvelope } from '../hardening/output-contract';
import { categorizeErrors, formatErrorSummary } from '../hardening/error-contract';
import { syncStateToFile, getDefaultStatePath } from '../hardening/state-sync';
import { runHardeningCheck } from '../hardening/hardening-checker';
import { categorizeWarnings, formatWarningSummary } from '../hardening/warning-contract';
import { printHeader, printLine, printResult, finish } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function hardenCommand(): Command {
  const cmd = new Command('harden')
    .description('Hardening do projeto — contratos, consistência e sincronização — Fase 8');

  cmd
    .command('check')
    .description('Verifica consistência entre docs, código, testes, CLI e extensão')
    .option('--json', 'Saída em JSON')
    .option('--deep', 'Executa verificação profunda com hardening-checker')
    .action((opts) => {
      try {
        const report = buildConsistencyReport();
        const result = checkConsistency(report);

        if (opts.deep) {
          const state = buildDevkitState();
          const deepResult = runHardeningCheck(state, report);
          const envelope = createEnvelope({
            ok: deepResult.ok,
            command: 'harden check --deep',
            version: getCliVersion(),
            data: deepResult,
          });

          if (opts.json) {
            printLine(JSON.stringify(envelope, null, 2));
            return;
          }

          printHeader('Hardening Check (profundo)');
          printResult('Status', deepResult.ok, `score: ${deepResult.score}/100`);
          for (const err of deepResult.errors) printLine(`  ERRO [${err.severity}]: ${err.message}`);
          for (const warn of deepResult.warnings) printLine(`  AVISO: ${warn.message}`);
          printLine(`  ${deepResult.summary}`);
        } else {
          const output = createOkOutput('harden check', getCliVersion(), {
            consistency: result,
            items: report.items,
          });

          if (opts.json) {
            printLine(JSON.stringify(output, null, 2));
            return;
          }

          printHeader('Consistência Check');
          printResult('Geral', result.ok, `${result.attentionCount} atenção, ${result.blockedCount} bloqueados`);
          for (const item of report.items) {
            const icon = item.status === 'ok' ? '✅' : item.status === 'attention' ? '⚠️' : '❌';
            printLine(`  ${icon} ${item.area}: docs=${item.docs} code=${item.code} tests=${item.tests} cli=${item.cli} ext=${item.extension}`);
            for (const note of item.notes) printLine(`    → ${note}`);
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no hardening check: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Gera relatório de hardening')
    .option('--json', 'Saída em JSON')
    .option('--save', 'Salva estado em .ai/state.json')
    .action((opts) => {
      try {
        const state = buildDevkitState();
        const consistency = checkConsistency(buildConsistencyReport());
        const report = buildHardeningReport(state, consistency);
        const output = createOkOutput('harden report', getCliVersion(), report);

        if (opts.json) {
          printLine(JSON.stringify(output, null, 2));
          return;
        }

        printHeader('Relatório de Hardening');
        printLine(`Gerado em: ${report.generatedAt}`);
        printResult('Consistência', consistency.ok, `${consistency.attentionCount} áreas com atenção`);
        for (const rec of report.recommendations) printLine(`  → ${rec}`);

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
    .command('sync')
    .description('Sincroniza estado com arquivo .ai/state.json')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const state = buildDevkitState();
        const statePath = getDefaultStatePath(process.cwd());
        const result = syncStateToFile(state, statePath);
        const output = result.written
          ? createOkOutput('harden sync', getCliVersion(), { path: result.path })
          : createErrorOutput('harden sync', getCliVersion(), [result.error ?? 'Erro desconhecido']);

        if (opts.json) {
          printLine(JSON.stringify(output, null, 2));
          return;
        }

        if (result.written) {
          printResult('Estado sincronizado', true, result.path);
        } else {
          printResult('Erro na sincronização', false, result.error);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao sincronizar: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

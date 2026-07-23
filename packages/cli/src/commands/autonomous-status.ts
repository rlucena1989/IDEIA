import { Command } from 'commander';
import { detectDrift } from '../autonomous/drift-detector';
import { analyzeTrend } from '../autonomous/trend-analyzer';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function autonomousStatusCommand(): Command {
  const cmd = new Command('autonomous-status')
    .description('Status, drift e tendências — Fase 21');

  cmd
    .command('show')
    .description('Exibe status consolidado')
    .option('--score <score>', 'Score atual', '85')
    .option('--expected <expected>', 'Score esperado', '88')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const current = parseInt(opts.score, 10);
        const expected = parseInt(opts.expected, 10);
        const drift = detectDrift(current, expected);
        const envelope = createEnvelope({
          ok: !drift, command: 'autonomous-status show', version: getCliVersion(),
          data: { currentScore: current, expectedScore: expected, drift },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status Autônomo');
        printLine(`  Score atual: ${current} / esperado: ${expected}`);
        if (drift) {
          printLine(`  ⚠ Drift: ${drift.description} (${drift.severity})`);
        } else {
          printLine('  ✅ Sem drift detectado');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('drift')
    .description('Detecta drift entre score atual e esperado')
    .argument('<current>', 'Score atual')
    .argument('<expected>', 'Score esperado')
    .option('--json', 'Saída em JSON')
    .action((currentStr: string, expectedStr: string, opts) => {
      try {
        const current = parseInt(currentStr, 10);
        const expected = parseInt(expectedStr, 10);
        const drift = detectDrift(current, expected);
        const envelope = createEnvelope({
          ok: !drift, command: 'autonomous-status drift', version: getCliVersion(),
          data: { drift },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        if (drift) {
          printLine(`⚠ Drift: ${drift.description} (severidade: ${drift.severity})`);
        } else {
          printLine('✅ Sem drift (diferença ≤ 5)');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no drift: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('trends')
    .description('Analisa tendência de valores')
    .argument('<values>', 'Valores em JSON array')
    .option('--dimension <dim>', 'Dimensão', 'performance')
    .option('--json', 'Saída em JSON')
    .action((valuesStr: string, opts) => {
      try {
        const values: number[] = JSON.parse(valuesStr);
        const trend = analyzeTrend(values, opts.dimension);
        const envelope = createEnvelope({
          ok: trend.direction !== 'degrading', command: 'autonomous-status trends', version: getCliVersion(),
          data: trend,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        const icon = trend.direction === 'improving' ? '📈' : trend.direction === 'stable' ? '➡️' : '📉';
        printLine(`  ${icon} ${trend.dimension}: ${trend.direction} (confiança: ${(trend.confidence * 100).toFixed(0)}%)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na tendência: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

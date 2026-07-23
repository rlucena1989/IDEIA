import { Command } from 'commander';
import { consolidateSystem } from '../consolidation/consolidation-engine';
import { createFinalVerdict } from '../consolidation/final-verdict';
import { resolveAutonomy } from '../consolidation/autonomy-controller';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function verdictCommand(): Command {
  const cmd = new Command('verdict')
    .description('Veredito final e decisão de autonomia — Fase 20');

  cmd
    .command('show')
    .description('Exibe o veredito atual do sistema')
    .option('--telemetry <n>', 'Telemetria', '42')
    .option('--alerts <n>', 'Alertas', '0')
    .option('--failures <n>', 'Falhas', '0')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const signals = {
          telemetryCount: parseInt(opts.telemetry, 10),
          alertCount: parseInt(opts.alerts, 10),
          failureCount: parseInt(opts.failures, 10),
          policyViolationCount: 0,
          activeAgents: 5,
        };
        const consolidation = consolidateSystem(signals);
        const verdict = createFinalVerdict(consolidation);
        const envelope = createEnvelope({
          ok: verdict.allowAutonomy, command: 'verdict show', version: getCliVersion(),
          data: { consolidation, verdict },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Veredito Final');
        const icon = verdict.status === 'ready-for-autonomy' ? '🚀' : verdict.status === 'healthy' ? '✅' : verdict.status === 'degraded' ? '⚠️' : '❌';
        printLine(`  ${icon} Status: ${verdict.status}`);
        printLine(`  Score: ${consolidation.score}/100`);
        printLine(`  Motivo: ${verdict.reason}`);
        printResult('Autonomia', verdict.allowAutonomy);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no veredito: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('explain')
    .description('Explica o racional por trás do veredito')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const signals = { telemetryCount: 42, alertCount: 1, failureCount: 0, policyViolationCount: 0, activeAgents: 5 };
        const consolidation = consolidateSystem(signals);
        const verdict = createFinalVerdict(consolidation);
        const autonomy = resolveAutonomy(verdict);
        const explanation = {
          score: consolidation.score,
          healthStatus: consolidation.healthStatus,
          signals: consolidation.signals,
          verdict: verdict.status,
          autonomyEnabled: autonomy.enabled,
          autonomyLevel: autonomy.level,
          recommendation: consolidation.recommendations[0],
        };
        const envelope = createEnvelope({
          ok: true, command: 'verdict explain', version: getCliVersion(), data: explanation,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Explicação do Veredito');
        printLine(`  Score ${consolidation.score} → ${verdict.status}`);
        printLine(`  Penalidades: ${consolidation.signals.alerts} alertas + ${consolidation.signals.failures} falhas`);
        printLine(`  Autonomia: ${autonomy.level} (${autonomy.enabled ? 'ativada' : 'desativada'})`);
        printLine(`  → ${verdict.reason}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na explicação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

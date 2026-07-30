import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { consolidateSystem } from '../consolidation/consolidation-engine';
import { createFinalVerdict } from '../consolidation/final-verdict';
import { closeCycle } from '../consolidation/closure-manager';
import { resolveAutonomy } from '../consolidation/autonomy-controller';
import { buildSystemSynthesis } from '../consolidation/system-synthesis';
import { buildConsolidationReport } from '../consolidation/consolidation-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function consolidateCommand(): Command {
  const cmd = new Command('consolidate')
    .description('Consolidação final do sistema — Fase 20');

  cmd
    .command('run')
    .description('Executa consolidação completa do sistema')
    .option('--telemetry <n>', 'Eventos de telemetria', '42')
    .option('--alerts <n>', 'Alertas ativos', '2')
    .option('--failures <n>', 'Falhas detectadas', '1')
    .option('--violations <n>', 'Violações de política', '0')
    .option('--agents <n>', 'Agentes ativos', '5')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const signals = {
          telemetryCount: parseInt(opts.telemetry, 10),
          alertCount: parseInt(opts.alerts, 10),
          failureCount: parseInt(opts.failures, 10),
          policyViolationCount: parseInt(opts.violations, 10),
          activeAgents: parseInt(opts.agents, 10),
        };
        const consolidation = consolidateSystem(signals);
        const verdict = createFinalVerdict(consolidation);
        const closure = closeCycle(
          ['Fase 19 concluída', 'Simulação validada'],
          ['Revisar política de autonomia']
        );
        const autonomy = resolveAutonomy(verdict);
        const synthesis = buildSystemSynthesis([
          'state', 'hardening', 'generation', 'evolution', 'adaptive',
          'context', 'publication', 'distribution', 'telemetry',
          'resilience', 'governance', 'agents', 'strategy', 'simulation',
        ]);
        const report = buildConsolidationReport({ consolidation, verdict, closure, autonomy, synthesis });
        const envelope = createEnvelope({
          ok: consolidation.healthStatus !== 'blocked',
          command: 'consolidate run', version: getCliVersion(),
          data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Consolidação Final do Sistema');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        printLine(`  Recomendações:`);
        for (const r of consolidation.recommendations) printLine(`  → ${r}`);
        printLine(`  Síntese: ${synthesis.subsystems.length} subsistemas integrados`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na consolidação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Exibe status consolidado do sistema')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const signals = { telemetryCount: 42, alertCount: 0, failureCount: 0, policyViolationCount: 0, activeAgents: 5 };
        const consolidation = consolidateSystem(signals);
        const envelope = createEnvelope({
          ok: true, command: 'consolidate status', version: getCliVersion(),
          data: { health: consolidation.healthStatus, score: consolidation.score },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status Consolidado');
        const icon = consolidation.healthStatus === 'healthy' ? '✅' : consolidation.healthStatus === 'degraded' ? '⚠️' : '❌';
        printLine(`  ${icon} Saúde: ${consolidation.healthStatus} (score: ${consolidation.score}/100)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

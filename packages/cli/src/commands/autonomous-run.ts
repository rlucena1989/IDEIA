import { Command } from 'commander';
import * as _crypto from 'node:crypto';
import { startCycle, endCycle } from '../autonomous/cycle-controller';
import { detectDrift } from '../autonomous/drift-detector';
import { analyzeTrend } from '../autonomous/trend-analyzer';
import { createCorrectionAction, applySelfCorrection } from '../autonomous/self-correction-engine';
import { buildMaintenancePlan } from '../autonomous/maintenance-planner';
import { buildAutonomousReport } from '../autonomous/autonomous-report';
import { createContinuityGuard, recordCycleResult } from '../autonomous/continuity-guard';
import { AutonomousCycle } from '../autonomous/autonomous-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

let activeCycle: AutonomousCycle | undefined;
let guard = createContinuityGuard(3);

export function autonomousRunCommand(): Command {
  const cmd = new Command('autonomous-run')
    .description('Operação autônoma contínua — Fase 21');

  cmd
    .command('start')
    .description('Inicia um ciclo autônomo')
    .option('--score <score>', 'Score atual', '85')
    .option('--expected <expected>', 'Score esperado', '90')
    .option('--trend-values <json>', 'Valores de tendência (JSON array)', '[80, 82, 85]')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        activeCycle = startCycle();
        const currentScore = parseInt(opts.score, 10);
        const expectedScore = parseInt(opts.expected, 10);
        const trendValues: number[] = JSON.parse(opts.trendValues);

        const drift = detectDrift(currentScore, expectedScore);
        const trend = analyzeTrend(trendValues, 'performance');
        const corrections = applySelfCorrection([
          createCorrectionAction('Reindex state cache', true),
          createCorrectionAction('Recalibrate thresholds', drift !== null),
        ]);
        const drifts = drift ? [drift] : [];
        const maintenance = buildMaintenancePlan(drifts, [trend]);
        const cycle = endCycle(activeCycle, drift ? 'degraded' : 'completed', 'Cycle executed.');
        guard = recordCycleResult(guard, !drift);
        const report = buildAutonomousReport({ cycle, drifts, trends: [trend], corrections, maintenance });
        const envelope = createEnvelope({
          ok: cycle.status !== 'blocked', command: 'autonomous-run start', version: getCliVersion(),
          data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Ciclo Autônomo');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        if (drift) printLine(`  ⚠ Drift: ${drift.description}`);
        printLine(`  🔧 Correções: ${corrections.filter(c => c.appliedAt).length} aplicada(s)`);
        printLine(`  🛡️ Guard: ${guard.stopped ? 'PARADO' : 'Operacional'} (${guard.consecutiveFailures} falhas consecutivas)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no ciclo: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('stop')
    .description('Para o ciclo ativo')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (activeCycle) {
          activeCycle = endCycle(activeCycle, 'completed', 'Cycle stopped by user.');
        }
        const envelope = createEnvelope({
          ok: true, command: 'autonomous-run stop', version: getCliVersion(),
          data: { stopped: true },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printLine('Ciclo parado.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao parar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Status do ciclo atual')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const data = {
          active: !!activeCycle,
          cycleStatus: activeCycle?.status ?? 'none',
          guardStopped: guard.stopped,
          consecutiveFailures: guard.consecutiveFailures,
        };
        const envelope = createEnvelope({
          ok: !guard.stopped, command: 'autonomous-run status', version: getCliVersion(), data,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status Autônomo');
        printLine(`  Ciclo ativo: ${data.active ? 'Sim' : 'Não'}`);
        printLine(`  Status: ${data.cycleStatus}`);
        printLine(`  Guard: ${data.guardStopped ? '🔴 PARADO' : '🟢 OK'}`);
        printLine(`  Falhas consecutivas: ${data.consecutiveFailures}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

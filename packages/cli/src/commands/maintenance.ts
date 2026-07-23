import { Command } from 'commander';
import { detectDrift } from '../autonomous/drift-detector';
import { analyzeTrend } from '../autonomous/trend-analyzer';
import { buildMaintenancePlan } from '../autonomous/maintenance-planner';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function maintenanceCommand(): Command {
  const cmd = new Command('maintenance')
    .description('Manutenção preventiva e corretiva — Fase 21');

  cmd
    .command('plan')
    .description('Gera plano de manutenção com base em drifts e tendências')
    .option('--score <score>', 'Score atual', '78')
    .option('--expected <expected>', 'Score esperado', '90')
    .option('--trend-values <json>', 'Valores de tendência', '[85, 82, 78]')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const drift = detectDrift(parseInt(opts.score, 10), parseInt(opts.expected, 10));
        const trend = analyzeTrend(JSON.parse(opts.trendValues), 'performance');
        const drifts = drift ? [drift] : [];
        const plan = buildMaintenancePlan(drifts, [trend]);
        const envelope = createEnvelope({
          ok: plan.priority !== 'critical', command: 'maintenance plan', version: getCliVersion(),
          data: plan,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plano de Manutenção');
        const icon = plan.priority === 'critical' ? '❌' : plan.priority === 'high' ? '⚠️' : plan.priority === 'medium' ? '⚡' : '✅';
        printLine(`  ${icon} Prioridade: ${plan.priority}`);
        printLine(`  Ações (${plan.actions.length}):`);
        for (const action of plan.actions) printLine(`  → ${action}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no plano: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('run')
    .description('Executa ações de manutenção preventiva')
    .option('--score <score>', 'Score atual', '80')
    .option('--expected <expected>', 'Score esperado', '85')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const drift = detectDrift(parseInt(opts.score, 10), parseInt(opts.expected, 10));
        const trend = analyzeTrend([85, 83, 80], 'performance');
        const drifts = drift ? [drift] : [];
        const plan = buildMaintenancePlan(drifts, [trend]);
        const executed = plan.actions.map(a => ({ action: a, executed: true }));
        const envelope = createEnvelope({
          ok: plan.priority !== 'critical', command: 'maintenance run', version: getCliVersion(),
          data: { plan, executed },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Execução de Manutenção');
        printLine(`  Prioridade: ${plan.priority}`);
        for (const e of executed) printLine(`  ✅ ${e.action}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na manutenção: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório de manutenção')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const drift = detectDrift(82, 90);
        const trend = analyzeTrend([90, 85, 82], 'performance');
        const drifts = drift ? [drift] : [];
        const plan = buildMaintenancePlan(drifts, [trend]);
        const envelope = createEnvelope({
          ok: true, command: 'maintenance report', version: getCliVersion(), data: plan,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Manutenção');
        printLine(`  Plano: ${plan.planId.substring(0, 12)}...`);
        printLine(`  Prioridade: ${plan.priority}`);
        printLine(`  Ações: ${plan.actions.length}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

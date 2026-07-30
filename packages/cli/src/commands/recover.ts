import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { detectFailures } from '../resilience/failure-detector';
import { resolveFallback } from '../resilience/fallback-policy';
import { buildRecoveryPlan } from '../resilience/recovery-plan';
import { executeRecovery } from '../resilience/recovery-engine';
import { createCircuitBreaker, updateCircuitBreaker } from '../resilience/circuit-breaker';
import { coordinateRepair } from '../resilience/repair-coordinator';
import { createFailure, type OperationalFailure } from '../resilience/failure-types';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function recoverCommand(): Command {
  const cmd = new Command('recover')
    .description('Recuperação e auto-reparo assistido — Fase 15');

  cmd
    .command('detect')
    .description('Detecta falhas a partir de eventos')
    .argument('<events>', 'Eventos em JSON string')
    .option('--json', 'Saída em JSON')
    .action((eventsStr: string, opts) => {
      try {
        const events = JSON.parse(eventsStr);
        const { failures, summary } = detectFailures(events);
        const envelope = createEnvelope({
          ok: failures.length === 0, command: 'recover detect', version: getCliVersion(),
          data: { failures, summary },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Detecção de Falhas');
        printLine(`  Total: ${summary.total} | Críticas: ${summary.critical}`);
        for (const f of failures) {
          const icon = f.severity === 'critical' ? '❌' : '⚠️';
          printLine(`  ${icon} [${f.type}] ${f.source}: ${f.message}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na detecção: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('plan')
    .description('Gera plano de recuperação para uma falha')
    .argument('<type>', 'Tipo da falha (integrity, sync, consistency, etc)')
    .option('--source <source>', 'Fonte', 'system')
    .option('--severity <severity>', 'Severidade', 'high')
    .option('--json', 'Saída em JSON')
    .action((type: string, opts) => {
      try {
        const failure = createFailure({
          type: type as OperationalFailure['type'], source: opts.source,
          message: `Falha de ${type} detectada`, severity: opts.severity as OperationalFailure['severity'],
        });
        const plan = buildRecoveryPlan(failure);
        const envelope = createEnvelope({
          ok: true, command: 'recover plan', version: getCliVersion(), data: plan,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plano de Recuperação');
        printLine(`  Plano: ${plan.planId}`);
        printLine(`  Escalação: ${plan.escalationRequired ? 'Sim' : 'Não'}`);
        printLine(`  Passos:`);
        for (const step of plan.steps) {
          printLine(`  ${step.required ? '🔧' : '📋'} ${step.stepId}: ${step.description}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no plano: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('run')
    .description('Executa recuperação completa: detect → fallback → plan → recover')
    .argument('<events>', 'Eventos em JSON string')
    .option('--json', 'Saída em JSON')
    .action((eventsStr: string, opts) => {
      try {
        const events = JSON.parse(eventsStr);
        const { failures } = detectFailures(events);
        const breaker = createCircuitBreaker('recovery', 3);

        if (failures.length === 0) {
          printLine('Nenhuma falha detectada. Sistema saudável.');
          return;
        }

        const results = failures.map(f => coordinateRepair(f, breaker));
        const envelope = createEnvelope({
          ok: results.every(r => r.recovery.ok),
          command: 'recover run', version: getCliVersion(), data: { results },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Execução de Recuperação');
        for (const r of results) {
          printLine(`  ${r.recovery.ok ? '✅' : '❌'} ${r.failure.source}`);
          printLine(`     Fallback: ${r.fallback.action}`);
          printLine(`     Passos: ${r.recovery.appliedSteps.join(', ')}`);
          printLine(`     Breaker: ${r.breaker.open ? 'ABERTO' : 'FECHADO'}`);
          printLine(`     ${r.summary}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na recuperação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório de recuperação')
    .argument('<events>', 'Eventos em JSON string')
    .option('--json', 'Saída em JSON')
    .action((eventsStr: string, opts) => {
      try {
        const events = JSON.parse(eventsStr);
        const { failures, summary } = detectFailures(events);
        const breaker = createCircuitBreaker('report', 3);
        const fallbacks = failures.map(f => resolveFallback(f));
        const plans = failures.map(f => buildRecoveryPlan(f));
        const recoveries = plans.map(p => executeRecovery(p));
        const breakers = failures.map((_, i) => updateCircuitBreaker(
          i === 0 ? breaker : { ...breaker, failureCount: i },
          !recoveries[i]?.ok
        ));

        const envelope = createEnvelope({
          ok: summary.critical === 0, command: 'recover report', version: getCliVersion(),
          data: { failures, summary, fallbacks, plans, recoveries, breakers },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Resiliência');
        printLine(`  Falhas: ${summary.total} | Críticas: ${summary.critical}`);
        for (let i = 0; i < failures.length; i++) {
          const r = recoveries[i]; const f = failures[i]; const fb = fallbacks[i];
          printLine(`  ${r?.ok ? '✅' : '❌'} ${f?.source ?? 'unknown'} → fallback: ${fb?.action ?? 'none'}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

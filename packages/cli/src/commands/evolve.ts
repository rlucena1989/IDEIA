import { Command } from 'commander';
import * as crypto from 'node:crypto';
import { buildDevkitState } from '../state/state-builder';
import type { DevkitState } from '../state/state-types';
import type { EvolutionChange } from '../self-evolution/evolution-types';
import { buildStateDelta } from '../evolution/delta-engine';
import { decideEvolution } from '../evolution/decision-engine';
import { orchestrateEvolution } from '../evolution/execution-orchestrator';
import { revalidateEvolution } from '../evolution/revalidation-service';
import { createAuditEntry, buildAuditTrail } from '../evolution/audit-trail';
import { buildEvolutionReport } from '../evolution/evolution-report';
import { DEFAULT_EVOLUTION_POLICY } from '../evolution/evolution-policy';
import { buildReconfigurationPlan } from '../self-evolution/reconfiguration-plan';
import { applyReconfiguration } from '../self-evolution/reconfiguration-engine';
import { validateEvolution } from '../self-evolution/evolution-guard';
import { rollbackEvolution } from '../self-evolution/rollback-manager';
import { createEvolutionAudit } from '../self-evolution/evolution-audit';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function evolveCommand(): Command {
  const cmd = new Command('evolve')
    .description('Execução autônoma governada — Fase 10');

  cmd
    .command('delta')
    .description('Compara versões do estado e extrai mudanças')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const fromState: Record<string, unknown> = { version: '1.0.0', blocks: ['governance', 'planning'] };
        const toState: Record<string, unknown> = buildDevkitState() as unknown as Record<string, unknown>;
        const delta = buildStateDelta(fromState, toState);
        const envelope = createEnvelope({
          ok: true, command: 'evolve delta', version: getCliVersion(),
          data: delta,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Delta de Estado');
        printLine(`  De: ${delta.fromVersion} → Para: ${delta.toVersion}`);
        printLine(`  Adicionados: ${delta.summary.added}`);
        printLine(`  Removidos: ${delta.summary.removed}`);
        printLine(`  Alterados: ${delta.summary.changed}`);
        printLine(`  Críticos: ${delta.summary.critical}`);
        for (const change of delta.changes.filter(c => c.kind !== 'unchanged').slice(0, 10)) {
          printLine(`  [${change.kind}] ${change.path} (${change.impact}) — ${change.reason}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no delta: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('decide')
    .description('Toma decisão governada com base nos scores atuais')
    .option('--json', 'Saída em JSON')
    .option('--consistency <score>', 'Score de consistência', '82')
    .option('--hardening <score>', 'Score de hardening', '88')
    .option('--generation <score>', 'Score de geração', '79')
    .action((opts) => {
      try {
        const ctx = {
          deltaSummary: { added: 0, removed: 0, changed: 1, critical: 0 },
          consistencyScore: parseInt(opts.consistency, 10),
          hardeningScore: parseInt(opts.hardening, 10),
          generationScore: parseInt(opts.generation, 10),
        };
        const decision = decideEvolution(ctx, DEFAULT_EVOLUTION_POLICY);
        const envelope = createEnvelope({
          ok: decision.action !== 'block', command: 'evolve decide', version: getCliVersion(),
          data: decision,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Decisão de Evolução');
        printLine(`  Ação: ${decision.action}`);
        printLine(`  Risco: ${decision.risk}`);
        printLine(`  Confiança: ${(decision.confidence * 100).toFixed(0)}%`);
        printLine(`  Justificativa: ${decision.rationale}`);
        printResult('Requer aprovação', !decision.requiresApproval, decision.requiresApproval ? 'Sim' : 'Não');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na decisão: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('run')
    .description('Executa ciclo completo: delta → decisão → ação')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const fromState = { version: '1.0.0', blocks: ['governance', 'planning'] } as unknown as DevkitState;
        const toState = buildDevkitState();
        const result = orchestrateEvolution(fromState, toState);

        if (opts.json) {
          const envelope = createEnvelope({
            ok: result.ok, command: 'evolve run', version: getCliVersion(),
            data: result,
          });
          printLine(JSON.stringify(envelope, null, 2));
          return;
        }

        printHeader('Execução de Evolução');
        printResult('Status', result.ok, result.ok ? 'Executado' : 'Bloqueado');
        printLine(`  Ação: ${result.action}`);
        printLine(`  Justificativa: ${result.rationale}`);
        printLine(`  Audit ID: ${result.auditId}`);
        for (const note of result.validation.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na execução: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('audit')
    .description('Gera trilha de auditoria para ações de evolução')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const requestId = crypto.randomUUID();
        const entry1 = createAuditEntry({
          command: 'evolve run', action: 'generate', rationale: 'Generation needed',
          requestId, result: 'ok', notes: ['Artefatos gerados com sucesso.'],
        });
        const entry2 = createAuditEntry({
          command: 'evolve run', action: 'sync', rationale: 'Sync after generate',
          requestId, result: 'ok', notes: ['Estado sincronizado.'],
        });
        const trail = buildAuditTrail([entry1, entry2]);

        if (opts.json) {
          const envelope = createEnvelope({
            ok: true, command: 'evolve audit', version: getCliVersion(),
            data: trail,
          });
          printLine(JSON.stringify(envelope, null, 2));
          return;
        }

        printHeader('Trilha de Auditoria');
        printLine(`  Gerado em: ${trail.generatedAt}`);
        for (const entry of trail.entries) {
          const icon = entry.result === 'ok' ? '✅' : entry.result === 'blocked' ? '❌' : '⚠️';
          printLine(`  ${icon} ${entry.action} (${entry.result})`);
          printLine(`     Audit: ${entry.auditId.substring(0, 8)}...`);
          printLine(`     ${entry.rationale}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na auditoria: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('revalidate')
    .description('Revalida estado pós-ação comparando scores')
    .option('--before <score>', 'Score antes da ação', '75')
    .option('--after <score>', 'Score depois da ação', '85')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const before = parseInt(opts.before, 10);
        const after = parseInt(opts.after, 10);
        const result = revalidateEvolution(before, after);
        const envelope = createEnvelope({
          ok: result.ok, command: 'evolve revalidate', version: getCliVersion(),
          data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Revalidação');
        printResult('Status', result.ok, result.delta >= 0 ? 'Melhorou' : 'Regrediu');
        printLine(`  Antes: ${result.beforeScore} → Depois: ${result.afterScore} (delta: ${result.delta > 0 ? '+' : ''}${result.delta})`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na revalidação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Gera relatório completo de evolução')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const rawFrom = { version: '1.0.0', blocks: ['governance'] };
        const rawTo = buildDevkitState();
        const delta = buildStateDelta(rawFrom, rawTo as unknown as Record<string, unknown>);
        const decision = decideEvolution({
          deltaSummary: delta.summary, consistencyScore: 82, hardeningScore: 88, generationScore: 79,
        });
        const execution = orchestrateEvolution(rawFrom as unknown as DevkitState, rawTo);
        const revalidation = revalidateEvolution(75, 85);
        const requestId = crypto.randomUUID();
        const audit = buildAuditTrail([
          createAuditEntry({ command: 'evolve report', action: execution.action, rationale: execution.rationale, requestId, result: execution.ok ? 'ok' : 'blocked' }),
        ]);
        const report = buildEvolutionReport({ delta, decision, execution, revalidation, audit });

        if (opts.json) {
          const envelope = createEnvelope({
            ok: report.execution.ok, command: 'evolve report', version: getCliVersion(),
            data: report,
          });
          printLine(JSON.stringify(envelope, null, 2));
          return;
        }

        printHeader('Relatório de Evolução');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        printLine(`  Gerado em: ${report.generatedAt}`);
        printLine(`  De: ${report.delta.fromVersion} → ${report.delta.toVersion}`);
        printLine(`  Decisão: ${report.decision.action} (confiança: ${(report.decision.confidence * 100).toFixed(0)}%)`);
        printLine(`  Auditoria: ${report.audit.entries.length} entrada(s)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  // Fase 23 — Autoevolução controlada
  cmd
    .command('plan')
    .description('Constrói plano de reconfiguração do sistema')
    .argument('<target>', 'Alvo da mudança')
    .argument('<action>', 'Ação: enable, disable, replace, tune, migrate')
    .option('--reason <reason>', 'Motivo', 'Evolução planejada')
    .option('--json', 'Saída em JSON')
    .action((target: string, action: string, opts) => {
      try {
        const change: EvolutionChange = { changeId: `c-${Date.now()}`, type: action as EvolutionChange['type'], target, reason: opts.reason };
        const plan = buildReconfigurationPlan([change]);
        const envelope = createEnvelope({
          ok: true, command: 'evolve plan', version: getCliVersion(), data: plan,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plano de Evolução');
        printLine(`  ID: ${plan.planId.substring(0, 12)}...`);
        printLine(`  Mudanças: ${plan.changes.length} item(ns)`);
        printLine(`  Requer aprovação: ${plan.requiresApproval ? 'Sim' : 'Não'}`);
        printLine(`  Rollback: ${plan.rollbackAvailable ? 'Disponível' : 'Indisponível'}`);
        for (const c of plan.changes) printLine(`  → ${c.type}: ${c.target}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no plano: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('apply')
    .description('Aplica plano de evolução com validação')
    .argument('<target>', 'Alvo')
    .argument('<action>', 'Ação')
    .option('--reason <reason>', 'Motivo', 'Evolução')
    .option('--health <score>', 'Score de saúde', '85')
    .option('--json', 'Saída em JSON')
    .action((target: string, action: string, opts) => {
      try {
        const change: EvolutionChange = { changeId: `c-${Date.now()}`, type: action as EvolutionChange['type'], target, reason: opts.reason };
        const plan = buildReconfigurationPlan([change]);
        const check = validateEvolution(plan, parseInt(opts.health, 10));

        if (!check.allowed) {
          if (opts.json) {
            printLine(JSON.stringify(createEnvelope({ ok: false, command: 'evolve apply', version: getCliVersion(), data: { check } }), null, 2));
            return;
          }
          printLine(`❌ ${check.reason}`);
          return;
        }

        const result = applyReconfiguration(plan);
        const audit = createEvolutionAudit({ planId: plan.planId, action, before: '', after: target, success: true });
        const envelope = createEnvelope({
          ok: true, command: 'evolve apply', version: getCliVersion(),
          data: { plan, result, audit },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Evolução Aplicada');
        printResult('OK', true, `${target} → ${action}`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao aplicar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('rollback')
    .description('Reverte um plano de evolução')
    .argument('<target>', 'Alvo')
    .option('--json', 'Saída em JSON')
    .action((target: string, opts) => {
      try {
        const change = { changeId: `c-${Date.now()}`, type: 'replace' as const, target, reason: 'Rollback' };
        const plan = buildReconfigurationPlan([change]);
        const result = rollbackEvolution(plan);
        const envelope = createEnvelope({
          ok: result.rolledBack, command: 'evolve rollback', version: getCliVersion(), data: result,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Rollback');
        printResult('Revertido', result.rolledBack);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no rollback: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

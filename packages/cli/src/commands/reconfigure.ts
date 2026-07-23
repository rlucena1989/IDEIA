import { Command } from 'commander';
import { CapabilitySwitchboard } from '../self-evolution/capability-switchboard';
import { buildReconfigurationPlan } from '../self-evolution/reconfiguration-plan';
import type { EvolutionChange } from '../self-evolution/evolution-types';
import { applyReconfiguration } from '../self-evolution/reconfiguration-engine';
import { validateEvolution } from '../self-evolution/evolution-guard';
import { createEvolutionAudit } from '../self-evolution/evolution-audit';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const switchboard = new CapabilitySwitchboard();
switchboard.enable('state');
switchboard.enable('generation');
switchboard.enable('hardening');

const auditTrail: ReturnType<typeof createEvolutionAudit>[] = [];

export function reconfigureCommand(): Command {
  const cmd = new Command('reconfigure')
    .description('Reconfiguração segura do sistema — Fase 23');

  cmd
    .command('show')
    .description('Exibe capacidades ativas')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const capabilities = switchboard.list();
        const envelope = createEnvelope({
          ok: true, command: 'reconfigure show', version: getCliVersion(),
          data: { capabilities },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Capacidades Ativas');
        for (const cap of capabilities) printLine(`  ✅ ${cap}`);
        if (capabilities.length === 0) printLine('  Nenhuma capacidade ativa.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('apply')
    .description('Aplica reconfiguração com validação')
    .argument('<target>', 'Capacidade alvo')
    .argument('<action>', 'Ação: enable, disable, tune')
    .option('--reason <reason>', 'Motivo', 'Reconfiguração manual')
    .option('--health <score>', 'Score de saúde', '85')
    .option('--json', 'Saída em JSON')
    .action((target: string, action: string, opts) => {
      try {
        const change: EvolutionChange = {
          changeId: `c-${Date.now()}`,
          type: action as EvolutionChange['type'],
          target,
          reason: opts.reason,
          from: action === 'enable' ? 'disabled' : 'enabled',
          to: action === 'enable' ? 'enabled' : 'disabled',
        };
        const plan = buildReconfigurationPlan([change]);
        const check = validateEvolution(plan, parseInt(opts.health, 10));

        if (!check.allowed) {
          const envelope = createEnvelope({
            ok: false, command: 'reconfigure apply', version: getCliVersion(),
            data: { check, plan },
          });
          if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
          printLine(`❌ ${check.reason}`);
          return;
        }

        if (action === 'enable') switchboard.enable(target);
        else if (action === 'disable') switchboard.disable(target);

        const result = applyReconfiguration(plan);
        const audit = createEvolutionAudit({
          planId: plan.planId, action, before: String(change.from ?? ''), after: String(change.to ?? ''), success: true,
        });
        auditTrail.push(audit);
        const envelope = createEnvelope({
          ok: true, command: 'reconfigure apply', version: getCliVersion(),
          data: { plan, result, audit },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Reconfiguração');
        printResult('Aplicado', true, `${target} → ${action}`);
        for (const note of result.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na reconfiguração: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida um plano de reconfiguração sem aplicar')
    .argument('<target>', 'Capacidade alvo')
    .argument('<action>', 'Ação: enable, disable, tune, migrate, replace')
    .option('--reason <reason>', 'Motivo', 'Validação')
    .option('--health <score>', 'Score de saúde', '85')
    .option('--json', 'Saída em JSON')
    .action((target: string, action: string, opts) => {
      try {
        const change: EvolutionChange = { changeId: `c-${Date.now()}`, type: action as EvolutionChange['type'], target, reason: opts.reason };
        const plan = buildReconfigurationPlan([change]);
        const check = validateEvolution(plan, parseInt(opts.health, 10));
        const envelope = createEnvelope({
          ok: check.allowed, command: 'reconfigure validate', version: getCliVersion(), data: { plan, check },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Validação de Reconfiguração');
        printResult('Permitido', check.allowed, check.reason);
        printLine(`  Aprovação: ${plan.requiresApproval ? 'Requerida' : 'Automática'}`);
        printLine(`  Rollback: ${plan.rollbackAvailable ? 'Disponível' : 'Indisponível'}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

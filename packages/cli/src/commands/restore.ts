import { Command } from 'commander';
import { buildRestorationPlan, validateRestoration } from '../legacy/restoration-plan';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function restoreCommand(): Command {
  const cmd = new Command('restore')
    .description('Plano de restauração controlada — Fase 30');

  cmd
    .command('plan')
    .description('Cria plano de restauração')
    .argument('<reason>', 'Motivo da restauração')
    .option('--allow', 'Permitir restauração', false)
    .option('--json', 'Saída em JSON')
    .action((reason: string, opts) => {
      try {
        const allowed = opts.allow === true || opts.allow === 'true';
        const plan = buildRestorationPlan(reason, allowed);

        const envelope = createEnvelope({
          ok: true, command: 'restore plan', version: getCliVersion(), data: plan,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Plano de Restauração');
        printLine(`  Motivo: ${plan.reason}`);
        printLine(`  Permitido: ${plan.allowed ? 'sim' : 'não'}`);
        printLine('  Passos:');
        for (const step of plan.steps) {
          printLine(`    ${plan.allowed ? '→' : '🔒'} ${step}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no plano: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Valida um plano de restauração')
    .argument('<reason>', 'Motivo da restauração')
    .option('--allow', 'Permitir restauração', false)
    .option('--json', 'Saída em JSON')
    .action((reason: string, opts) => {
      try {
        const allowed = opts.allow === true || opts.allow === 'true';
        const plan = buildRestorationPlan(reason, allowed);
        const issues = validateRestoration(plan);
        const valid = issues.length === 0;

        const envelope = createEnvelope({
          ok: valid, command: 'restore validate', version: getCliVersion(),
          data: { valid, issues, plan },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Validação de Restauração');
        printResult('Válido', valid);
        for (const issue of issues) printLine(`  ⚠ ${issue}`);
        if (valid) printLine('  ✅ Plano pronto para execução.');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na validação: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('apply')
    .description('Aplica restauração a partir de um plano')
    .argument('<reason>', 'Motivo da restauração')
    .option('--allow', 'Forçar permissão', false)
    .option('--json', 'Saída em JSON')
    .action((reason: string, opts) => {
      try {
        const allowed = opts.allow === true || opts.allow === 'true';
        const plan = buildRestorationPlan(reason, allowed);
        const issues = validateRestoration(plan);

        if (issues.length > 0 || !plan.allowed) {
          const envelope = createEnvelope({
            ok: false, command: 'restore apply', version: getCliVersion(),
            data: { applied: false, issues, plan },
          });

          if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

          printHeader('Restauração Bloqueada');
          printLine('  ❌ Plano não pode ser aplicado:');
          for (const issue of issues) printLine(`    ⚠ ${issue}`);
          return;
        }

        const envelope = createEnvelope({
          ok: true, command: 'restore apply', version: getCliVersion(),
          data: { applied: true, plan },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Restauração Aplicada');
        printLine('  ✅ Sistema restaurado com sucesso.');
        for (const step of plan.steps) printLine(`  → ${step}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na aplicação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

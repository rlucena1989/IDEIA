import { Command } from 'commander';
import { consolidateSystem } from '../consolidation/consolidation-engine';
import { createFinalVerdict } from '../consolidation/final-verdict';
import { resolveAutonomy, AutonomyState } from '../consolidation/autonomy-controller';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

let currentAutonomy: AutonomyState = { enabled: false, level: 'none', reason: 'Initial state.' };

export function autonomyCommand(): Command {
  const cmd = new Command('autonomy')
    .description('Controle de autonomia assistida — Fase 20');

  cmd
    .command('status')
    .description('Exibe status atual da autonomia')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const envelope = createEnvelope({
          ok: currentAutonomy.enabled, command: 'autonomy status', version: getCliVersion(),
          data: currentAutonomy,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status de Autonomia');
        const icon = currentAutonomy.enabled ? '🚀' : '🔒';
        printLine(`  ${icon} Nível: ${currentAutonomy.level}`);
        printLine(`  Motivo: ${currentAutonomy.reason}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('enable')
    .description('Habilita autonomia assistida (se veredito permitir)')
    .option('--force', 'Força ativação mesmo sem veredito', false)
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (opts.force) {
          currentAutonomy = { enabled: true, level: 'assisted', reason: 'Forced by user.' };
        } else {
          const signals = { telemetryCount: 42, alertCount: 0, failureCount: 0, policyViolationCount: 0, activeAgents: 5 };
          const consolidation = consolidateSystem(signals);
          const verdict = createFinalVerdict(consolidation);
          currentAutonomy = resolveAutonomy(verdict);
        }
        const envelope = createEnvelope({
          ok: currentAutonomy.enabled, command: 'autonomy enable', version: getCliVersion(),
          data: currentAutonomy,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Autonomia');
        printResult('Ativada', currentAutonomy.enabled, currentAutonomy.level);
        printLine(`  ${currentAutonomy.reason}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao ativar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('disable')
    .description('Desabilita autonomia')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        currentAutonomy = { enabled: false, level: 'none', reason: 'Disabled by user.' };
        const envelope = createEnvelope({
          ok: false, command: 'autonomy disable', version: getCliVersion(), data: currentAutonomy,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Autonomia');
        printResult('Desativada', false, 'por usuário');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao desativar: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

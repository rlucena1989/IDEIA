import { Command } from 'commander';
import { shutdownSystem, confirmShutdown } from '../legacy/shutdown-coordinator';
import { freezeLegacy } from '../legacy/freeze-manager';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const FROZEN_ITEMS = ['memory', 'explanations', 'predictions', 'knowledge', 'runbooks'];
let legacyState = freezeLegacy(FROZEN_ITEMS);
let shutdownConfirmed = false;

export function shutdownCommand(): Command {
  const cmd = new Command('shutdown')
    .description('Encerramento seguro do sistema — Fase 30');

  cmd
    .command('run')
    .description('Executa desligamento do sistema')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        legacyState = shutdownSystem(legacyState);

        const envelope = createEnvelope({
          ok: true, command: 'shutdown run', version: getCliVersion(), data: legacyState,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Desligamento do Sistema');
        printLine(`  Status: ${legacyState.status}`);
        for (const note of legacyState.notes) printLine(`  ${note}`);
        printLine(`  Use "shutdown confirm" para finalizar.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no desligamento: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('confirm')
    .description('Confirma encerramento e valida integridade')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        shutdownConfirmed = confirmShutdown(legacyState);
        const valid = shutdownConfirmed;

        const envelope = createEnvelope({
          ok: valid, command: 'shutdown confirm', version: getCliVersion(),
          data: { shutdownConfirmed: valid, status: legacyState.status },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Confirmação de Encerramento');
        if (valid) {
          printLine('  ✅ Encerramento confirmado. Sistema em modo legado.');
          printLine('  Para reativar, use: ai-devkit restore plan <reason>');
        } else {
          printLine('  ❌ Encerramento não confirmado. Execute "shutdown run" primeiro.');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na confirmação: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

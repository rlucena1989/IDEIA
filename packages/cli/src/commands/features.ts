import { Command } from 'commander';
import { FeatureFlagManager, FeatureFlag } from '../self-evolution/feature-flag-manager';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const manager = new FeatureFlagManager();
manager.setFlag({ flagId: 'auto-repair', enabled: true, description: 'Auto-repair assistido' });
manager.setFlag({ flagId: 'autonomous-mode', enabled: false, description: 'Modo autônomo contínuo' });
manager.setFlag({ flagId: 'federation-sync', enabled: true, description: 'Sincronização federada' });

export function featuresCommand(): Command {
  const cmd = new Command('features')
    .description('Gerenciamento de feature flags — Fase 23');

  cmd
    .command('list')
    .description('Lista feature flags')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const flags = manager.list();
        const envelope = createEnvelope({
          ok: true, command: 'features list', version: getCliVersion(),
          data: { count: flags.length, flags },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Feature Flags');
        for (const f of flags) {
          printLine(`  ${f.enabled ? '✅' : '❌'} ${f.flagId}: ${f.description}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('enable')
    .description('Ativa uma feature flag')
    .argument('<flagId>', 'ID da flag')
    .option('--json', 'Saída em JSON')
    .action((flagId: string, opts) => {
      try {
        const existing = manager.getFlag(flagId);
        if (!existing) { console.error(`Flag não encontrada: ${flagId}`); process.exit(1); }
        manager.setFlag({ ...existing, enabled: true });
        const envelope = createEnvelope({
          ok: true, command: 'features enable', version: getCliVersion(),
          data: { flagId, enabled: true },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Flag ativada', true, flagId);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao ativar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('disable')
    .description('Desativa uma feature flag')
    .argument('<flagId>', 'ID da flag')
    .option('--json', 'Saída em JSON')
    .action((flagId: string, opts) => {
      try {
        const existing = manager.getFlag(flagId);
        if (!existing) { console.error(`Flag não encontrada: ${flagId}`); process.exit(1); }
        manager.setFlag({ ...existing, enabled: false });
        const envelope = createEnvelope({
          ok: false, command: 'features disable', version: getCliVersion(),
          data: { flagId, enabled: false },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Flag desativada', false, flagId);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao desativar: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

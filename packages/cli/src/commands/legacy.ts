import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { freezeLegacy } from '../legacy/freeze-manager';
import { PreservationVault } from '../legacy/preservation-vault';
import { buildLegacyReport } from '../legacy/legacy-report';
import { DEFAULT_LEGACY_POLICY } from '../legacy/legacy-policy';
import { runFinalAudit } from '../legacy/final-audit';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine } from '../utils/output';
import { getCliVersion } from '../utils/version';

const vault = new PreservationVault();
let currentState: ReturnType<typeof freezeLegacy> | null = null;

export function legacyCommand(): Command {
  const cmd = new Command('legacy')
    .description('Gestão de modo legado e encerramento — Fase 30');

  cmd
    .command('freeze')
    .description('Congela capacidades principais para modo legado')
    .option('--items <list>', 'Itens a preservar (separados por vírgula)', 'memory,explanations,predictions,knowledge')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const items = opts.items.split(',').map((s: string) => s.trim());
        currentState = freezeLegacy(items);
        items.forEach((i: string) => vault.store(i));

        const envelope = createEnvelope({
          ok: true, command: 'legacy freeze', version: getCliVersion(), data: currentState,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Congelamento de Capacidades');
        printLine(`  Status: ${currentState.status}`);
        printLine(`  Itens preservados: ${currentState.preservedItems.length}`);
        for (const item of currentState.preservedItems) {
          printLine(`    → ${item}`);
        }
        for (const note of currentState.notes) printLine(`  ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no congelamento: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Exibe status do modo legado')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const data = {
          state: currentState,
          preservedCount: vault.count(),
          policy: DEFAULT_LEGACY_POLICY,
        };

        const envelope = createEnvelope({
          ok: true, command: 'legacy status', version: getCliVersion(), data,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status do Legado');
        printLine(`  Estado: ${currentState?.status ?? 'não iniciado'}`);
        printLine(`  Itens preservados: ${vault.count()}`);
        printLine(`  Mudanças estruturais: ${DEFAULT_LEGACY_POLICY.allowStructuralChanges ? 'permitidas' : 'bloqueadas'}`);
        printLine(`  Correções críticas: ${DEFAULT_LEGACY_POLICY.allowCriticalFixes ? 'permitidas' : 'bloqueadas'}`);
        printLine(`  Governança requerida: ${DEFAULT_LEGACY_POLICY.requireGovernanceApproval ? 'sim' : 'não'}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Gera relatório final do legado')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const audit = runFinalAudit(vault.list());
        const report = buildLegacyReport({
          state: currentState,
          archives: [],
          audit,
          plan: null,
        });

        const envelope = createEnvelope({
          ok: true, command: 'legacy report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório do Legado');
        for (const note of report.notes) printLine(`  ${note}`);
        for (const entry of report.audit) {
          const icon = entry.status === 'ok' ? '✅' : entry.status === 'warning' ? '⚠️' : '❌';
          printLine(`  ${icon} [${entry.area}] ${entry.detail}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { closeCycle } from '../consolidation/closure-manager';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

export function closeCycleCommand(): Command {
  const cmd = new Command('close-cycle')
    .description('Fechamento de ciclo operacional — Fase 20');

  cmd
    .command('run')
    .description('Fecha o ciclo atual com itens concluídos e pendentes')
    .option('--completed <items>', 'Itens concluídos (JSON array)', '["Fase 20 concluída"]')
    .option('--pending <items>', 'Itens pendentes (JSON array)', '[]')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const completed: string[] = JSON.parse(opts.completed);
        const pending: string[] = JSON.parse(opts.pending);
        const closure = closeCycle(completed, pending);
        const envelope = createEnvelope({
          ok: pending.length === 0,
          command: 'close-cycle run', version: getCliVersion(),
          data: closure,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Fechamento de Ciclo');
        printLine(`  ID: ${closure.closureId.substring(0, 12)}...`);
        printLine(`  Concluídos: ${closure.completedItems.length}`);
        for (const item of closure.completedItems) printLine(`  ✅ ${item}`);
        printLine(`  Pendentes: ${closure.pendingItems.length}`);
        for (const item of closure.pendingItems) printLine(`  📋 ${item}`);
        for (const note of closure.notes) printLine(`  → ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no fechamento: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório de fechamento do ciclo')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const closure = closeCycle(
          ['Estado consolidado', 'Geração implementada', 'Hardening aplicado', 'Telemetria ativa', 'Resiliência operacional'],
          ['Revisar política de agentes']
        );
        const envelope = createEnvelope({
          ok: true, command: 'close-cycle report', version: getCliVersion(), data: closure,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Fechamento');
        printLine(`  Concluídos: ${closure.completedItems.length}`);
        printLine(`  Pendentes: ${closure.pendingItems.length}`);
        for (const note of closure.notes) printLine(`  ${note}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

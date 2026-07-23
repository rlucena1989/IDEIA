import { Command } from 'commander';
import * as crypto from 'node:crypto';
import { TelemetryCollector } from '../telemetry/telemetry-collector';
import { createTelemetryEvent } from '../telemetry/telemetry-types';
import { aggregateTelemetry } from '../telemetry/telemetry-aggregator';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const collector = new TelemetryCollector();

export function metricsCommand(): Command {
  const cmd = new Command('metrics')
    .description('Métricas operacionais — Fase 14');

  cmd
    .command('show')
    .description('Exibe métricas atuais')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) {
          const rid = crypto.randomUUID();
          collector.record(createTelemetryEvent({ name: 'command.test', severity: 'info', source: 'cli', requestId: rid }));
          collector.record(createTelemetryEvent({ name: 'command.test', severity: 'info', source: 'cli', requestId: rid }));
          collector.record(createTelemetryEvent({ name: 'sync.failed', severity: 'error', source: 'sync', requestId: rid }));
        }
        const metrics = aggregateTelemetry(collector.list());
        const envelope = createEnvelope({
          ok: true, command: 'metrics show', version: getCliVersion(), data: { metrics },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Métricas');
        for (const m of metrics) {
          printLine(`  ${m.name}: ${m.value} ${m.unit}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao exibir métricas: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('snapshot')
    .description('Tira um snapshot das métricas atuais')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const metrics = aggregateTelemetry(collector.list());
        const snapshot = {
          takenAt: new Date().toISOString(),
          metrics,
          summary: metrics.map(m => `${m.name}=${m.value}`).join(', '),
        };
        const envelope = createEnvelope({
          ok: true, command: 'metrics snapshot', version: getCliVersion(), data: snapshot,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Snapshot de Métricas');
        printLine(`  Tomado em: ${snapshot.takenAt}`);
        for (const m of metrics) printLine(`  ${m.name}: ${m.value} ${m.unit}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no snapshot: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

import { Command } from 'commander';
import * as crypto from 'node:crypto';
import { TelemetryCollector } from '../telemetry/telemetry-collector';
import { createTelemetryEvent } from '../telemetry/telemetry-types';
import { aggregateTelemetry } from '../telemetry/telemetry-aggregator';
import { detectTelemetryAlerts } from '../telemetry/telemetry-alerts';
import { TelemetryTracer } from '../telemetry/telemetry-tracer';
import { buildTelemetryReport } from '../telemetry/telemetry-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const collector = new TelemetryCollector();
const tracer = new TelemetryTracer();

function seedEvents(): void {
  collector.clear();
  const rid = crypto.randomUUID();
  collector.record(createTelemetryEvent({ name: 'command.status.started', severity: 'info', source: 'cli', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'command.status.completed', severity: 'info', source: 'cli', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'generation.completed', severity: 'info', source: 'generation', requestId: rid, payload: { artifacts: 3 } }));
  collector.record(createTelemetryEvent({ name: 'sync.failed', severity: 'error', source: 'sync', requestId: rid, payload: { target: 'remote' } }));
  collector.record(createTelemetryEvent({ name: 'validation.warning', severity: 'warning', source: 'validation', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'policy.blocked', severity: 'warning', source: 'policy', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'critical.failure', severity: 'critical', source: 'system', requestId: rid }));
}

export function telemetryCommand(): Command {
  const cmd = new Command('telemetry')
    .description('Observabilidade e telemetria operacional — Fase 14');

  cmd
    .command('record')
    .description('Registra um evento de telemetria')
    .argument('<name>', 'Nome do evento')
    .option('--severity <severity>', 'Severidade', 'info')
    .option('--source <source>', 'Fonte', 'cli')
    .option('--json', 'Saída em JSON')
    .action((name: string, opts) => {
      try {
        const event = createTelemetryEvent({
          name, severity: opts.severity, source: opts.source,
          requestId: crypto.randomUUID(), tags: ['manual'],
        });
        collector.record(event);
        const envelope = createEnvelope({
          ok: true, command: 'telemetry record', version: getCliVersion(), data: event,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Evento registrado', true, `${event.name} (${event.severity})`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao registrar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('Lista eventos de telemetria')
    .option('--severity <severity>', 'Filtrar por severidade')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = opts.severity ? collector.filterBySeverity(opts.severity) : collector.list();
        const envelope = createEnvelope({
          ok: true, command: 'telemetry list', version: getCliVersion(),
          data: { count: events.length, events },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Eventos de Telemetria');
        printLine(`  Total: ${events.length}`);
        for (const e of events.slice(0, 10)) {
          const icon = e.severity === 'critical' ? '❌' : e.severity === 'error' ? '🔥' : e.severity === 'warning' ? '⚠️' : '✅';
          printLine(`  ${icon} [${e.severity}] ${e.name} — ${e.source}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('aggregate')
    .description('Agrega métricas a partir de eventos')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const metrics = aggregateTelemetry(collector.list());
        const envelope = createEnvelope({
          ok: true, command: 'telemetry aggregate', version: getCliVersion(), data: { metrics },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Métricas Agregadas');
        for (const m of metrics) {
          printLine(`  📊 ${m.name}: ${m.value} ${m.unit}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao agregar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo de observabilidade')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedEvents();
        const events = collector.list();
        const metrics = aggregateTelemetry(events);
        const alerts = detectTelemetryAlerts(events);
        const spans = tracer.listSpans();
        const report = buildTelemetryReport({ events, metrics, alerts, spans });
        const envelope = createEnvelope({
          ok: true, command: 'telemetry report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Observabilidade');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
        for (const alert of alerts) {
          const icon = alert.severity === 'critical' ? '❌' : '⚠️';
          printLine(`  ${icon} ${alert.name} — ${alert.reason}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

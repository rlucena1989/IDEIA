import { Command } from 'commander';
import * as crypto from 'node:crypto';
import { TelemetryCollector } from '../telemetry/telemetry-collector';
import { createTelemetryEvent } from '../telemetry/telemetry-types';
import { detectTelemetryAlerts, acknowledgeAlert } from '../telemetry/telemetry-alerts';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const collector = new TelemetryCollector();

function seedAlertEvents(): void {
  const rid = crypto.randomUUID();
  collector.clear();
  collector.record(createTelemetryEvent({ name: 'error.1', severity: 'error', source: 'test', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'error.2', severity: 'error', source: 'test', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'error.3', severity: 'error', source: 'test', requestId: rid }));
  collector.record(createTelemetryEvent({ name: 'critical.1', severity: 'critical', source: 'test', requestId: rid }));
}

export function alertsCommand(): Command {
  const cmd = new Command('alerts')
    .description('Alertas operacionais — Fase 14');

  cmd
    .command('list')
    .description('Lista alertas ativos baseados em eventos')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedAlertEvents();
        const alerts = detectTelemetryAlerts(collector.list());
        const envelope = createEnvelope({
          ok: true, command: 'alerts list', version: getCliVersion(), data: { alerts },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Alertas');
        if (alerts.length === 0) { printLine('  Nenhum alerta ativo.'); return; }
        for (const alert of alerts) {
          const icon = alert.severity === 'critical' ? '❌' : '⚠️';
          printLine(`  ${icon} [${alert.severity}] ${alert.name}`);
          printLine(`     ${alert.reason}`);
          printLine(`     Acknowledgement: ${alert.acknowledged ? '✅ Sim' : '❌ Não'}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar alertas: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('detect')
    .description('Detecta alertas a partir dos eventos atuais')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedAlertEvents();
        const alerts = detectTelemetryAlerts(collector.list());
        const envelope = createEnvelope({
          ok: alerts.length > 0, command: 'alerts detect', version: getCliVersion(), data: { alerts },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Detecção de Alertas');
        printLine(`  Alertas detectados: ${alerts.length}`);
        for (const alert of alerts) {
          printLine(`  ${alert.severity === 'critical' ? '❌' : '⚠️'} ${alert.name}: ${alert.reason}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro na detecção: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('acknowledge')
    .description('Reconhece todos os alertas ativos')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula eventos de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedAlertEvents();
        const alerts = detectTelemetryAlerts(collector.list()).map(acknowledgeAlert);
        const envelope = createEnvelope({
          ok: true, command: 'alerts acknowledge', version: getCliVersion(), data: { acknowledged: alerts.length },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Acknowledgement');
        printLine(`  ${alerts.length} alerta(s) reconhecido(s).`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no acknowledge: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

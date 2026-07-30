import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { SafetyArchitecture, SafetyCircuit, EmergencyStop, CircuitBreakerManager } from '@ideia/safety-circuit';
import { SafetyReportGenerator } from '@ideia/safety-circuit';
import { createBus, EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { printHeader, printLine, printResult } from '../utils/output';
const logger = createLogger('safety');

export function safetyCommand(): Command {
  const cmd = new Command('safety')
    .description('Safety architecture controls — 7-layer safety, circuit breakers, reports');

  let _bus: EventBus;
  async function getArchitecture(): Promise<SafetyArchitecture> {
    if (!_bus) _bus = await createBus() as unknown as EventBus;
    const audit = new AuditTrail('.ai/audit/cli-trail.jsonl');
    const circuitBreakerManager = new CircuitBreakerManager(_bus, audit);
    const emergencyStop = new EmergencyStop(_bus, audit);
    const safetyCircuit = new SafetyCircuit(_bus, audit);
    return new SafetyArchitecture(undefined, _bus, circuitBreakerManager, emergencyStop, safetyCircuit);
  }

  cmd
    .command('status')
    .description('Show safety architecture status across all 7 layers')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const arch = await getArchitecture();
        await arch.initialize();
        const statuses = arch.getAllStatuses();
        if (opts.json) { printLine(JSON.stringify({ layers: statuses }, null, 2)); return; }
        printHeader('Safety Architecture — 7 Layers');
        for (const layer of statuses) {
          const icon = layer.status === 'healthy' ? '✓' : layer.status === 'degraded' ? '⚠' : '✗';
          printLine(`  ${icon} ${layer.layer.padEnd(25)} ${layer.status.padEnd(10)} ${layer.enabled ? 'enabled' : 'disabled'}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Safety status failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('check')
    .description('Check a specific safety layer')
    .argument('<layer>', 'Layer name: input-validation, policy-engine, sandbox, circuit-breaker, output-validation, audit-trail, emergency-stop')
    .option('--json', 'Output as JSON')
    .action(async (layer, opts) => {
      try {
        const arch = await getArchitecture();
        const status = await arch.checkLayer(layer);
        if (opts.json) { printLine(JSON.stringify(status, null, 2)); return; }
        printHeader(`Safety Layer: ${layer}`);
        printLine(`  Status:  ${status.status}`);
        printLine(`  Enabled: ${status.enabled}`);
        printLine(`  Metrics: ${JSON.stringify(status.metrics)}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Layer check failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Generate full safety report')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const arch = await getArchitecture();
        await arch.initialize();
        const layerStatuses = arch.getAllStatuses();
        const cbManager = new CircuitBreakerManager(_bus);
        const reportGen = new SafetyReportGenerator();
        const report = reportGen.generateReport(layerStatuses, cbManager.getStates());
        if (opts.json) { printLine(JSON.stringify(report, null, 2)); return; }
        printLine(reportGen.formatAsText(report));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Safety report failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('breakers')
    .description('Show circuit breaker states')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const audit = new AuditTrail('.ai/audit/cli-trail.jsonl');
        const cbManager = new CircuitBreakerManager(_bus, audit);
        const states = cbManager.getStates();
        if (opts.json) { printLine(JSON.stringify({ breakers: states }, null, 2)); return; }
        printHeader('Circuit Breakers');
        for (const s of states) {
          const icon = s.tripped ? '⚠' : '✓';
          printLine(`  ${icon} ${s.type.padEnd(20)} ${s.tripped ? 'TRIPPED' : 'OK'}  (${s.currentValue}/${s.threshold})`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Breakers check failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('enable')
    .description('Enable a safety layer')
    .argument('<layer>', 'Layer name')
    .action(async (layer) => {
      try {
        const arch = await getArchitecture();
        arch.enableLayer(layer);
        printHeader('Safety Layer');
        printResult(`Layer ${layer} enabled`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Enable layer failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('disable')
    .description('Disable a safety layer')
    .argument('<layer>', 'Layer name')
    .action(async (layer) => {
      try {
        const arch = await getArchitecture();
        arch.disableLayer(layer);
        printHeader('Safety Layer');
        printResult(`Layer ${layer} disabled`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Disable layer failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

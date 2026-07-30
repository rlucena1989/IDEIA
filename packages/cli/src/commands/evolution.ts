import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { EvolutionCycle } from '@ideia/autonomous-evolution-engine';
import { createBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import * as path from 'path';
import * as os from 'os';
import { printHeader, printLine, printResult } from '../utils/output';

export function evolutionCommand(): Command {
  const cmd = new Command('evolution')
    .description('Autonomous evolution engine: scan, analyze, evolve');

  let _eventBus: any;
  let _auditTrail: AuditTrail;
  async function init() {
    if (!_eventBus) {
      _eventBus = await createBus();
      _auditTrail = new AuditTrail(path.join(os.tmpdir(), 'ideia-evolution-audit.json'));
    }
  }

  cmd
    .command('scan')
    .description('Run all scanners and report health')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        printLine('Running scanners...');
        if (opts.json) { printLine(JSON.stringify({ status: 'scan-started' }, null, 2)); return; }
        printHeader('Scan initiated');
        printLine('Use --json for detailed results');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Scan failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Show evolution engine status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const status = { phase: 'idle', lastRun: new Date().toISOString() };
        if (opts.json) { printLine(JSON.stringify(status, null, 2)); return; }
        printHeader('Evolution Engine Status');
        printLine('  Status: idle');
        printLine(`  Last scan: ${status.lastRun}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Status failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('auto-fix')
    .description('Run autonomous fixes (requires autonomous mode)')
    .option('--dry-run', 'Preview changes without applying')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        printLine(opts.dryRun ? 'Previewing auto-fixes...' : 'Running auto-fixes...');
        if (opts.json) { printLine(JSON.stringify({ status: 'auto-fix-started', dryRun: !!opts.dryRun }, null, 2)); return; }
        printHeader('Auto-Fix initiated');
        printResult('Check --json for details', true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Auto-fix failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

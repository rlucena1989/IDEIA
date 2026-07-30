import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createBus, IEventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { ContinuityEngine } from '@ideia/continuity-engine';
import { printHeader, printLine, printResult } from '../utils/output';
const logger = createLogger('continuity');

export function continuityCommand(): Command {
  const cmd = new Command('continuity')
    .description('Decision Continuity Engine — manages decision timeouts, escalation, and auto-continue');

  let _bus: IEventBus;
  async function getEngine(): Promise<ContinuityEngine> {
    if (!_bus) _bus = await createBus();
    const audit = new AuditTrail('.ai/audit/cli-trail.jsonl');
    return new ContinuityEngine(_bus, audit);
  }

  cmd
    .command('status')
    .description('Show continuity engine status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const engine = await getEngine();
        const status = engine.getContinuityStatus();
        if (opts.json) { printLine(JSON.stringify(status, null, 2)); return; }
        printHeader('Continuity Engine Status');
        printLine(`  Pending Decisions:   ${status.pendingDecisions}`);
        printLine(`  Resolved Decisions:  ${status.resolvedDecisions}`);
        printLine(`  Escalated Decisions: ${status.escalatedDecisions}`);
        printLine(`  Auto-Decided:        ${status.autoDecided}`);
        printLine(`  Timeouts:            ${status.timeoutCount}`);
        printLine(`  Oldest Pending Age:  ${(status.oldestPendingAge / 1000).toFixed(0)}s`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Continuity status failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('register')
    .description('Register a decision for continuity tracking')
    .argument('<description>', 'Decision description')
    .option('--priority <priority>', 'Priority (low/medium/high/critical)', 'medium')
    .option('--profile-match <match>', 'Profile match percentage (0-100)', '50')
    .option('--timeout <ms>', 'Timeout in milliseconds', '300000')
    .option('--json', 'Output as JSON')
    .action(async (description, opts) => {
      try {
        const engine = await getEngine();
        const id = engine.registerDecision({
          description,
          priority: opts.priority,
          profileMatch: parseInt(opts.profileMatch, 10),
          timeoutMs: parseInt(opts.timeout, 10),
        });
        if (opts.json) { printLine(JSON.stringify({ decisionId: id }, null, 2)); return; }
        printHeader('Continuity Decision');
        printResult('Decision registered', true);
        printLine(`  ID: ${id}`);
        printLine(`  Description: ${description}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Register decision failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('resolve')
    .description('Resolve a pending decision')
    .argument('<id>', 'Decision ID')
    .argument('<action>', 'Resolution action')
    .option('--json', 'Output as JSON')
    .action(async (id, action, opts) => {
      try {
        const engine = await getEngine();
        const ok = engine.resolveDecision(id, { action, resolvedBy: 'user' });
        if (opts.json) { printLine(JSON.stringify({ resolved: ok }, null, 2)); return; }
        printHeader('Continuity Resolve');
        printResult(ok ? 'Decision resolved' : 'Decision not found or already resolved', ok);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Resolve decision failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('process')
    .description('Process decision timeouts')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const engine = await getEngine();
        const events = engine.processTimeout();
        if (opts.json) { printLine(JSON.stringify({ processed: events.length, events }, null, 2)); return; }
        printHeader('Continuity Process');
        printResult(`${events.length} timeouts processed`, true);
        for (const ev of events) {
          printLine(`  ${ev.phase}: ${ev.description} (escalation: ${ev.escalationLevel})`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Process timeouts failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

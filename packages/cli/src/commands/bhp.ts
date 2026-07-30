import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createBus, IEventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { BHP } from '@ideia/bhp';
import { printHeader, printLine, printResult } from '../utils/output';
const logger = createLogger('bhp');

export function bhpCommand(): Command {
  const cmd = new Command('bhp')
    .description('Bidirectional Help Protocol — communication between IDEIA and AI agents');

  let _eventBus: IEventBus;
  let _auditTrail: AuditTrail;
  async function getBHP(): Promise<BHP> {
    if (!_eventBus) _eventBus = await createBus();
    if (!_auditTrail) _auditTrail = new AuditTrail('.ai/audit/cli-trail.jsonl');
    return new BHP(_eventBus, undefined, _auditTrail);
  }

  cmd
    .command('status')
    .description('Show BHP connection status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const bhp = await getBHP();
        const history = bhp.getHistory();
        if (opts.json) { printLine(JSON.stringify({ connected: true, messageCount: history.length }, null, 2)); return; }
        printHeader('BHP Status');
        printResult('BHP connected', true);
        printLine(`  Messages in history: ${history.length}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`BHP status failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('help')
    .description('Send HELP! message from IDEIA to AI agent')
    .argument('<intent>', 'Help intent description')
    .option('--target <target>', 'Target platform', 'ia')
    .option('--json', 'Output as JSON')
    .action(async (intent, opts) => {
      try {
        const bhp = await getBHP();
        const msgId = bhp.sendHelp('ideia', opts.target, {
          source: 'ideia',
          target: opts.target,
          intent,
          data: {},
          timestamp: new Date().toISOString(),
        });
        if (opts.json) { printLine(JSON.stringify({ messageId: msgId, intent }, null, 2)); return; }
        printHeader('BHP Help');
        printResult('HELP! sent', true);
        printLine(`  Message ID: ${msgId}`);
        printLine(`  Intent: ${intent}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`BHP help failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('history')
    .description('Show BHP message history')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const bhp = await getBHP();
        const history = bhp.getHistory();
        if (opts.json) { printLine(JSON.stringify({ messages: history }, null, 2)); return; }
        printHeader('BHP History');
        for (const msg of history.slice(-20)) {
          printLine(`  [${msg.type}] ${msg.source} → ${msg.target}: ${JSON.stringify(msg.payload).slice(0, 100)}`);
        }
        printLine(`Total: ${history.length} messages`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`BHP history failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

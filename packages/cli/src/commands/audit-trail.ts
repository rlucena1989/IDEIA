import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { AuditTrail } from '@ideia/audit-trail';

const logger = createLogger('cli-audit-trail');

export function auditTrailCommand(auditTrail: AuditTrail): Command {
  const cmd = new Command('audit-trail')
    .description('Query, verify and inspect the CLI audit trail');

  cmd.command('query')
    .description('Query audit trail events')
    .option('--event-type <type>', 'Filter by event type')
    .option('--actor <actor>', 'Filter by actor (user|system|ai)')
    .option('--target <target>', 'Filter by target')
    .option('--limit <n>', 'Limit results', '50')
    .option('--json', 'JSON output')
    .action((opts) => {
      const filter: Record<string, unknown> = {};
      if (opts.eventType) filter.eventType = opts.eventType;
      if (opts.actor) filter.actor = opts.actor;
      if (opts.target) filter.target = opts.target;
      const events = auditTrail.load();
      const filtered = Object.keys(filter).length > 0
        ? events.filter(e => {
            for (const [k, v] of Object.entries(filter)) {
              if ((e as unknown as Record<string, unknown>)[k] !== v) return false;
            }
            return true;
          })
        : events;
      const limit = parseInt(opts.limit, 10) || 50;
      const sliced = filtered.slice(-limit);
      if (opts.json) {
        logger.info(JSON.stringify({ total: filtered.length, events: sliced }, null, 2));
        return;
      }
      logger.info('\nAudit Trail — ${filtered.length} events (showing last ${sliced.length})\n');
      for (const e of sliced) {
        logger.info('  [${e.timestamp.slice(0, 19)}] ${e.eventType} | ${e.actor} → ${e.target} | ${e.result}');
      }
      logger.info('');
    });

  cmd.command('verify')
    .description('Verify SHA-256 chain integrity')
    .option('--json', 'JSON output')
    .action((opts) => {
      const result = auditTrail.verifyChain();
      if (opts.json) {
        logger.info(JSON.stringify(result, null, 2));
        return;
      }
      if (result.valid) {
        logger.info('\n✅ Chain integrity verified — ${result.totalEvents} events, tip: ${result.currentTipHash?.slice(0, 16)}...\n');
      } else {
        logger.info('\n❌ Chain BROKEN at event ${result.breakAtIndex}');
        logger.info('   Reason: ${result.breakReason}\n');
      }
    });

  cmd.command('status')
    .description('Audit trail statistics')
    .option('--json', 'JSON output')
    .action((opts) => {
      const events = auditTrail.load();
      const byType: Record<string, number> = {};
      const byResult: Record<string, number> = {};
      for (const e of events) {
        byType[e.eventType] = (byType[e.eventType] || 0) + 1;
        byResult[e.result] = (byResult[e.result] || 0) + 1;
      }
      const chain = auditTrail.verifyChain();
      const stats = {
        totalEvents: events.length,
        chainValid: chain.valid,
        chainTip: chain.currentTipHash,
        byEventType: byType,
        byResult: byResult,
        lastEvent: events.length > 0 ? events[events.length - 1]?.timestamp ?? null : null,
      };
      if (opts.json) {
        logger.info(JSON.stringify(stats, null, 2));
        return;
      }
      logger.info('\nAudit Trail Status\n');
      logger.info('  Events:     ${stats.totalEvents}');
      logger.info('  Chain:      ${stats.chainValid ? \'✅ Valid\' : \'❌ Broken\'}');
      logger.info('  Tip hash:   ${stats.chainTip?.slice(0, 16) || \'N/A\'}...');
      logger.info('  Last event: ${stats.lastEvent || \'N/A\'}');
      if (Object.keys(byType).length > 0) {
        logger.info('\n  By type:');
        for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
          logger.info('    ${t}: ${c}');
        }
      }
      if (Object.keys(byResult).length > 0) {
        logger.info('\n  By result:');
        for (const [r, c] of Object.entries(byResult)) {
          logger.info('    ${r}: ${c}');
        }
      }
      logger.info('');
    });

  return cmd;
}

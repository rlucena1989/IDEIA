import { Command } from 'commander';
import { AuditTrail } from '@ideia/audit-trail';

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
              if ((e as Record<string, unknown>)[k] !== v) return false;
            }
            return true;
          })
        : events;
      const limit = parseInt(opts.limit, 10) || 50;
      const sliced = filtered.slice(-limit);
      if (opts.json) {
        console.log(JSON.stringify({ total: filtered.length, events: sliced }, null, 2));
        return;
      }
      console.log(`\nAudit Trail — ${filtered.length} events (showing last ${sliced.length})\n`);
      for (const e of sliced) {
        console.log(`  [${e.timestamp.slice(0, 19)}] ${e.eventType} | ${e.actor} → ${e.target} | ${e.result}`);
      }
      console.log();
    });

  cmd.command('verify')
    .description('Verify SHA-256 chain integrity')
    .option('--json', 'JSON output')
    .action((opts) => {
      const result = auditTrail.verifyChain();
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      if (result.valid) {
        console.log(`\n✅ Chain integrity verified — ${result.totalEvents} events, tip: ${result.currentTipHash?.slice(0, 16)}...\n`);
      } else {
        console.log(`\n❌ Chain BROKEN at event ${result.breakAtIndex}`);
        console.log(`   Reason: ${result.breakReason}\n`);
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
        lastEvent: events.length > 0 ? events[events.length - 1]!.timestamp : null,
      };
      if (opts.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }
      console.log(`\nAudit Trail Status\n`);
      console.log(`  Events:     ${stats.totalEvents}`);
      console.log(`  Chain:      ${stats.chainValid ? '✅ Valid' : '❌ Broken'}`);
      console.log(`  Tip hash:   ${stats.chainTip?.slice(0, 16) || 'N/A'}...`);
      console.log(`  Last event: ${stats.lastEvent || 'N/A'}`);
      if (Object.keys(byType).length > 0) {
        console.log(`\n  By type:`);
        for (const [t, c] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
          console.log(`    ${t}: ${c}`);
        }
      }
      if (Object.keys(byResult).length > 0) {
        console.log(`\n  By result:`);
        for (const [r, c] of Object.entries(byResult)) {
          console.log(`    ${r}: ${c}`);
        }
      }
      console.log();
    });

  return cmd;
}

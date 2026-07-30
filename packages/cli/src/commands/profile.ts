import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createBus, IEventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { UsabilityProfile } from '@ideia/usability-profile';
import { printHeader, printLine, printResult } from '../utils/output';
const logger = createLogger('profile');

export function profileCommand(): Command {
  const cmd = new Command('profile')
    .description('Usability Profile Engine — tracks user behavior and adapts UI');

  let _bus: IEventBus;
  async function getEngine(): Promise<any> {
    if (!_bus) _bus = await createBus();
    const audit = new AuditTrail('.ai/audit/cli-trail.jsonl');
    return new UsabilityProfile('cli-user', _bus, audit);
  }

  cmd
    .command('status')
    .description('Show usability profile status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const engine = await getEngine();
        const state = engine.getState();
        if (opts.json) { printLine(JSON.stringify(state, null, 2)); return; }
        printHeader('Usability Profile');
        printLine(`  Total Events:        ${state.totalEvents}`);
        printLine(`  Behavior Patterns:   ${state.behaviorPatterns.length}`);
        printLine(`  Adaptations:         ${state.adaptations.length}`);
        printLine(`  Learned Shortcuts:   ${state.learnedShortcuts.length}`);
        printLine(`  Frequent Actions:    ${state.frequentActions.length}`);
        printLine(`  Adaptation Score:    ${state.adaptationScore.toFixed(2)}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Profile status failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('track')
    .description('Track a usability event')
    .argument('<type>', 'Event type: command, widget, shortcut, navigation, error, preference')
    .argument('<action>', 'Action name')
    .option('--context <context>', 'Context of the action')
    .option('--json', 'Output as JSON')
    .action(async (type, action, opts) => {
      try {
        const engine = await getEngine();
        engine.trackEvent({
          type,
          action,
          context: opts.context,
          timestamp: new Date().toISOString(),
        });
        if (opts.json) { printLine(JSON.stringify({ tracked: true, type, action }, null, 2)); return; }
        printHeader('Profile Track');
        printResult(`Event tracked: ${type}:${action}`, true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Track event failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('suggestions')
    .description('Show pending adaptation suggestions')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const engine = await getEngine();
        const suggestions = engine.getSuggestions();
        if (opts.json) { printLine(JSON.stringify({ suggestions }, null, 2)); return; }
        printHeader('Profile Suggestions');
        if (suggestions.length === 0) {
          printLine('  No pending suggestions');
          return;
        }
        for (const s of suggestions) {
          printLine(`  [${s.id.slice(0, 8)}] ${s.type}:${s.target} (confidence: ${(s.confidence * 100).toFixed(0)}%)`);
          printLine(`         Reason: ${s.reason}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Suggestions failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('apply')
    .description('Apply an adaptation')
    .argument('<id>', 'Adaptation ID')
    .option('--json', 'Output as JSON')
    .action(async (id, opts) => {
      try {
        const engine = await getEngine();
        const ok = engine.applyAdaptation(id);
        if (opts.json) { printLine(JSON.stringify({ applied: ok }, null, 2)); return; }
        printHeader('Profile Apply');
        printResult(ok ? 'Adaptation applied' : 'Adaptation not found or already applied', ok);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Apply adaptation failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}




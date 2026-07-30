import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { UserInteractionTracker, AdaptiveSuggestions, AutoAdaptation, Profiles, createProfiles } from '@ideia/profiles';
import { createBus, EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import path from 'node:path';
import os from 'node:os';
import { success, failure, CliCommandResult } from '../types/cli-result';
import { printLine, printHeader, printResult } from '../utils/output';
const logger = createLogger('profile-adaptive');

const KNOWN_TYPES = [
  'ai_action_approved', 'ai_action_rejected',
  'high_risk_action_accepted', 'high_risk_action_rejected',
  'scanner_manual_run', 'notification_dismissed', 'notification_received',
  'feature_used', 'command_run', 'command.executed', 'config.changed',
  'approval.granted', 'approval.denied', 'profile.applied',
  'suggestion.accepted', 'suggestion.dismissed',
  'auto.fix.applied', 'auto.fix.rejected',
];

let _trackerInstance: { tracker: UserInteractionTracker; profiles: Profiles; auto: AutoAdaptation; auditTrail: AuditTrail } | null = null;

async function getTracker(): Promise<{ tracker: UserInteractionTracker; profiles: Profiles; auto: AutoAdaptation; auditTrail: AuditTrail }> {
  if (!_trackerInstance) {
    const eventBus = await createBus() as unknown as EventBus;
    const auditTrail = new AuditTrail(path.join(os.tmpdir(), 'ideia-profile-adaptive-audit.json'));
    const profiles = createProfiles(eventBus, auditTrail);
    const tracker = new UserInteractionTracker();
    const profileId = 'solo-dev';
    const autonomyLevel = 'assisted';
    const auto = new AutoAdaptation(profileId, autonomyLevel, tracker, profiles);
    _trackerInstance = { tracker, profiles, auto, auditTrail };
  }
  return _trackerInstance;
}

export function profileAdaptiveCommand(): Command {
  const cmd = new Command('profile-adaptive')
    .description('Perfil adaptativo — observação, sugestões e adaptação automática (S25)');

  cmd
    .command('observe')
    .argument('<type>', 'Interaction type')
    .argument('[source]', 'Source of interaction', 'cli')
    .option('--json', 'Output as JSON')
    .description('Record an interaction of given type')
    .action(async (type: string, source: string, _opts: { json?: boolean }): Promise<void> => {
      try {
        if (!KNOWN_TYPES.includes(type)) {
          printLine(`Unknown interaction type "${type}". Known: ${KNOWN_TYPES.join(', ')}`);
          return;
        }
        const { tracker, auditTrail } = await getTracker();
        const interaction = tracker.record(type, source);
        auditTrail.append({
          actor: 'user',
          eventType: 'profile-adaptive:observe',
          target: `interaction:${interaction.id}`,
          decision: 'allow' as any,
          result: 'success',
          metadata: { type, source, interactionId: interaction.id },
        });
        const phase = tracker.getPhase();
        const count = tracker.getCount();
        printLine(`Interaction "${type}" recorded. Phase: ${phase} | Total: ${count}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printLine(`Observe failed: ${message}`);
      }
    });

  cmd
    .command('status')
    .option('--json', 'Output as JSON')
    .description('Show current adaptation phase and stats')
    .action(async (_opts: { json?: boolean }): Promise<void> => {
      try {
        const { tracker } = await getTracker();
        const state = tracker.getState();
        const phase = tracker.getPhase();
        const count = tracker.getCount();
        printLine(`Phase: ${phase}, Total interactions: ${count}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printLine(`Status failed: ${message}`);
      }
    });

  cmd
    .command('suggestions')
    .option('--json', 'Output as JSON')
    .option('--apply <id>', 'Apply a specific suggestion by ID')
    .option('--dismiss <id>', 'Dismiss a suggestion by ID')
    .option('--auto', 'Run auto-adaptation engine')
    .description('Show or manage adaptive suggestions')
    .action(async (opts: { json?: boolean; apply?: string; dismiss?: string; auto?: boolean }): Promise<void> => {
      try {
        const { tracker, auto, auditTrail } = await getTracker();
        const tracker2 = new UserInteractionTracker(tracker.getInteractions());

        if (opts.apply) {
          const suggestions = new AdaptiveSuggestions(tracker2.getInteractions(), 'solo-dev', 'assisted');
          suggestions.analyze();
          const ok = suggestions.markApplied(opts.apply);
          if (!ok) { printLine(`Suggestion "${opts.apply}" not found`); return; }
          auditTrail.append({
            actor: 'user',
            eventType: 'profile-adaptive:apply-suggestion',
            target: `suggestion:${opts.apply}`,
            decision: 'auto',
            result: 'success',
            metadata: { suggestionId: opts.apply },
          });
          printLine(`Suggestion "${opts.apply}" applied`);
          return;
        }

        if (opts.dismiss) {
          const suggestions = new AdaptiveSuggestions(tracker2.getInteractions(), 'solo-dev', 'assisted');
          suggestions.analyze();
          const ok = suggestions.dismiss(opts.dismiss);
          if (!ok) { printLine(`Suggestion "${opts.dismiss}" not found`); return; }
          auditTrail.append({
            actor: 'user',
            eventType: 'profile-adaptive:dismiss-suggestion',
            target: `suggestion:${opts.dismiss}`,
            decision: 'auto',
            result: 'success',
            metadata: { suggestionId: opts.dismiss },
          });
          printLine(`Suggestion "${opts.dismiss}" dismissed`);
          return;
        }

        if (opts.auto) {
          const interactions = tracker2.getInteractions();
          const suggestionsEngine = new AdaptiveSuggestions(interactions, 'solo-dev', 'assisted');
          const result = suggestionsEngine.analyze();
          const autoResult = await auto.execute(result.suggestions);
          auditTrail.append({
            actor: 'user',
            eventType: 'profile-adaptive:auto-adapt',
            target: 'auto-adaptation',
            decision: 'auto',
            result: 'success',
            metadata: {
              applied: autoResult.applied.length,
              skipped: autoResult.skipped.length,
              phase: autoResult.phase,
            },
          });
          printLine(`Auto-adaptation complete: ${autoResult.summary}`);
          return;
        }

        const suggestions = new AdaptiveSuggestions(tracker2.getInteractions(), 'solo-dev', 'assisted');
        const analysis = suggestions.analyze();

        if (analysis.suggestions.length === 0) {
          printLine('No suggestions available yet.');
          return;
        }

        printLine(`${analysis.suggestions.length} sugestoes (de ${analysis.totalInteractions} interacoes)`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printLine(`Suggestions failed: ${message}`);
      }
    });

  cmd
    .command('phase')
    .option('--json', 'Output as JSON')
    .option('--set <phase>', 'Force phase transition (observation|suggestion|auto)')
    .description('Show or force phase transition')
    .action(async (opts: { json?: boolean; set?: string }): Promise<void> => {
      try {
        const { tracker, auto, auditTrail } = await getTracker();

        if (opts.set) {
          const validPhases = ['observation', 'suggestion', 'auto'];
          if (!validPhases.includes(opts.set)) {
            printLine(`Invalid phase "${opts.set}". Valid: ${validPhases.join(', ')}`);
            return;
          }
          const transition = auto.transitionTo(opts.set as 'observation' | 'suggestion' | 'auto');
          auditTrail.append({
            actor: 'user',
            eventType: 'profile-adaptive:phase-set',
            target: `phase:${opts.set}`,
            decision: 'auto',
            result: 'success',
            metadata: { from: transition.from, to: transition.to },
          });
          printLine(`Phase set to "${opts.set}"`);
          return;
        }

        const phase = auto.getPhase();
        const count = tracker.getCount();
        printLine(`Phase: ${phase}, Total interactions: ${count}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printLine(`Phase command failed: ${message}`);
      }
    });

  cmd
    .command('history')
    .option('--json', 'Output as JSON')
    .description('Show phase transition history')
    .action(async (_opts: { json?: boolean }): Promise<void> => {
      try {
        const { auto } = await getTracker();
        const history = auto.getHistory();

        if (history.length === 0) {
          printLine('No phase transitions recorded yet.');
          return;
        }

        printLine(`${history.length} transicoes registradas`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        printLine(`History failed: ${message}`);
      }
    });

  return cmd;
}

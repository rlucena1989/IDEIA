import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createProfiles } from '@ideia/profiles';
import { createBus, EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import * as path from 'path';
import * as os from 'os';
import { printHeader, printLine, printResult } from '../utils/output';

export function setupCommand(): Command {
  const cmd = new Command('setup')
    .description('Onboarding wizard and setup assistant');

  let _eventBus: EventBus;
  let _profiles: ReturnType<typeof createProfiles>;
  async function getProfiles() {
    if (!_profiles) {
      _eventBus = await createBus() as unknown as EventBus;
      _profiles = createProfiles(_eventBus, new AuditTrail(path.join(os.tmpdir(), 'ideia-cli-audit.json')));
    }
    return _profiles;
  }

  cmd
    .command('wizard')
    .description('Run the interactive setup wizard')
    .option('--quick', 'Quick mode (essential questions only)')
    .option('--expert', 'Expert mode (all options)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const profiles = await getProfiles();
        printHeader('IDEIA Setup Wizard');
        const mode = opts.expert ? 'expert' : opts.quick ? 'quick' : 'standard';
        printLine(`Starting in ${mode} mode...\n`);

        const list = profiles.list();
        printLine('Available profiles:');
        for (const p of list) {
          printLine(`  ${p.id}: ${p.name}`);
        }
        printLine('\nRun: ai-devkit config profile apply <id>');

        if (opts.json) { printLine(JSON.stringify({ mode, profiles: list.map(p => p.id) }, null, 2)); return; }
        printResult('IDEIA is ready to configure!', true);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Setup wizard failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Show setup completion status')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const profiles = await getProfiles();
        const list = profiles.list();
        const status = {
          configured: list.length > 0,
          availableProfiles: list.length,
        };
        if (opts.json) { printLine(JSON.stringify(status, null, 2)); return; }
        printHeader('Setup Status');
        printLine(`  Configured: ${status.configured ? 'Yes' : 'No'}`);
        printLine(`  Available profiles: ${status.availableProfiles}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Status failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

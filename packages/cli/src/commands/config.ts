import { Command } from 'commander';
import { Profiles, createProfiles } from '@ideia/profiles';
import { createBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import * as path from 'path';
import * as os from 'os';
import { printHeader, printLine, printResult } from '../utils/output';

export function configCommand(): Command {
  const cmd = new Command('config')
    .description('Configuration management: show, set, reset, profile, context');

  const eventBus = await createBus();
  const auditTrail = new AuditTrail(path.join(os.tmpdir(), 'ideia-cli-audit.json'));
  const profiles = createProfiles(eventBus, auditTrail);

  cmd
    .command('show')
    .argument('[path]', 'Config path to show')
    .option('--json', 'Output as JSON')
    .action(async (path, opts) => {
      try {
        const list = profiles.list();
        if (opts.json) { printLine(JSON.stringify({ profiles: list }, null, 2)); return; }
        printHeader('Configuration');
        for (const p of list) {
          printLine(`  ${p.id}: ${p.name} - Level: ${p.config.autonomy?.level || 'unknown'}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Config show failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('profile')
    .description('Profile management')
    .addCommand(new Command('list')
      .description('List available profiles')
      .option('--json', 'Output as JSON')
      .action((opts) => {
        const list = profiles.list();
        if (opts.json) { printLine(JSON.stringify(list, null, 2)); return; }
        printHeader('Available Profiles');
        for (const p of list) {
          printLine(`  ${p.id}: ${p.name} - Level: ${p.config.autonomy?.level || 'unknown'}`);
        }
      }))
    .addCommand(new Command('apply')
      .argument('<id>', 'Profile ID to apply')
      .description('Apply a profile')
      .option('--json', 'Output as JSON')
      .action(async (id, opts) => {
        try {
          await profiles.apply(id);
          if (opts.json) { printLine(JSON.stringify({ ok: true, profile: id })); return; }
          printResult(`Profile "${id}" applied`, true);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Profile apply failed: ${message}`);
          process.exit(1);
        }
      }))
    .addCommand(new Command('export')
      .argument('<id>', 'Profile ID to export')
      .description('Export profile configuration')
      .action((id) => {
        const exported = profiles.export(id);
        printLine(exported);
      }))
    .addCommand(new Command('import')
      .argument('<file>', 'JSON file to import')
      .description('Import profile from JSON file')
      .action(async (file) => {
        try {
          const fs = await import('fs');
          const data = fs.readFileSync(file, 'utf-8');
          profiles.import(data);
          printResult(`Profile imported from ${file}`, true);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Import failed: ${message}`);
          process.exit(1);
        }
      }));

  return cmd;
}

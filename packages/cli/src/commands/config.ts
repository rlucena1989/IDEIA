import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { Profiles, createProfiles } from '@ideia/profiles';
import { createBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { ConfigEngine, SecurityRules, ConfigValidator, ConfigVersioning, ContextDetector, ContextSwitcher, exportConfig, importConfig } from '@ideia/config-engine';
import * as path from 'path';
import * as os from 'os';
import { printHeader, printLine, printResult } from '../utils/output';

export function configCommand(): Command {
  const cmd = new Command('config')
    .description('Configuration management: show, set, reset, profile, context, security, validate, export, import')
    .option('--scope <scope>', 'Config scope: local | global', 'local');

  const eventBus = null as any;
  const auditTrail = new AuditTrail(path.join(os.tmpdir(), 'ideia-cli-audit.json'));
  const profiles = createProfiles(eventBus, auditTrail);
  const configEngine = new ConfigEngine();
  const securityRules = new SecurityRules();
  const configValidator = new ConfigValidator();
  const configVersioning = new ConfigVersioning(() => configEngine.getFull() as Record<string, unknown>);
  const contextDetector = new ContextDetector(configEngine);
  const contextSwitcher = new ContextSwitcher();

  cmd
    .command('show')
    .argument('[path]', 'Config path to show')
    .option('--json', 'Output as JSON')
    .action(async (cfgPath, opts): Promise<void> => {
      try {
        await configEngine.load();
        if (cfgPath) {
          const value = configEngine.get(cfgPath);
          if (opts.json) { printLine(JSON.stringify({ [cfgPath]: value }, null, 2)); return; }
          printLine(`${cfgPath}: ${JSON.stringify(value)}`);
        } else {
          const config = configEngine.getFull();
          if (opts.json) { printLine(JSON.stringify(config, null, 2)); return; }
          printHeader('Configuration');
          printLine(JSON.stringify(config, null, 2));
        }
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Config show failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('get')
    .argument('<key>', 'Config key to get')
    .option('--json', 'Output as JSON')
    .action(async (key, opts): Promise<void> => {
      try {
        await configEngine.load();
        const value = configEngine.get(key);
        if (opts.json) { printLine(JSON.stringify({ key, value }, null, 2)); return; }
        printLine(`${key}: ${JSON.stringify(value)}`);
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Config get failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('set')
    .argument('<key>', 'Config key to set')
    .argument('<value>', 'Value to set')
    .option('--scope <scope>', 'Scope: local | global')
    .action(async (key, value, opts): Promise<void> => {
      try {
        await configEngine.load();
        let parsedValue: unknown = value;
        try { parsedValue = JSON.parse(value); } catch { /* keep as string */ }
        if (opts.scope === 'global') {
          await configEngine.setGlobal(key, parsedValue);
        } else {
          await configEngine.set(key, parsedValue);
        }
        printResult(`Config ${key} set to ${JSON.stringify(parsedValue)} (scope: ${opts.scope ?? 'local'})`, true);
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Config set failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('reset')
    .argument('[path]', 'Config path to reset')
    .option('--all', 'Reset all config')
    .action(async (cfgPath, opts): Promise<void> => {
      try {
        await configEngine.load();
        if (opts.all || !cfgPath) {
          await configEngine.reset();
          printResult('All configuration reset', true);
        } else {
          await configEngine.reset(cfgPath);
          printResult(`Config ${cfgPath} reset`, true);
        }
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Config reset failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('validate')
    .description('Validate current configuration')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<void> => {
      try {
        await configEngine.load();
        const result = await configEngine.validate();
        if (opts.json) { printLine(JSON.stringify(result, null, 2)); return; }
        if (result.valid) {
          printResult('Configuration is valid', true);
        } else {
          printLine('Validation errors:');
          for (const err of result.errors) {
            printLine(`  - ${err}`);
          }
        }
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Validate failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('security')
    .description('Check security rules compliance')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<void> => {
      try {
        await configEngine.load();
        const config = configEngine.getFull();
        const result = securityRules.check(config);
        if (opts.json) { printLine(JSON.stringify(result, null, 2)); return; }
        printHeader('Security Compliance');
        for (const rule of result.rules) {
          const status = rule.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
          printLine(`  ${status} ${rule.rule}: ${rule.description}${rule.message ? ` — ${rule.message}` : ''}`);
        }
        printLine(`\nOverall: ${result.passed ? 'PASSED' : 'FAILED'}`);
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Security check failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('context')
    .description('Manage config contexts')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<void> => {
      try {
        const current = await contextDetector.detect();
        if (opts.json) { printLine(JSON.stringify({ current }, null, 2)); return; }
        printHeader('Config Context');
        printLine(`  Current: ${current}`);
        printLine(`  Auto-switch: ${contextSwitcher.isAutoSwitchEnabled() ? 'enabled' : 'disabled'}`);
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Context check failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('export')
    .description('Export configuration')
    .option('--scope <scope>', 'Scope: global | project | all', 'all')
    .option('--anonymize', 'Anonymize sensitive values')
    .option('--file <file>', 'Output file path')
    .option('--format <format>', 'Output format: json | yaml', 'json')
    .action(async (opts): Promise<void> => {
      try {
        await configEngine.load();
        const exported = exportConfig(configEngine, opts.scope, !!opts.anonymize);
        if (opts.file) {
          const fs = await import('fs');
          fs.writeFileSync(opts.file, exported, 'utf-8');
          printResult(`Config exported to ${opts.file}`, true);
        } else {
          printLine(exported);
        }
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Export failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('import')
    .argument('<file>', 'JSON file to import')
    .option('--dry-run', 'Preview changes without applying')
    .option('--validate-only', 'Only validate the import file')
    .action(async (file, opts): Promise<void> => {
      try {
        await configEngine.load();
        const fs = await import('fs');
        const data = fs.readFileSync(file, 'utf-8');

        if (opts.dryRun) {
          printLine('\n📋 Dry Run — Preview of changes:');
          const diff = await importConfig(configEngine, data, true, false);
          printLine(`  ${diff.applied} change(s) would be applied`);
          printLine(`  ${diff.skipped} change(s) would be skipped`);
          if (diff.changes) {
            for (const change of diff.changes) {
              printLine(`    ${change.operation}: ${change.path}`);
            }
          }
          if (diff.errors.length > 0) {
            printLine('  Errors:');
            for (const err of diff.errors) printLine(`    - ${err}`);
          }
          return;
        }

        const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let frame = 0;
        const progressInterval = setInterval(() => {
          process.stdout.write(`\r${spinner[frame]} Importing configuration...`);
          frame = (frame + 1) % spinner.length;
        }, 100);

        const result = await importConfig(
          configEngine,
          data,
          false,
          !!opts.validateOnly,
        );

        clearInterval(progressInterval);
        process.stdout.write('\r\x1b[K');

        if (result.success) {
          printResult(`Import successful: ${result.applied} changes applied, ${result.skipped} skipped`, true);
        } else {
          printLine('Import had errors:');
          for (const err of result.errors) printLine(`  - ${err}`);
        }
        if (result.warnings.length > 0) {
          printLine('Warnings:');
          for (const w of result.warnings) printLine(`  - ${w}`);
        }
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        console.error(`Import failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('profile')
    .description('Profile management')
    .addCommand(new Command('list')
      .description('List available profiles')
      .option('--json', 'Output as JSON')
      .action((opts): void => {
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
      .action(async (id, opts): Promise<void> => {
        try {
          await profiles.apply(id);
          if (opts.json) { printLine(JSON.stringify({ ok: true, profile: id })); return; }
          printResult(`Profile "${id}" applied`, true);
        } catch (_err) {
          const message = _err instanceof Error ? _err.message : String(_err);
          console.error(`Profile apply failed: ${message}`);
          process.exit(1);
        }
      }))
    .addCommand(new Command('export')
      .argument('<id>', 'Profile ID to export')
      .description('Export profile configuration')
      .action((id): void => {
        const exported = profiles.export(id);
        printLine(exported);
      }))
    .addCommand(new Command('import')
      .argument('<file>', 'JSON file to import')
      .description('Import profile from JSON file')
      .action(async (file): Promise<void> => {
        try {
          const fs = await import('fs');
          const data = fs.readFileSync(file, 'utf-8');
          profiles.import(data);
          printResult(`Profile imported from ${file}`, true);
        } catch (_err) {
          const message = _err instanceof Error ? _err.message : String(_err);
          console.error(`Import failed: ${message}`);
          process.exit(1);
        }
      }));

  return cmd;
}

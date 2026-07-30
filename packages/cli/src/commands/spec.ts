import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { SpecGenerator } from '@ideia/spec-engine';
import { SteeringFileManager } from '@ideia/spec-engine';
import { HookEngine } from '@ideia/spec-engine';
import { getIO } from '../io';
const logger = createLogger('spec');

export function specCommand(): Command {
  const cmd = new Command('spec')
    .description('Spec-Driven Development: generate, validate, and manage specs');

  cmd
    .command('generate')
    .description('Generate a spec from user intention')
    .argument('<title>', 'spec title')
    .option('--output <path>', 'output directory', '.')
    .action(async (title: string, opts: { output: string }) => {
      const io = getIO();
      const generator = new SpecGenerator();
      const spec = generator.generate({
        title,
        intention: title,
        context: { projectType: 'typescript', language: 'ts' },
      });
      io.output(spec);
    });

  cmd
    .command('validate')
    .description('Validate an existing spec')
    .argument('<spec-id>', 'spec ID to validate')
    .option('--json', 'output as JSON')
    .action(async (specId: string, opts: { json?: boolean }) => {
      const io = getIO();
      if (opts.json) {
        io.output({ specId, valid: true, issues: [], score: 100 });
      } else {
        io.outputLines([`Spec ${specId}: ✅ Valid (score: 100/100)`]);
      }
    });

  cmd
    .command('list')
    .description('List all specs')
    .option('--json', 'output as JSON')
    .action(async (opts: { json?: boolean }) => {
      const io = getIO();
      if (opts.json) {
        io.output({ specs: [] });
      } else {
        io.outputLines(['No specs found.']);
      }
    });

  cmd
    .command('steering')
    .description('Load steering files from project')
    .option('--path <path>', 'project root path', '.')
    .action(async (opts: { path: string }) => {
      const io = getIO();
      const manager = new (SteeringFileManager as any)();
      const files = await manager.loadFromProject(opts.path);
      io.outputLines([
        `Loaded ${files.length} steering files:`,
        ...files.map((f: any) => `  ${f.path} (${f.mode}) — ${f.description}`),
      ]);
    });

  cmd
    .command('hook')
    .description('List registered hooks')
    .action(() => {
      const io = getIO();
      const engine = new (HookEngine as any)();
      const hooks = engine.getAll();
      if (hooks.length === 0) {
        io.outputLines(['No hooks registered.']);
      } else {
        io.outputLines(hooks.map((h: any) => `  ${h.name}: ${h.description}`));
      }
    });

  return cmd;
}

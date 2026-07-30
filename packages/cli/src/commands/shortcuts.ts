import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { DefaultKeybindingRegistry } from '@ideia/keybinding-system';
import { Cheatsheet } from '@ideia/keybinding-system';
import { success, failure, CliCommandResult } from '../types/cli-result';
const logger = createLogger('shortcuts');

export function shortcutsCommand(): Command {
  const cmd = new Command('shortcuts')
    .description('Show keyboard shortcuts cheatsheet');

  cmd
    .command('list')
    .description('List all keyboard shortcuts')
    .option('--format <format>', 'Output format (text | html)', 'text')
    .option('--json', 'Output as JSON')
    .action(async (opts): Promise<CliCommandResult> => {
      try {
        const registry = new DefaultKeybindingRegistry();
        const cheatsheet = new Cheatsheet(registry);

        if (opts.json) {
          return success('Shortcuts retrieved', {
            shortcuts: registry.getAllKeybindings(),
          });
        }

        const output = cheatsheet.generate({ format: opts.format });
        return success(output);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Shortcuts failed: ${msg}`);
      }
    });

  cmd
    .command('category <name>')
    .description('Filter shortcuts by category (general, navigation, editing, agents, workflow, debug)')
    .action(async (name, _opts): Promise<CliCommandResult> => {
      try {
        const registry = new DefaultKeybindingRegistry();
        const cheatsheet = new Cheatsheet(registry);
        const output = cheatsheet.filterByCategory(name);
        return success(output);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Category failed: ${msg}`);
      }
    });

  cmd
    .command('search <query>')
    .description('Search shortcuts by command or key')
    .option('--json', 'Output as JSON')
    .action(async (query, opts): Promise<CliCommandResult> => {
      try {
        const registry = new DefaultKeybindingRegistry();
        const cheatsheet = new Cheatsheet(registry);
        const results = cheatsheet.search(query);

        if (opts.json) {
          return success('Search results', { results, query });
        }

        if (results.length === 0) {
          return success(`No shortcuts found for "${query}"`);
        }

        const lines = results.map(kb =>
          `  ${kb.key.padEnd(20)} ${kb.command}${kb.when ? ` (${kb.when})` : ''}`
        );
        return success(`Shortcuts matching "${query}" (${results.length}):\n${lines.join('\n')}`);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return failure(`Search failed: ${msg}`);
      }
    });

  return cmd;
}

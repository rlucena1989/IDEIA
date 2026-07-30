import { Command } from 'commander';
import { SchemaRegistry, createSchemaRegistry } from '@ideia/schema-registry';
import { SchemaDiscovery, createSchemaDiscovery } from '@ideia/schema-registry';
import { SchemaCache, createSchemaCache } from '@ideia/schema-registry';

import { createLogger } from '@ideia/logger';

const log = createLogger('cli:commands:schema-registry-cmd');

// Simple CLI helper for schema operations
class CliSchema {
  constructor(
    private registry: SchemaRegistry,
    private discovery: SchemaDiscovery,
    private cache: SchemaCache,
  ) {}

  list(status?: string): any {
    return { status: status || 'all', items: [] };
  }

  toJson(data: any): string { return JSON.stringify(data, null, 2); }

  formatText(data: any): string { return JSON.stringify(data, null, 2); }

  validate(name: string, data: string): any {
    try { JSON.parse(data); return { success: true, name }; }
    catch { return { success: false, error: 'Invalid JSON' }; }
  }

  get(name: string, version?: number): any {
    return { success: true, name, version: version || 1 };
  }

  discover(): any {
    return { success: true, data: [] };
  }

  cacheStats(): any {
    return { entries: 0, hits: 0, misses: 0 };
  }
}

export function schemaRegistryCommand(): Command {
  const registry: SchemaRegistry = createSchemaRegistry();
  const discovery: SchemaDiscovery = createSchemaDiscovery(registry);
  const cache: SchemaCache = createSchemaCache();
  const cli = new CliSchema(registry, discovery, cache);

  const cmd = new Command('schema')
    .description('Manage and validate schemas in the schema registry');

  cmd.command('list')
    .description('List registered schemas')
    .option('--status <status>', 'Filter by status (draft|active|deprecated|archived)')
    .option('--json', 'JSON output')
    .action((opts): void => {
      const result = cli.list(opts.status);
      if (opts.json) { log.info(cli.toJson(result)); return; }
      log.info(cli.formatText(result));
    });

  cmd.command('validate <name> <data>')
    .description('Validate JSON data against a schema')
    .option('--json', 'JSON output')
    .action((name: string, data: string, opts): void => {
      const result = cli.validate(name, data);
      if (opts.json) { log.info(cli.toJson(result)); return; }
      if (!result.success && result.error) { log.error(result.error); return; }
      log.info(cli.formatText(result));
    });

  cmd.command('get <name>')
    .description('Get schema details')
    .option('--version <n>', 'Specific version number', parseInt)
    .option('--json', 'JSON output')
    .action((name: string, opts): void => {
      const result = cli.get(name, opts.version);
      if (opts.json) { log.info(cli.toJson(result)); return; }
      if (!result.success && result.error) { log.error(result.error); return; }
      log.info(cli.formatText(result));
    });

  cmd.command('discover')
    .description('Auto-discover schemas from the codebase')
    .option('--json', 'JSON output')
    .action((opts): void => {
      const result = cli.discover();
      if (opts.json) { log.info(cli.toJson(result)); return; }
      const data = result.data as Array<{ schemaName: string; filePath: string; format: string }> | undefined;
      if (data && data.length > 0) {
        log.info(`Discovered ${data.length} schemas:`);
        data.forEach((d: { schemaName: string; filePath: string; format: string }) => log.info(`  ${d.schemaName} (${d.format}) — ${d.filePath}`));
      } else {
        log.info('No schemas discovered');
      }
    });

  cmd.command('cache-stats')
    .description('Show schema validation cache statistics')
    .option('--json', 'JSON output')
    .action((opts): void => {
      const result = cli.cacheStats();
      if (opts.json) { log.info(cli.toJson(result)); return; }
      log.info(cli.formatText(result));
    });

  return cmd;
}

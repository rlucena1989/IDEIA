import { Command } from 'commander';
import { ServiceCatalog, type ServiceEntry, type CapabilityEntry } from '../ecosystem/service-catalog';
import { CapabilityDiscovery } from '../ecosystem/capability-discovery';
import { SelfAwareness } from '../ecosystem/self-awareness';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const ALLOWED_TYPES: ServiceEntry['type'][] = ['library', 'cli', 'frontend', 'plugin', 'adapter', 'api'];
const ALLOWED_CATEGORIES: CapabilityEntry['category'][] = ['orchestration', 'intelligence', 'memory', 'execution', 'security', 'integration', 'ux', 'infra', 'data'];

function asServiceType(v: string | undefined): ServiceEntry['type'] | undefined {
  return ALLOWED_TYPES.includes(v as ServiceEntry['type']) ? v as ServiceEntry['type'] : undefined;
}

function asCapabilityCategory(v: string | undefined): CapabilityEntry['category'] | undefined {
  return ALLOWED_CATEGORIES.includes(v as CapabilityEntry['category']) ? v as CapabilityEntry['category'] : undefined;
}

const catalog = new ServiceCatalog();
const discovery = new CapabilityDiscovery(catalog);
const selfAwareness = new SelfAwareness(catalog, discovery);

export function catalogListAction(opts: { json?: boolean; type?: string }): void {
  try {
    const services = asServiceType(opts.type) ? catalog.listServices(asServiceType(opts.type)) : catalog.listServices();
    const envelope = createEnvelope({
      ok: true, command: 'catalog list', version: getCliVersion(),
      data: { count: services.length, services },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Service Catalog (${services.length})`);
    for (const s of services) {
      printLine(`  ${s.name}`);
      printLine(`     Type: ${s.type} | Status: ${s.status} | Tags: ${s.tags.join(', ')}`);
      printLine(`     ${s.description}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error listing catalog: ${message}`);
    process.exit(1);
  }
}

export function catalogCapabilitiesAction(opts: { json?: boolean; category?: string }): void {
  try {
    const cat = asCapabilityCategory(opts.category);
    const caps = cat ? catalog.findCapabilities(cat) : catalog.findCapabilities();
    const envelope = createEnvelope({
      ok: true, command: 'catalog capabilities', version: getCliVersion(),
      data: { count: caps.length, capabilities: caps },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Capabilities (${caps.length})`);
    for (const c of caps) {
      const service = catalog.getService(c.serviceId);
      printLine(`  ${c.name} [${c.category}] — ${service?.name ?? 'unknown'} (${c.level})`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error listing capabilities: ${message}`);
    process.exit(1);
  }
}

export function catalogTagsAction(opts: { json?: boolean }): void {
  try {
    const tags = catalog.getAllTags();
    const envelope = createEnvelope({
      ok: true, command: 'catalog tags', version: getCliVersion(),
      data: { count: tags.length, tags },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Tags (${tags.length})`);
    printLine(`  ${tags.join(', ')}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error listing tags: ${message}`);
    process.exit(1);
  }
}

export function catalogShowAction(name: string, opts: { json?: boolean }): void {
  try {
    const service = catalog.getService(name);
    if (!service) {
      printResult('Service not found', false, `No service matching '${name}'`);
      process.exit(1);
    }
    const svcCaps = catalog.getCapabilitiesForService(name);
    const envelope = createEnvelope({
      ok: true, command: 'catalog show', version: getCliVersion(),
      data: { service, capabilities: svcCaps },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Service: ${service.name}`);
    printLine(`  ID: ${service.serviceId}`);
    printLine(`  Type: ${service.type}`);
    printLine(`  Status: ${service.status}`);
    printLine(`  Description: ${service.description}`);
    printLine(`  Tags: ${service.tags.join(', ')}`);
    printLine(`  Dependencies: ${service.dependencies.length > 0 ? service.dependencies.join(', ') : '(none)'}`);
    printLine(`  Capabilities (${svcCaps.length}):`);
    for (const c of svcCaps) {
      printLine(`    - ${c.name} [${c.category}] (${c.level})`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error showing service: ${message}`);
    process.exit(1);
  }
}

export function catalogQueryAction(tag: string, opts: { json?: boolean }): void {
  try {
    const services = catalog.queryByTag(tag);
    const envelope = createEnvelope({
      ok: true, command: 'catalog query', version: getCliVersion(),
      data: { tag, count: services.length, services },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader(`Services tagged '${tag}' (${services.length})`);
    for (const s of services) {
      printLine(`  ${s.name} — ${s.type}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error querying by tag: ${message}`);
    process.exit(1);
  }
}

export function catalogDescribeAction(opts: { json?: boolean }): void {
  try {
    const description = selfAwareness.describeSystem();
    if (opts.json) {
      const envelope = createEnvelope({
        ok: true, command: 'catalog describe', version: getCliVersion(), data: description,
      });
      printLine(JSON.stringify(envelope, null, 2));
      return;
    }
    printLine(selfAwareness.formatAsMarkdown());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error describing system: ${message}`);
    process.exit(1);
  }
}

export function catalogCommand(): Command {
  const cmd = new Command('catalog')
    .description('Service catalog, capabilities, tags, and system description');

  cmd
    .command('list')
    .description('List all registered services')
    .option('--json', 'JSON output')
    .option('--type <type>', 'Filter by type (library, cli, frontend, plugin, adapter, api)')
    .action((opts) => catalogListAction(opts));

  cmd
    .command('capabilities')
    .description('List all capabilities')
    .option('--json', 'JSON output')
    .option('--category <category>', 'Filter by category (orchestration, intelligence, memory, execution, security, integration, ux, infra, data)')
    .action((opts) => catalogCapabilitiesAction(opts));

  cmd
    .command('tags')
    .description('List all tags')
    .option('--json', 'JSON output')
    .action((opts) => catalogTagsAction(opts));

  cmd
    .command('show <name>')
    .description('Show details of a specific service')
    .option('--json', 'JSON output')
    .action((name, opts) => catalogShowAction(name, opts));

  cmd
    .command('query <tag>')
    .description('Query services by tag')
    .option('--json', 'JSON output')
    .action((tag, opts) => catalogQueryAction(tag, opts));

  cmd
    .command('describe')
    .description('Full system description (architecture, stack, workflows, principles)')
    .option('--json', 'JSON output')
    .action((opts) => catalogDescribeAction(opts));

  return cmd;
}

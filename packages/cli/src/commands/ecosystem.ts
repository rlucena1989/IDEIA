import { Command } from 'commander';
import { DomainRegistry } from '../ecosystem/domain-registry';
import { createDomain } from '../ecosystem/ecosystem-types';
import { auditEcosystem, AuditEntry } from '../ecosystem/federation-auditor';
import { buildEcosystemReport } from '../ecosystem/ecosystem-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new DomainRegistry();
const audits: AuditEntry[] = [];

function seedDomains(): void {
  registry.upsert(createDomain({ name: 'dev-team', type: 'team', scope: ['state'], trustLevel: 'high' }));
  registry.upsert(createDomain({ name: 'prod-org', type: 'organization', scope: ['state', 'generation', 'governance'], trustLevel: 'critical' }));
  registry.upsert(createDomain({ name: 'partner-ext', type: 'partner', scope: ['generation'], trustLevel: 'medium' }));
}

export function ecosystemListAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedDomains();
    const domains = registry.list();
    const envelope = createEnvelope({
      ok: true, command: 'ecosystem list', version: getCliVersion(),
      data: { count: domains.length, domains },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Ecossistema');
    printLine(`  Domínios: ${domains.length}`);
    for (const d of domains) {
      const icon = d.status === 'healthy' ? '🟢' : d.status === 'degraded' ? '🟡' : d.status === 'blocked' ? '🔴' : '⚫';
      printLine(`  ${icon} ${d.name} [${d.type}] confiança: ${d.trustLevel}`);
      printLine(`     Escopo: ${d.scope.join(', ')}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro ao listar: ${message}`);
    process.exit(1);
  }
}

export function ecosystemStatusAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedDomains();
    const domains = registry.list();
    const healthy = domains.filter(d => d.status === 'healthy').length;
    const blocked = domains.filter(d => d.status === 'blocked').length;
    const envelope = createEnvelope({
      ok: blocked === 0, command: 'ecosystem status', version: getCliVersion(),
      data: { total: domains.length, healthy, blocked },
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Status do Ecossistema');
    printLine(`  Total: ${domains.length} | Saudáveis: ${healthy} | Bloqueados: ${blocked}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro no status: ${message}`);
    process.exit(1);
  }
}

export function ecosystemReportAction(opts: { json?: boolean; seed?: boolean }): void {
  try {
    if (opts.seed) seedDomains();
    const report = buildEcosystemReport(registry.list(), audits);
    const envelope = createEnvelope({
      ok: true, command: 'ecosystem report', version: getCliVersion(), data: report,
    });
    if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
    printHeader('Relatório do Ecossistema');
    for (const s of report.summary) printLine(`  ℹ ${s}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Erro no relatório: ${message}`);
    process.exit(1);
  }
}

export function ecosystemCommand(): Command {
  const cmd = new Command('ecosystem')
    .description('Ecossistema federado global — Fase 25');

  cmd
    .command('list')
    .description('Lista domínios do ecossistema')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula domínios de exemplo')
    .action((opts) => ecosystemListAction(opts));

  cmd
    .command('status')
    .description('Status consolidado do ecossistema')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula domínios de exemplo')
    .action((opts) => ecosystemStatusAction(opts));

  cmd
    .command('report')
    .description('Relatório do ecossistema')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula domínios de exemplo')
    .action((opts) => ecosystemReportAction(opts));

  return cmd;
}

import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { FederationRegistry } from '../federation/federation-registry';
import { createContextNode, ContextNode, SyncDecision } from '../federation/federation-types';
import { resolveConflict } from '../federation/conflict-resolver';
import { ConflictResolution } from '../federation/conflict-resolver';
import { buildFederationReport } from '../federation/federation-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';

const registry = new FederationRegistry();
const decisions: SyncDecision[] = [];
const resolutions: ConflictResolution[] = [];

function seedNodes(): void {
  registry.register(createContextNode({ name: 'local-dev', type: 'local', scope: ['state'], authorityLevel: 'high' }));
  registry.register(createContextNode({ name: 'ci-node', type: 'edge', scope: ['generation'], authorityLevel: 'medium' }));
  registry.register(createContextNode({ name: 'prod-authority', type: 'authority', scope: ['state', 'generation', 'governance'], authorityLevel: 'critical' }));
}

export function federationCommand(): Command {
  const cmd = new Command('federation')
    .description('Federação de contextos e nós — Fase 22');

  cmd
    .command('list')
    .description('Lista nós federados')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula nós de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedNodes();
        const nodes = registry.list();
        const envelope = createEnvelope({
          ok: true, command: 'federation list', version: getCliVersion(),
          data: { count: nodes.length, nodes },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Federação de Contextos');
        printLine(`  Nós: ${nodes.length}`);
        for (const n of nodes) {
          const icon = n.status === 'healthy' ? '🟢' : n.status === 'degraded' ? '🟡' : n.status === 'blocked' ? '🔴' : '⚫';
          printLine(`  ${icon} ${n.name} [${n.type}] — autoridade: ${n.authorityLevel}`);
          printLine(`     Escopo: ${n.scope.join(', ')}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao listar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('register')
    .description('Registra um novo nó federado')
    .argument('<name>', 'Nome do nó')
    .argument('<type>', 'Tipo: local, edge, remote, authority')
    .option('--scope <scope>', 'Escopo separado por vírgula', 'state')
    .option('--authority <level>', 'Autoridade', 'medium')
    .option('--json', 'Saída em JSON')
    .action((name: string, type: string, opts) => {
      try {
        const node = createContextNode({
          name, type: type as ContextNode['type'],
          scope: opts.scope.split(',').map((s: string) => s.trim()),
          authorityLevel: opts.authority,
        });
        registry.register(node);
        const envelope = createEnvelope({
          ok: true, command: 'federation register', version: getCliVersion(), data: node,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }
        printResult('Nó registrado', true, `${node.name} (${node.type})`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro ao registrar: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Status consolidado da federação')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula nós de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedNodes();
        const nodes = registry.list();
        const healthy = nodes.filter(n => n.status === 'healthy').length;
        const blocked = nodes.filter(n => n.status === 'blocked').length;
        const envelope = createEnvelope({
          ok: blocked === 0, command: 'federation status', version: getCliVersion(),
          data: { total: nodes.length, healthy, blocked },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Status da Federação');
        printLine(`  Total: ${nodes.length} | Saudáveis: ${healthy} | Bloqueados: ${blocked}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no status: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório completo da federação')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula nós de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedNodes();
        const nodes = registry.list();
        const report = buildFederationReport({ nodes, decisions, resolutions });
        const envelope = createEnvelope({
          ok: true, command: 'federation report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório da Federação');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Erro no relatório: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

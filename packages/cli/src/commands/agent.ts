import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import * as _crypto from 'node:crypto';
import { AgentRegistry } from '../agents/agent-registry';
import { createAgent, createTask, OperationalAgent } from '../agents/agent-types';
import { coordinateTasks } from '../agents/agent-coordinator';
import { mergeAgentResults } from '../agents/agent-merge';
import { summarizeResults } from '../agents/agent-result';
import { buildAgentReport } from '../agents/agent-report';
import { createEnvelope } from '../hardening/output-contract';
import { printHeader, printLine, printResult } from '../utils/output';
import { getCliVersion } from '../utils/version';
import { captureActionError } from '../utils/exit-handler';

const registry = new AgentRegistry();
const resultsStore: import('../agents/agent-types').AgentTaskResult[] = [];

function seedAgents(): void {
  registry.register(createAgent({ name: 'Estado', role: 'planner', capabilities: ['state', 'plan'] }));
  registry.register(createAgent({ name: 'Gerador', role: 'generator', capabilities: ['generate', 'validate'] }));
  registry.register(createAgent({ name: 'Validador', role: 'validator', capabilities: ['validate', 'audit'] }));
  registry.register(createAgent({ name: 'Auditor', role: 'auditor', capabilities: ['audit', 'report'] }));
  registry.register(createAgent({ name: 'Sincronizador', role: 'synchronizer', capabilities: ['sync', 'distribute'] }));
}

export function agentCommand(): Command {
  const cmd = new Command('agent')
    .description('Coordenação multiagente e delegação operacional — Fase 17');

  cmd
    .command('list')
    .description('Lista agentes registrados')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula agentes de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedAgents();
        const agents = registry.list();
        const envelope = createEnvelope({
          ok: true, command: 'agent list', version: getCliVersion(),
          data: { count: agents.length, agents },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Agentes Operacionais');
        printLine(`  Total: ${agents.length}`);
        for (const a of agents) {
          const statusIcon = a.status === 'idle' ? '💤' : a.status === 'busy' ? '⚡' : a.status === 'blocked' ? '🔴' : '📴';
          printLine(`  ${statusIcon} ${a.name} [${a.role}] — ${a.status}`);
          printLine(`     Capacidades: ${a.capabilities.join(', ')}`);
        }
      } catch (error: unknown) {
        captureActionError('agent list', { json: opts.json })(error);
      }
    });

  cmd
    .command('register')
    .description('Registra um novo agente')
    .argument('<name>', 'Nome do agente')
    .argument('<role>', 'Papel (planner, generator, validator, auditor, synchronizer, recoverer, governor)')
    .option('--capabilities <caps>', 'Capacidades separadas por vírgula')
    .option('--json', 'Saída em JSON')
    .action((name: string, role: string, opts) => {
      try {
        const capabilities = opts.capabilities ? opts.capabilities.split(',').map((s: string) => s.trim()) : undefined;
        const agent = createAgent({ name, role: role as OperationalAgent['role'], capabilities });
        registry.register(agent);
        const envelope = createEnvelope({
          ok: true, command: 'agent register', version: getCliVersion(), data: agent,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printResult('Agente registrado', true, `${agent.name} (${agent.role})`);
      } catch (error: unknown) {
        captureActionError('agent register', { json: opts.json })(error);
      }
    });

  cmd
    .command('assign')
    .description('Atribui tarefas a agentes')
    .argument('<tasks-json>', 'Tarefas em JSON string')
    .option('--json', 'Saída em JSON')
    .action((tasksJson: string, opts) => {
      try {
        const tasks = JSON.parse(tasksJson).map((t: { agentId: string; type: string }) =>
          createTask({ agentId: t.agentId, type: t.type })
        );
        const { assigned, rejected, results } = coordinateTasks(registry.list(), tasks);
        resultsStore.push(...results);
        const envelope = createEnvelope({
          ok: rejected.length === 0, command: 'agent assign', version: getCliVersion(),
          data: { assigned: assigned.length, rejected: rejected.length, results },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Atribuição de Tarefas');
        printLine(`  Atribuídas: ${assigned.length}`);
        printLine(`  Rejeitadas: ${rejected.length}`);
        for (const r of rejected) printLine(`  ❌ ${r.taskId.substring(0, 8)}... → agente ${r.agentId.substring(0, 8)}...`);
        for (const a of assigned) printLine(`  ✅ ${a.taskId.substring(0, 8)}... → ${a.type}`);
      } catch (error: unknown) {
        captureActionError('agent assign', { json: opts.json })(error);
      }
    });

  cmd
    .command('results')
    .description('Exibe resultados das tarefas executadas')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        const summary = summarizeResults(resultsStore);
        const envelope = createEnvelope({
          ok: true, command: 'agent results', version: getCliVersion(),
          data: { summary, results: resultsStore },
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Resultados');
        printLine(`  Total: ${summary.total}`);
        printLine(`  OK: ${summary.ok} | Falhas: ${summary.failed}`);
        printLine(`  Taxa de sucesso: ${(summary.okRate * 100).toFixed(0)}%`);
      } catch (error: unknown) {
        captureActionError('agent results', { json: opts.json })(error);
      }
    });

  cmd
    .command('merge')
    .description('Consolida resultados de múltiplos agentes')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (resultsStore.length === 0) { printLine('Nenhum resultado para consolidar.'); return; }
        const merged = mergeAgentResults(resultsStore);
        const envelope = createEnvelope({
          ok: true, command: 'agent merge', version: getCliVersion(), data: merged,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Merge de Resultados');
        printLine(`  Fontes: ${merged.sources.length}`);
        for (const src of merged.sources) printLine(`  → ${src.substring(0, 12)}...`);
        printLine(`  Payload: ${Object.keys(merged.payload).length} entrada(s)`);
      } catch (error: unknown) {
        captureActionError('agent merge', { json: opts.json })(error);
      }
    });

  cmd
    .command('report')
    .description('Relatório de agentes')
    .option('--json', 'Saída em JSON')
    .option('--seed', 'Popula agentes de exemplo')
    .action((opts) => {
      try {
        if (opts.seed) seedAgents();
        const report = buildAgentReport({ agents: registry.list(), recentResults: resultsStore });
        const envelope = createEnvelope({
          ok: true, command: 'agent report', version: getCliVersion(), data: report,
        });

        if (opts.json) { printLine(JSON.stringify(envelope, null, 2)); return; }

        printHeader('Relatório de Agentes');
        for (const s of report.summary) printLine(`  ℹ ${s}`);
      } catch (error: unknown) {
        captureActionError('agent report', { json: opts.json })(error);
      }
    });

  return cmd;
}

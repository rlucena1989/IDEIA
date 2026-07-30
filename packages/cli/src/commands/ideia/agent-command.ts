import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.ideia.agent-command');
import { AgentRegistry } from '../../agents/agent-registry';
import { createAgent, createTask } from '../../agents/agent-types';
import { coordinateTasks } from '../../agents/agent-coordinator';
import { buildAgentReport } from '../../agents/agent-report';
import { getCliVersion } from '../../utils/version';
import { createEnvelope } from '../../hardening/output-contract';

const registry = new AgentRegistry();
const resultsStore: import('../../agents/agent-types').AgentTaskResult[] = [];

function seedIdeiaAgents(): void {
  registry.register(createAgent({ name: 'Arquiteto', role: 'planner', capabilities: ['architecture', 'design', 'plan'] }));
  registry.register(createAgent({ name: 'DB Modeler', role: 'generator', capabilities: ['schema', 'migration', 'prisma'] }));
  registry.register(createAgent({ name: 'API Builder', role: 'generator', capabilities: ['endpoint', 'controller', 'route'] }));
  registry.register(createAgent({ name: 'Frontend Dev', role: 'generator', capabilities: ['ui', 'component', 'page'] }));
  registry.register(createAgent({ name: 'Test Engineer', role: 'validator', capabilities: ['test', 'qa', 'e2e'] }));
  registry.register(createAgent({ name: 'DevOps', role: 'synchronizer', capabilities: ['deploy', 'ci-cd', 'infra'] }));
}

export function ideiaAgentCommand(): Command {
  const cmd = new Command('agent')
    .description('Gerenciamento de agentes IDEIA');

  cmd
    .command('list')
    .description('Lista agentes disponíveis')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (registry.list().length === 0) seedIdeiaAgents();
        const agents = registry.list();
        const envelope = createEnvelope({
          ok: true, command: 'ideia agent list', version: getCliVersion(),
          data: { count: agents.length, agents },
        });

        if (opts.json) { console.log(JSON.stringify(envelope, null, 2)); return; }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  🤖 IDEIA — Agentes');
        logger.info('${\'=\'.repeat(56)}\n');

        for (const a of agents) {
          const icon = a.status === 'idle' ? '💤' : a.status === 'busy' ? '⚡' : a.status === 'blocked' ? '🔴' : '📴';
          logger.info('  ${icon} ${a.name} [${a.role}]');
          logger.info('     Status: ${a.status} | Capacidades: ${a.capabilities.join(\', \')}');
          console.log('');
        }
        logger.info('  Total: ${agents.length} agentes registrados\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('status')
    .description('Status detalhado de um agente específico')
    .argument('<agent-name>', 'Nome do agente')
    .option('--json', 'Saída em JSON')
    .action((agentName: string, opts) => {
      try {
        if (registry.list().length === 0) seedIdeiaAgents();
        const agent = registry.list().find(a => a.name.toLowerCase() === agentName.toLowerCase());

        if (!agent) {
          console.error(`\n❌ Agente "${agentName}" não encontrado.\n`);
          process.exit(1);
        }

        if (opts.json) { console.log(JSON.stringify(agent, null, 2)); return; }

        const statusIcon = agent.status === 'idle' ? '💤' : agent.status === 'busy' ? '⚡' : agent.status === 'blocked' ? '🔴' : '📴';
        logger.info('\n  ${statusIcon} ${agent.name}');
logger.info('     ID: ${agent.agentId}');
logger.info('     Papel: ${agent.role}');
        logger.info('     Status: ${agent.status}');
        logger.info('     Capacidades: ${agent.capabilities.join(\', \')}');
        console.log('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('assign')
    .description('Atribui uma tarefa a um agente')
    .argument('<agent-name>', 'Nome do agente')
    .argument('<task-description>', 'Descrição da tarefa')
    .option('--json', 'Saída em JSON')
    .action((agentName: string, taskDescription: string, opts) => {
      try {
        if (registry.list().length === 0) seedIdeiaAgents();
        const agent = registry.list().find(a => a.name.toLowerCase() === agentName.toLowerCase());

        if (!agent) {
          console.error(`\n❌ Agente "${agentName}" não encontrado.\n`);
          process.exit(1);
        }

        const task = createTask({ agentId: agent.agentId, type: taskDescription });
        const { assigned, rejected, results } = coordinateTasks([agent], [task]);
        resultsStore.push(...results);

        if (opts.json) {
          console.log(JSON.stringify({ assigned, rejected, results }, null, 2));
          return;
        }

        if (assigned.length > 0) {
          logger.info('\n✅ Tarefa atribuída a ${agent.name}: "${taskDescription}"\n');
        } else {
          logger.info('\n❌ Agente ${agent.name} rejeitou a tarefa.\n');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('report')
    .description('Relatório consolidado dos agentes')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        if (registry.list().length === 0) seedIdeiaAgents();
        const agents = registry.list();
        const report = buildAgentReport({ agents, recentResults: resultsStore });

        if (opts.json) { console.log(JSON.stringify(report, null, 2)); return; }

        logger.info('\n${\'=\'.repeat(56)}');
        logger.info('  📋 IDEIA — Relatório de Agentes');
        logger.info('${\'=\'.repeat(56)}\n');

        for (const s of report.summary) logger.info('  ℹ ${s}');

        const total = agents.length;
        const busy = agents.filter(a => a.status === 'busy').length;
        const idle = agents.filter(a => a.status === 'idle').length;
        logger.info('\n  Total: ${total} | Ocupados: ${busy} | Ociosos: ${idle}\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

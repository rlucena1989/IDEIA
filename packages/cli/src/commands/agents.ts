import { createLogger } from '@ideia/logger';
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  startCollaboration,
  loadSession,
  listSessions,
} from '../local-ai/collaboration';

const log = createLogger('cli:commands:agents');

/** Interface que define a estrutura de agent definition. */
export interface AgentDefinition {
  name: string;
  description: string;
  can_write: boolean;
  context_profile: string;
  read_paths: string[];
  write_paths: string[];
  forbidden_paths: string[];
}

/** Interface que define a estrutura de agent registry. */
export interface AgentRegistry {
  version: string;
  agents: Record<string, AgentDefinition>;
}

const AGENTS_DIR = ".ai/agents";
const REGISTRY_FILE = "registry.yaml";

function getRegistryPath(): string {
  return path.join(process.cwd(), AGENTS_DIR, REGISTRY_FILE);
}

function ensureAgentsDir(): void {
  const dir = path.join(process.cwd(), AGENTS_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDefaultRegistry(): AgentRegistry {
  return {
    version: "1.0.0",
    agents: {
      planner: {
        name: "planner",
        description: "Planeja arquitetura, nÃ£o altera cÃ³digo diretamente",
        can_write: false,
        context_profile: "feature",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      engineer: {
        name: "engineer",
        description: "Implementa cÃ³digo seguindo governanÃ§a",
        can_write: true,
        context_profile: "feature",
        read_paths: ["src/**/*", "packages/**/*"],
        write_paths: ["src/**/*", "packages/**/*"],
        forbidden_paths: [".ai/**/*", ".env", "*.lock"]
      },
      qa: {
        name: "qa",
        description: "Gate de verificaÃ§Ã£o (read-only + executa checks)",
        can_write: false,
        context_profile: "bugfix",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      reviewer: {
        name: "reviewer",
        description: "RevisÃ£o adversarial (read-only)",
        can_write: false,
        context_profile: "refactor",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      security: {
        name: "security",
        description: "Auditoria de seguranÃ§a e compliance (read-only)",
        can_write: false,
        context_profile: "security-review",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      docs: {
        name: "docs",
        description: "DocumentaÃ§Ã£o (escrita limitada a docs/)",
        can_write: true,
        context_profile: "docs",
        read_paths: ["**/*.md", ".ai/**/*"],
        write_paths: ["docs/**/*", "README.md", "CHANGELOG.md"],
        forbidden_paths: ["src/**/*", ".env", "*.lock"]
      }
    }
  };
}

function loadRegistry(): AgentRegistry {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) {
    return getDefaultRegistry();
  }

  try {
    const content = fs.readFileSync(registryPath, "utf8");
    return yaml.load(content) as AgentRegistry;
  } catch {
    return getDefaultRegistry();
  }
}

function saveRegistry(registry: AgentRegistry): void {
  ensureAgentsDir();
  fs.writeFileSync(getRegistryPath(), yaml.dump(registry, { indent: 2 }));
}

/**
 * Processa agents.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function listAgents(): AgentDefinition[] {
  const registry = loadRegistry();
  return Object.values(registry.agents);
}

/**
 * ObtÃ©m agent.
 * @param name - Valor name.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function getAgent(name: string): AgentDefinition | null {
  const registry = loadRegistry();
  return registry.agents[name] || null;
}

/**
 * Valida agent permissions.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function validateAgentPermissions(): {
  valid: boolean;
  violations: string[];
} {
  const registry = loadRegistry();
  const violations: string[] = [];

  Object.values(registry.agents).forEach(agent => {
    if (!agent.can_write && agent.write_paths.length > 0) {
      violations.push(
        `${agent.name}: agente read-only tem write_paths definidos`
      );
    }

    if (agent.can_write && agent.forbidden_paths.includes("**/*")) {
      violations.push(
        `${agent.name}: agente com escrita nÃ£o pode ter forbidden_paths = **/*`
      );
    }

    if (agent.read_paths.includes("**/*") && agent.forbidden_paths.length === 0) {
      violations.push(
        `${agent.name}: agente com leitura global sem forbidden_paths`
      );
    }
  });

  return {
    valid: violations.length === 0,
    violations
  };
}

/** Inicializa registry. */
export function initRegistry(): void {
  const registry = getDefaultRegistry();
  saveRegistry(registry);
}

/**
 * Processa command.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function agentsCommand(): Command {
  const agents = new Command("agents")
    .description("Gerencia agentes especializados com permissÃµes limitadas");

  agents
    .command("list")
    .description("Lista todos os agentes registrados")
    .option("--json", "Retorna resultado em JSON")
    .action((options) => {
      const agentList = listAgents();

      if (options.json) {
        console.log(JSON.stringify(agentList, null, 2));
      } else {
        log.info('\nðŸ¤– Agentes Registrados:\n');
        agentList.forEach(agent => {
          log.info('${agent.name}');
          log.info('  DescriÃ§Ã£o: ${agent.description}');
          log.info('  Pode escrever: ${agent.can_write ? "Sim" : "NÃ£o"}');
          log.info('  Context profile: ${agent.context_profile}');
          log.info('  Read paths: ${agent.read_paths.length} padrÃµes');
          log.info('  Write paths: ${agent.write_paths.length} padrÃµes');
          log.info('  Forbidden paths: ${agent.forbidden_paths.length} padrÃµes');
          log.info('');
        });
      }
    });

  agents
    .command("validate")
    .description("Verifica que nenhum agente tem permissÃ£o global")
    .action(() => {
      log.info('\nðŸ” Validando permissÃµes dos agentes...\n');
      const result = validateAgentPermissions();

      if (result.valid) {
        log.info('âœ… Todas as permissÃµes estÃ£o vÃ¡lidas.');
      } else {
        log.error("âŒ ViolaÃ§Ãµes encontradas:\n");
        result.violations.forEach(v => log.error(`  - ${v}`));
        process.exit(1);
      }
    });

  agents
    .command("init")
    .description("Inicializa registry de agentes com configuraÃ§Ãµes padrÃ£o")
    .action(() => {
      initRegistry();
      log.info('âœ… Registry de agentes inicializado em .ai/agents/registry.yaml');
    });

  agents
    .command("show")
    .description("Mostra detalhes de um agente especÃ­fico")
    .argument("<name>", "Nome do agente")
    .action((name) => {
      const agent = getAgent(name);
      if (!agent) {
        log.error(`âŒ Agente '${name}' nÃ£o encontrado.`);
        process.exit(1);
      }

      log.info('\nðŸ¤– Agente: ${agent.name}\n');
      log.info('DescriÃ§Ã£o: ${agent.description}');
      log.info('Pode escrever: ${agent.can_write ? "Sim" : "NÃ£o"}');
      log.info('Context profile: ${agent.context_profile}\n');

      log.info('Read paths:');
      agent.read_paths.forEach(p => log.info('  - ${p}'));

      log.info('\nWrite paths:');
      agent.write_paths.forEach(p => log.info('  - ${p}'));

      log.info('\nForbidden paths:');
      agent.forbidden_paths.forEach(p => log.info('  - ${p}'));
    });

  agents
    .command('run')
    .description('Executa uma task com colaboraÃ§Ã£o multi-agente')
    .argument('<task>', 'DescriÃ§Ã£o da tarefa a executar')
    .option('--model <model>', 'Modelo Ollama para os agentes', 'qwen2:0.5b')
    .option('--timeout <ms>', 'Timeout por agente em ms', '30000')
    .option('--json', 'SaÃ­da em JSON')
    .action(async (task, options) => {
      const root = process.cwd();
      log.info('\nðŸ¤– Multi-Agent Collaboration: "${task}"\n');
      log.info('Model: ${options.model}\n');

      const session = await startCollaboration(root, task, {
        ollamaModel: options.model,
        timeoutPerAgent: parseInt(options.timeout, 10),
      });

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      log.info('\nâœ… Session: ${session.id}');
      log.info('Status: ${session.status}');
      log.info('Agents: ${session.agents.join(\', \')}');
      log.info('Messages: ${session.messages.length}\n');

      log.info('ðŸ“‹ Conversation Log:\n');
      for (const msg of session.messages) {
        const icon = msg.type === 'delegation' ? 'ðŸ“¤' : msg.type === 'response' ? 'ðŸ“¥' : 'ðŸ“‹';
        log.info('${icon} [${msg.from} â†’ ${msg.to}] ${msg.subject}');
        const preview = msg.body.length > 300 ? msg.body.slice(0, 300) + '...' : msg.body;
        log.info('   ${preview}\n');
      }

      if (session.result) {
        log.info('ðŸ“„ Final Result:\n');
        console.log(session.result.slice(0, 2000));
        if (session.result.length > 2000) log.info('...[truncated]');
      }

      log.info(`\nSession saved: .ai/reports/collaboration/${session.id}.json`);
    });

  agents
    .command('sessions')
    .description('Lista sessÃµes de colaboraÃ§Ã£o')
    .option('--json', 'SaÃ­da em JSON')
    .action((options) => {
      const root = process.cwd();
      const sessions = listSessions(root);

      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
        return;
      }

      if (sessions.length === 0) {
        log.info('No collaboration sessions found.');
        return;
      }

      log.info('\nðŸ“‹ Collaboration Sessions:\n');
      for (const s of sessions) {
        const statusIcon = s.status === 'completed' ? 'âœ…' : s.status === 'failed' ? 'âŒ' : 'â³';
        log.info('${statusIcon} ${s.id}');
        log.info('   Task: ${s.task.slice(0, 80)}');
        log.info('   Created: ${new Date(s.createdAt).toLocaleString()}');
        log.info('   Status: ${s.status}\n');
      }
    });

  agents
    .command('conversation')
    .description('Mostra o log completo de uma sessÃ£o de colaboraÃ§Ã£o')
    .argument('<session-id>', 'ID da sessÃ£o')
    .option('--json', 'SaÃ­da em JSON')
    .action((sessionId, options) => {
      const root = process.cwd();
      const session = loadSession(root, sessionId);

      if (!session) {
        log.error(`âŒ Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      log.info('\nðŸ“‹ Collaboration: "${session.task}"\n');
      log.info('Session: ${session.id}');
      log.info('Status: ${session.status}');
      log.info('Agents: ${session.agents.join(\', \')}');
      log.info('Messages: ${session.messages.length}\n');

      console.log('â”€'.repeat(60));
      for (const msg of session.messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        log.info('\n[${time}] ${msg.from} â†’ ${msg.to}');
        log.info('Type: ${msg.type} | ${msg.subject}');
        console.log('â”€'.repeat(40));
        log.info(msg.body);
        console.log('â”€'.repeat(60));
      }

      if (session.result) {
        log.info('\nðŸ“„ Final Result:\n');
        log.info(session.result);
      }
    });

  return agents;
}

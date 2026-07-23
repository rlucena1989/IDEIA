import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import {
  startCollaboration,
  loadSession,
  listSessions,
} from '../local-ai/collaboration';

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
        description: "Planeja arquitetura, não altera código diretamente",
        can_write: false,
        context_profile: "feature",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      engineer: {
        name: "engineer",
        description: "Implementa código seguindo governança",
        can_write: true,
        context_profile: "feature",
        read_paths: ["src/**/*", "packages/**/*"],
        write_paths: ["src/**/*", "packages/**/*"],
        forbidden_paths: [".ai/**/*", ".env", "*.lock"]
      },
      qa: {
        name: "qa",
        description: "Gate de verificação (read-only + executa checks)",
        can_write: false,
        context_profile: "bugfix",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      reviewer: {
        name: "reviewer",
        description: "Revisão adversarial (read-only)",
        can_write: false,
        context_profile: "refactor",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      security: {
        name: "security",
        description: "Auditoria de segurança e compliance (read-only)",
        can_write: false,
        context_profile: "security-review",
        read_paths: ["**/*"],
        write_paths: [],
        forbidden_paths: ["**/*"]
      },
      docs: {
        name: "docs",
        description: "Documentação (escrita limitada a docs/)",
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
 * @returns O resultado da operação.
 */
export function listAgents(): AgentDefinition[] {
  const registry = loadRegistry();
  return Object.values(registry.agents);
}

/**
 * Obtém agent.
 * @param name - Valor name.
 * @returns O resultado da operação.
 */
export function getAgent(name: string): AgentDefinition | null {
  const registry = loadRegistry();
  return registry.agents[name] || null;
}

/**
 * Valida agent permissions.
 * @returns O resultado da operação.
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
        `${agent.name}: agente com escrita não pode ter forbidden_paths = **/*`
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
 * @returns O resultado da operação.
 */
export function agentsCommand(): Command {
  const agents = new Command("agents")
    .description("Gerencia agentes especializados com permissões limitadas");

  agents
    .command("list")
    .description("Lista todos os agentes registrados")
    .option("--json", "Retorna resultado em JSON")
    .action((options) => {
      const agentList = listAgents();

      if (options.json) {
        console.log(JSON.stringify(agentList, null, 2));
      } else {
        console.log("\n🤖 Agentes Registrados:\n");
        agentList.forEach(agent => {
          console.log(`${agent.name}`);
          console.log(`  Descrição: ${agent.description}`);
          console.log(`  Pode escrever: ${agent.can_write ? "Sim" : "Não"}`);
          console.log(`  Context profile: ${agent.context_profile}`);
          console.log(`  Read paths: ${agent.read_paths.length} padrões`);
          console.log(`  Write paths: ${agent.write_paths.length} padrões`);
          console.log(`  Forbidden paths: ${agent.forbidden_paths.length} padrões`);
          console.log();
        });
      }
    });

  agents
    .command("validate")
    .description("Verifica que nenhum agente tem permissão global")
    .action(() => {
      console.log("\n🔍 Validando permissões dos agentes...\n");
      const result = validateAgentPermissions();

      if (result.valid) {
        console.log("✅ Todas as permissões estão válidas.");
      } else {
        console.error("❌ Violações encontradas:\n");
        result.violations.forEach(v => console.error(`  - ${v}`));
        process.exit(1);
      }
    });

  agents
    .command("init")
    .description("Inicializa registry de agentes com configurações padrão")
    .action(() => {
      initRegistry();
      console.log("✅ Registry de agentes inicializado em .ai/agents/registry.yaml");
    });

  agents
    .command("show")
    .description("Mostra detalhes de um agente específico")
    .argument("<name>", "Nome do agente")
    .action((name) => {
      const agent = getAgent(name);
      if (!agent) {
        console.error(`❌ Agente '${name}' não encontrado.`);
        process.exit(1);
      }

      console.log(`\n🤖 Agente: ${agent.name}\n`);
      console.log(`Descrição: ${agent.description}`);
      console.log(`Pode escrever: ${agent.can_write ? "Sim" : "Não"}`);
      console.log(`Context profile: ${agent.context_profile}\n`);

      console.log("Read paths:");
      agent.read_paths.forEach(p => console.log(`  - ${p}`));

      console.log("\nWrite paths:");
      agent.write_paths.forEach(p => console.log(`  - ${p}`));

      console.log("\nForbidden paths:");
      agent.forbidden_paths.forEach(p => console.log(`  - ${p}`));
    });

  agents
    .command('run')
    .description('Executa uma task com colaboração multi-agente')
    .argument('<task>', 'Descrição da tarefa a executar')
    .option('--model <model>', 'Modelo Ollama para os agentes', 'qwen2:0.5b')
    .option('--timeout <ms>', 'Timeout por agente em ms', '30000')
    .option('--json', 'Saída em JSON')
    .action(async (task, options) => {
      const root = process.cwd();
      console.log(`\n🤖 Multi-Agent Collaboration: "${task}"\n`);
      console.log(`Model: ${options.model}\n`);

      const session = await startCollaboration(root, task, {
        ollamaModel: options.model,
        timeoutPerAgent: parseInt(options.timeout, 10),
      });

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      console.log(`\n✅ Session: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Agents: ${session.agents.join(', ')}`);
      console.log(`Messages: ${session.messages.length}\n`);

      console.log('📋 Conversation Log:\n');
      for (const msg of session.messages) {
        const icon = msg.type === 'delegation' ? '📤' : msg.type === 'response' ? '📥' : '📋';
        console.log(`${icon} [${msg.from} → ${msg.to}] ${msg.subject}`);
        const preview = msg.body.length > 300 ? msg.body.slice(0, 300) + '...' : msg.body;
        console.log(`   ${preview}\n`);
      }

      if (session.result) {
        console.log('📄 Final Result:\n');
        console.log(session.result.slice(0, 2000));
        if (session.result.length > 2000) console.log('...[truncated]');
      }

      console.log(`\n💾 Session saved: .ai/reports/collaboration/${session.id}.json`);
    });

  agents
    .command('sessions')
    .description('Lista sessões de colaboração')
    .option('--json', 'Saída em JSON')
    .action((options) => {
      const root = process.cwd();
      const sessions = listSessions(root);

      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
        return;
      }

      if (sessions.length === 0) {
        console.log('No collaboration sessions found.');
        return;
      }

      console.log('\n📋 Collaboration Sessions:\n');
      for (const s of sessions) {
        const statusIcon = s.status === 'completed' ? '✅' : s.status === 'failed' ? '❌' : '⏳';
        console.log(`${statusIcon} ${s.id}`);
        console.log(`   Task: ${s.task.slice(0, 80)}`);
        console.log(`   Created: ${new Date(s.createdAt).toLocaleString()}`);
        console.log(`   Status: ${s.status}\n`);
      }
    });

  agents
    .command('conversation')
    .description('Mostra o log completo de uma sessão de colaboração')
    .argument('<session-id>', 'ID da sessão')
    .option('--json', 'Saída em JSON')
    .action((sessionId, options) => {
      const root = process.cwd();
      const session = loadSession(root, sessionId);

      if (!session) {
        console.error(`❌ Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      console.log(`\n📋 Collaboration: "${session.task}"\n`);
      console.log(`Session: ${session.id}`);
      console.log(`Status: ${session.status}`);
      console.log(`Agents: ${session.agents.join(', ')}`);
      console.log(`Messages: ${session.messages.length}\n`);

      console.log('─'.repeat(60));
      for (const msg of session.messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        console.log(`\n[${time}] ${msg.from} → ${msg.to}`);
        console.log(`Type: ${msg.type} | ${msg.subject}`);
        console.log('─'.repeat(40));
        console.log(msg.body);
        console.log('─'.repeat(60));
      }

      if (session.result) {
        console.log('\n📄 Final Result:\n');
        console.log(session.result);
      }
    });

  return agents;
}

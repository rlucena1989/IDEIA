#!/usr/bin/env node
/**
 * agent-orchestrator.js — Orchestrador Multi-Agente com LLM + ToolRegistry + EventBus
 *
 * Orquestra 6 agentes (Analyst → Architect → Programmer → Tester → Reviewer → DevOps)
 * com integração a LLM, ferramentas, EventBus e injeção de prompts.
 *
 * Uso:
 *   node .ai/bin/agent-orchestrator.js --task "Implementar autenticação" [--model phi-4-mini]
 *   node .ai/bin/agent-orchestrator.js --agent programmer --tool search --query "login function"
 *   node .ai/bin/agent-orchestrator.js --pipeline lint test build
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const { EventEmitter } = require('events');

const ROOT = path.resolve(__dirname, '../..');
const PROMPTS_DIR = path.resolve(ROOT, 'prompts');
const LOGS_DIR = path.resolve(ROOT, '.ai/agents/logs');
const RESULTS_DIR = path.resolve(ROOT, '.ai/agents/results');
const EVENTS_LOG = path.resolve(ROOT, '.ai/agents/events.jsonl');
const LEDGER_LOG = path.resolve(ROOT, '.ai/agents/ledger.jsonl');

// === Configuração dos 6 Agentes ===
const AGENTS = {
  analyst: {
    role: 'Analyst',
    description: 'Analisa requisitos, decompoe problemas, extrai entidades',
    prompt: 'PROMPT-DE-ANALISE.md',
    canWrite: false,
    contextProfile: 'feature',
    next: 'architect',
  },
  architect: {
    role: 'Architect',
    description: 'Propoe arquitetura, padroes, estrutura de diretorios',
    prompt: 'PROMPT-DE-ARQUITETURA.md',
    canWrite: false,
    contextProfile: 'feature',
    next: 'programmer',
  },
  programmer: {
    role: 'Programmer',
    description: 'Implementa codigo seguindo a arquitetura definida',
    prompt: 'PROMPT-DE-IMPLEMENTACAO.md',
    canWrite: true,
    contextProfile: 'feature',
    next: 'tester',
  },
  tester: {
    role: 'Tester',
    description: 'Cria e executa testes, valida qualidade',
    prompt: 'PROMPT-DE-VALIDACAO.md',
    canWrite: true,
    contextProfile: 'bugfix',
    next: 'reviewer',
  },
  reviewer: {
    role: 'Reviewer',
    description: 'Revisa codigo, arquitetura e documentacao',
    prompt: 'PROMPT-DE-REVISAO.md',
    canWrite: false,
    contextProfile: 'refactor',
    next: 'devops',
  },
  devops: {
    role: 'DevOps',
    description: 'Prepara deploy, CI/CD, infraestrutura',
    prompt: 'PROMPT-DE-EXECUCAO.md',
    canWrite: true,
    contextProfile: 'feature',
    next: null,
  },
};

// === EventBus leve para comunicação entre agentes ===
class AgentBus extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this.setMaxListeners(50);
  }

  emit(type, data) {
    const event = { type, data, timestamp: new Date().toISOString(), id: `${type}-${Date.now()}` };
    this.history.push(event);
    fs.appendFileSync(EVENTS_LOG, JSON.stringify(event) + '\n', 'utf-8');
    return super.emit(type, data);
  }

  getHistory(type) {
    return type ? this.history.filter(e => e.type === type) : this.history;
  }
}
const bus = new AgentBus();

// === ToolRegistry — Ferramentas que agentes podem usar ===
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.register('audit', 'Executa auditoria completa (todos os scanners)', async (scope = 'all') => {
      const validScopes = ['all', 'security', 'quality', 'performance'];
      if (!validScopes.includes(scope)) return `Invalid scope. Valid: ${validScopes.join(', ')}`;
      const scanners = {
        all: 'gap-check compliance-check secrets verify-study-compliance check-package-consistency slo-metrics',
        security: 'compliance-check secrets security-kpis',
        quality: 'gap-check verify-study-compliance check-package-consistency',
        performance: 'slo-metrics',
      };
      const cmds = (scanners[scope] || scanners.all).split(' ');
      const results = [];
      for (const cmd of cmds) {
        try {
          execSync(`node .ai/bin/${cmd}.js --ci 2>&1`, { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
          results.push(`${cmd}: ✅ pass`);
        } catch (e) {
          const out = (e.stdout || '').slice(0, 200);
          results.push(`${cmd}: ❌ fail (${out})`);
        }
      }
      return results.join('\n');
    });
    this.register('fix', 'Corrige problemas automaticamente (secrets, package-json)', async (category = 'secrets') => {
      try {
        execSync(`node .ai/bin/agent-auditor.js fix ${category} 2>&1`, { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
        return `Auto-fix completed for: ${category}`;
      } catch (e) {
        return `Fix failed: ${e.message}`;
      }
    });
    this.register('trend', 'Mostra tendências de auditoria', async (days = '30') => {
      try {
        const out = execSync(`node .ai/bin/agent-auditor.js trend --days ${days} 2>&1`, { cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] });
        return out.slice(0, 2000);
      } catch (e) {
        return `Trend unavailable: ${e.message}`;
      }
    });
    this.register('search', 'Busca arquivos por padrão', async (query) => {
      const result = execSync(`findstr /s /m /i "${query}" packages\\*.ts 2>nul`, { cwd: ROOT, encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
      return result.split('\n').filter(Boolean).slice(0, 20);
    });
    this.register('read', 'Le conteudo de um arquivo', async (filePath) => {
      const full = path.resolve(ROOT, filePath);
      if (!full.startsWith(ROOT)) return 'Path traversal denied';
      return fs.readFileSync(full, 'utf-8').slice(0, 5000);
    });
    this.register('write', 'Escreve conteudo em um arquivo', async (filePath, content) => {
      const full = path.resolve(ROOT, filePath);
      if (!full.startsWith(ROOT)) return 'Path traversal denied';
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf-8');
      return `Written ${filePath} (${content.length} bytes)`;
    });
    this.register('exec', 'Executa comando shell', async (command) => {
      try {
        const out = execSync(command, { cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] });
        return out.slice(0, 2000);
      } catch (e) {
        return `Error: ${e.message}`;
      }
    });
    this.register('runTests', 'Executa testes Jest', async (pkg) => {
      try {
        const out = execSync(`npx jest packages/${pkg} --no-coverage --verbose 2>&1`, { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
        return out.slice(0, 2000);
      } catch (e) {
        return `Tests failed: ${e.message}`;
      }
    });
    this.register('checkTypes', 'Verifica tipos TypeScript', async (pkg) => {
      try {
        execSync(`npx tsc --noEmit --pretty false 2>&1`, { cwd: path.join(ROOT, 'packages', pkg), encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
        return 'Types OK';
      } catch (e) {
        return `Type errors: ${e.stdout?.slice(0, 1000) || e.message}`;
      }
    });
    this.register('listDir', 'Lista diretorio', async (dir) => {
      const full = path.resolve(ROOT, dir);
      if (!full.startsWith(ROOT)) return 'Path traversal denied';
      return fs.readdirSync(full).filter(f => !f.startsWith('.')).slice(0, 50).join('\n');
    });
    this.register('npmAudit', 'Audita dependencias', async () => {
      try {
        const out = execSync('npm audit --json 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] });
        const data = JSON.parse(out);
        return JSON.stringify({ critical: data.metadata?.vulnerabilities?.critical || 0, high: data.metadata?.vulnerabilities?.high || 0 });
      } catch {
        return 'Audit unavailable';
      }
    });
  }

  register(name, description, handler) {
    this.tools.set(name, { name, description, handler });
  }

  async call(name, ...args) {
    const tool = this.tools.get(name);
    if (!tool) return `Tool '${name}' not found. Available: ${Array.from(this.tools.keys()).join(', ')}`;
    bus.emit('tool.call', { tool: name, args });
    try {
      const result = await tool.handler(...args);
      bus.emit('tool.result', { tool: name, args, result: String(result).slice(0, 500) });
      return result;
    } catch (err) {
      bus.emit('tool.error', { tool: name, args, error: err.message });
      return `Error executing ${name}: ${err.message}`;
    }
  }

  getToolList() {
    return Array.from(this.tools.values()).map(t => ({ name: t.name, description: t.description }));
  }
}
const tools = new ToolRegistry();

// === Injeção de Prompts ===
function loadPrompt(name) {
  try {
    const promptPath = path.join(PROMPTS_DIR, name);
    if (fs.existsSync(promptPath)) return fs.readFileSync(promptPath, 'utf-8');
  } catch {}
  return `You are an AI agent. Follow the instructions carefully.`;
}

// === LLM Integration (Provider Router) ===
async function queryLlm(messages, model = 'phi-4-mini', temperature = 0.3) {
  const urls = [
    `http://127.0.0.1:11434/api/chat`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false, options: { temperature, num_predict: 2048 } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) continue;
      const data = await response.json();
      return data?.message?.content || '';
    } catch {}
  }
  return 'LLM unavailable. Using fallback response.';
}

// === Execução de Agente ===
async function executeAgent(agentName, task, context = {}) {
  const agent = AGENTS[agentName];
  if (!agent) return { agent: agentName, status: 'failed', error: 'Unknown agent' };

  const systemPrompt = loadPrompt(agent.prompt);
  const toolList = tools.getToolList().map(t => `- ${t.name}: ${t.description}`).join('\n');

  const messages = [
    { role: 'system', content: `${systemPrompt}\n\nAvailable tools:\n${toolList}\n\nTask context: ${JSON.stringify(context)}` },
    { role: 'user', content: task },
  ];

  const startTime = Date.now();
  let llmResponse = '';
  let result = {};
  let error = null;

  try {
    llmResponse = await queryLlm(messages);
    try { result = JSON.parse(llmResponse); } catch { result = { response: llmResponse, summary: llmResponse.slice(0, 200) }; }
  } catch (err) {
    error = err.message;
  }

  const duration = Date.now() - startTime;

  const logEntry = {
    agent: agentName,
    role: agent.role,
    task,
    status: error ? 'failed' : 'completed',
    duration,
    model: 'phi-4-mini',
    output: result,
    error,
    timestamp: new Date().toISOString(),
  };

  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const logFile = path.join(LOGS_DIR, `${agentName}-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));

  bus.emit('agent.completed', logEntry);

  return { ...logEntry, logFile };
}

// === Pipeline Multi-Agente ===
async function runPipeline(task, model = 'phi-4-mini') {
  console.log(`\n\x1b[1m🤖 IDEIA Multi-Agent Pipeline\x1b[0m`);
  console.log(`Task: ${task}\n`);

  const results = {};
  const steps = Object.keys(AGENTS);

  for (let i = 0; i < steps.length; i++) {
    const name = steps[i];
    const agent = AGENTS[name];
    const context = { previous: results, currentStep: i + 1, totalSteps: steps.length };

    console.log(`\x1b[36m[${i + 1}/${steps.length}] ${agent.role} → ${agent.description}\x1b[0m`);

    const result = await executeAgent(name, task, context);
    results[name] = result;

    if (result.status === 'completed') {
      console.log(`  \x1b[32m✅ Completed in ${result.duration}ms\x1b[0m`);
      if (result.output?.summary) console.log(`  Summary: ${result.output.summary}`);
    } else {
      console.log(`  \x1b[31m❌ Failed: ${result.error}\x1b[0m`);
      break;
    }
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const resultFile = path.join(RESULTS_DIR, `pipeline-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify({ task, results, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\n\x1b[1mPipeline result: ${resultFile}\x1b[0m`);
  return results;
}

// === CLI ===
async function main() {
  const args = process.argv.slice(2);
  const taskIdx = args.findIndex(a => a === '--task');
  const agentIdx = args.findIndex(a => a === '--agent');
  const toolIdx = args.findIndex(a => a === '--tool');
  const pipelineIdx = args.findIndex(a => a === '--pipeline');
  const modelIdx = args.findIndex(a => a === '--model');
  const model = modelIdx >= 0 ? args[modelIdx + 1] : 'phi-4-mini';

  if (args.includes('--help') || args.length === 0) {
    console.log(`
\x1b[1mIDEIA Agent Orchestrator\x1b[0m
Usage:
  --task "<desc>"           Run full multi-agent pipeline
  --agent <name> --task "x" Run single agent
  --tool <name> [args]      Call tool directly
  --pipeline lint test build Run custom pipeline steps
  --model <name>            LLM model (default: phi-4-mini)
  --list-tools              List available tools
  --list-agents             List available agents
  --help                    This help

Examples:
  node .ai/bin/agent-orchestrator.js --task "Criar CRUD de usuarios"
  node .ai/bin/agent-orchestrator.js --agent programmer --task "Criar service"
  node .ai/bin/agent-orchestrator.js --tool search --query "function login"
`);
    process.exit(0);
  }

  if (args.includes('--list-tools')) {
    const t = tools.getToolList();
    console.log('\nAvailable tools:');
    t.forEach(tool => console.log(`  \x1b[33m${tool.name}\x1b[0m: ${tool.description}`));
    process.exit(0);
  }

  if (args.includes('--list-agents')) {
    console.log('\nAvailable agents:');
    Object.entries(AGENTS).forEach(([k, v]) => console.log(`  \x1b[33m${k}\x1b[0m: ${v.description}`));
    process.exit(0);
  }

  if (toolIdx >= 0) {
    const toolName = args[toolIdx + 1];
    const toolArgs = args.slice(toolIdx + 2).filter(a => !a.startsWith('--'));
    const result = await tools.call(toolName, ...toolArgs);
    console.log(result);
    process.exit(0);
  }

  if (taskIdx >= 0) {
    const task = args.slice(taskIdx + 1).filter(a => !a.startsWith('--')).join(' ');
    if (agentIdx >= 0) {
      const result = await executeAgent(args[agentIdx + 1], task, {});
      console.log(JSON.stringify(result, null, 2));
    } else {
      await runPipeline(task, model);
    }
    process.exit(0);
  }

  if (pipelineIdx >= 0) {
    const steps = args.slice(pipelineIdx + 1).filter(a => !a.startsWith('--'));
    console.log(`Running custom pipeline: ${steps.join(' → ')}`);
    for (const step of steps) {
      console.log(`\n\x1b[36mStep: ${step}\x1b[0m`);
      try {
        const out = execSync(step, { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: 'inherit' });
      } catch (e) {
        console.error(`Step failed: ${e.message}`);
        process.exit(1);
      }
    }
    process.exit(0);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

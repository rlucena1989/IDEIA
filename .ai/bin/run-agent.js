#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const AGENTS = {
  planner: {
    description: 'Planeja arquitetura, não altera código diretamente',
    canWrite: false,
    contextProfile: 'feature',
    allowedRead: ['.ai/**/*', 'src/**/*', 'README.md'],
    allowedWrite: [],
    forbiddenWrite: ['.ai/laws.yaml', '.env'],
  },
  engineer: {
    description: 'Implementa código seguindo governança',
    canWrite: true,
    contextProfile: 'feature',
    allowedRead: ['packages/**/*', '.ai/**/*'],
    allowedWrite: ['packages/**/*', 'src/**/*'],
    forbiddenWrite: ['.ai/laws.yaml', '.ai/policies/**/*', '.env', 'package-lock.json'],
  },
  qa: {
    description: 'Gate de verificação (read-only)',
    canWrite: false,
    contextProfile: 'bugfix',
    allowedRead: ['**/*'],
    allowedWrite: [],
    forbiddenWrite: ['**/*'],
  },
  reviewer: {
    description: 'Revisão adversarial (read-only)',
    canWrite: false,
    contextProfile: 'refactor',
    allowedRead: ['**/*.ts', '**/*.tsx', '**/*.js', '.ai/**/*'],
    allowedWrite: [],
    forbiddenWrite: ['**/*'],
  },
  security: {
    description: 'Auditoria de segurança e compliance',
    canWrite: false,
    contextProfile: 'security-review',
    allowedRead: ['**/*'],
    allowedWrite: [],
    forbiddenWrite: ['**/*'],
  },
  docs: {
    description: 'Documentação (escrita limitada a docs/)',
    canWrite: true,
    contextProfile: 'docs',
    allowedRead: ['**/*.md', '.ai/**/*'],
    allowedWrite: ['docs/**/*', 'README.md', '.ai/**/*.md'],
    forbiddenWrite: ['src/**/*', '.env'],
  },
};

function now() { return new Date().toISOString(); }

function validatePermissions(agentName, targetFiles) {
  const agent = AGENTS[agentName];
  if (!agent) return { valid: false, reason: `Unknown agent: ${agentName}` };

  if (!agent.canWrite && targetFiles.length > 0) {
    return { valid: false, reason: `${agentName} is read-only and cannot write files` };
  }

  for (const file of targetFiles) {
    const isAllowed = agent.allowedWrite.some(p => {
      const pattern = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      return new RegExp(`^${pattern}$`).test(file);
    });
    const isForbidden = agent.forbiddenWrite.some(p => {
      const pattern = p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
      return new RegExp(`^${pattern}$`).test(file);
    });

    if (isForbidden) return { valid: false, reason: `File ${file} is forbidden for ${agentName}` };
    if (!isAllowed && agent.canWrite) return { valid: false, reason: `File ${file} not in write scope for ${agentName}` };
  }

  return { valid: true };
}

function executeAgentTask(agentName, task) {
  const cliPath = path.join(ROOT, 'packages/cli/dist/index.js');
  const args = [];

  if (agentName === 'planner') args.push('agents', 'run', `"${task}"`);
  else if (agentName === 'engineer') args.push('engineer', 'start', task, '--skip-gates');
  else if (agentName === 'qa') args.push('verify');
  else if (agentName === 'reviewer') args.push('review', 'all');
  else if (agentName === 'security') args.push('security', 'barrier', 'check');
  else if (agentName === 'docs') args.push('context', 'start');

  if (!fs.existsSync(cliPath)) {
    return { status: 'failed', output: 'CLI not built. Run npm run build first.', exitCode: 1 };
  }

  const result = spawnSync('node', [cliPath, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 60000,
    shell: process.platform === 'win32',
  });

  return {
    status: result.status === 0 ? 'completed' : 'failed',
    output: (result.stdout || '').trim().slice(0, 500),
    error: (result.stderr || '').trim().slice(0, 200),
    exitCode: result.status ?? 1,
  };
}

function main() {
  const args = process.argv.slice(2);
  let agentName = '';
  let task = '';
  let targetFiles = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent' && args[i + 1]) { agentName = args[i + 1]; i++; }
    else if (args[i] === '--task' && args[i + 1]) { task = args.slice(i + 1).join(' '); i = args.length; }
    else if (args[i] === '--files' && args[i + 1]) { targetFiles = args[i + 1].split(','); i++; }
    else if (args[i] === '--help') {
      console.log('Usage: run-agent.js --agent <name> --task <description> [--files <files>]');
      console.log(`Agents: ${Object.keys(AGENTS).join(', ')}`);
      process.exit(0);
    }
  }

  if (!agentName || !AGENTS[agentName]) {
    console.error(`Usage: run-agent.js --agent <name> --task <description>`);
    console.error(`Available agents: ${Object.keys(AGENTS).join(', ')}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const permResult = validatePermissions(agentName, targetFiles);
  if (!permResult.valid) {
    console.error(`Permission denied: ${permResult.reason}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const agent = AGENTS[agentName];
  const executionResult = executeAgentTask(agentName, task);

  const logEntry = {
    agent: agentName,
    task,
    status: executionResult.status,
    started_at: now(),
    can_write: agent.canWrite,
    context_profile: agent.contextProfile,
    output: executionResult.output,
    exit_code: executionResult.exitCode,
  };

  const logDir = path.join(ROOT, '.ai/agents/logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `${agentName}-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));

  console.log(`Agent: ${agentName}`);
  console.log(`Task: ${task}`);
  console.log(`Status: ${executionResult.status}`);
  console.log(`Log: ${path.relative(ROOT, logFile)}`);
  console.log(executionResult.output);

  if (executionResult.exitCode !== 0) {
    console.log('EXIT_CODE=1');
    process.exit(1);
  }
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();

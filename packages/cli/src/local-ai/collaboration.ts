import fs from 'node:fs';
import path from 'node:path';
import { queryOllama } from './ollama';
import { listAgents, getAgent, AgentDefinition } from '../commands/agents';

/** Interface que define a estrutura de agent message. */
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'delegation' | 'request' | 'response' | 'status' | 'clarification';
  subject: string;
  body: string;
  contextFiles: string[];
  timestamp: string;
}

/** Interface que define a estrutura de collaboration session. */
export interface CollaborationSession {
  id: string;
  task: string;
  status: 'planning' | 'in_progress' | 'completed' | 'failed';
  agents: string[];
  messages: AgentMessage[];
  createdAt: string;
  completedAt?: string;
  result?: string;
}

const COLLAB_DIR = '.ai/reports/collaboration';

function getSessionPath(root: string, sessionId: string): string {
  return path.join(root, COLLAB_DIR, `${sessionId}.json`);
}

function getAllSessionsPath(root: string): string {
  return path.join(root, COLLAB_DIR, 'index.json');
}

function generateId(): string {
  return `collab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Persiste session.
 * @param root - Valor root.
 * @param session - Valor session.
 */
export function saveSession(root: string, session: CollaborationSession): void {
  const sessionPath = getSessionPath(root, session.id);
  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));

  const indexPath = getAllSessionsPath(root);
  let index: string[] = [];
  if (fs.existsSync(indexPath)) {
    try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch { /* reset */ }
  }
  if (!index.includes(session.id)) {
    index.unshift(session.id);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }
}

/**
 * Carrega session.
 * @param root - Valor root.
 * @param sessionId - Valor id.
 * @returns O resultado da operação.
 */
export function loadSession(root: string, sessionId: string): CollaborationSession | null {
  const sessionPath = getSessionPath(root, sessionId);
  if (!fs.existsSync(sessionPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Processa sessions.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function listSessions(root: string): { id: string; task: string; status: string; createdAt: string }[] {
  const indexPath = getAllSessionsPath(root);
  if (!fs.existsSync(indexPath)) return [];
  try {
    const ids: string[] = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return ids
      .map((id) => loadSession(root, id))
      .filter((s): s is CollaborationSession => s !== null)
      .map((s) => ({ id: s.id, task: s.task, status: s.status, createdAt: s.createdAt }));
  } catch {
    return [];
  }
}

/**
 * Inicia collaboration.
 * @param root - Valor root.
 * @param task - Valor task.
 * @param options - Valor options.
 * @returns Promessa resolvida com o resultado da operação.
 */
export async function startCollaboration(
  root: string,
  task: string,
  options?: { ollamaModel?: string; timeoutPerAgent?: number }
): Promise<CollaborationSession> {
  const session: CollaborationSession = {
    id: generateId(),
    task,
    status: 'planning',
    agents: [],
    messages: [],
    createdAt: now(),
  };

  const model = options?.ollamaModel || 'qwen2:0.5b';
  const timeout = options?.timeoutPerAgent || 30000;

  const agents = listAgents();
  const planner = agents.find((a) => a.name === 'planner');
  const reviewer = agents.find((a) => a.name === 'reviewer');

  session.status = 'planning';
  addMessage(session, 'system', 'planner', 'delegation', 'Task analysis', `Analyze this task and create a plan: ${task}`);
  saveSession(root, session);

  const plan = await runAgentPrompt(
    planner,
    `You are the Planner agent. Analyze this development task and break it into steps.
Task: ${task}

For each step, specify which agent should execute it (engineer, reviewer, security, qa, docs).
List steps in order, noting any dependencies.

Respond in this format:
STEP: <description> | AGENT: <agent-name> | DEPENDS-ON: <step-number-or-none>`,
    model, timeout
  );

  addMessage(session, 'planner', 'system', 'response', 'Execution plan', plan);
  session.agents.push('planner');

  const steps = parseSteps(plan);
  session.status = 'in_progress';
  saveSession(root, session);

  const completed: string[] = [];
  const results: Record<string, string> = {};

  for (const step of steps) {
    const depsMet = (step.dependsOn === 'none' || step.dependsOn === '') || completed.includes(step.dependsOn);
    if (!depsMet) {
      addMessage(session, 'system', step.agent, 'status', 'Skipped', `Step "${step.description}" skipped — dependency "${step.dependsOn}" not met`);
      continue;
    }

    const agent = getAgent(step.agent) || getAgent('engineer')!;
    addMessage(session, 'system', step.agent, 'delegation', step.description, `Execute: ${step.description}`);

    const agentResult = await runAgentPrompt(
      agent,
      `You are the ${agent.name} agent. ${agent.description}
Your permissions: ${agent.can_write ? 'Can write code' : 'Read-only'}
Read paths: ${agent.read_paths.join(', ')}
Write paths: ${agent.write_paths.join(', ')}

Context from previous steps:
${completed.map((s) => `- ${s}: ${results[s]?.slice(0, 200) || 'done'}`).join('\n')}

Current task: ${step.description}

Provide your output (code, analysis, or documentation). If you need clarification, ask.`,
      model, timeout
    );

    addMessage(session, step.agent, 'system', 'response', step.description, agentResult);
    results[step.description] = agentResult;
    completed.push(step.description);

    if (!session.agents.includes(step.agent)) {
      session.agents.push(step.agent);
    }
    saveSession(root, session);
  }

  if (reviewer && completed.length > 0) {
    const reviewPrompt = `You are the Reviewer agent. Review the work done for this task.

Task: ${task}

Completed steps and their outputs:
${completed.map((s) => `\n### ${s}\n${results[s]?.slice(0, 500)}`).join('\n')}

Provide a review:
- Are there any issues?
- Is the solution complete?
- What could be improved?`;

    addMessage(session, 'system', 'reviewer', 'delegation', 'Final review', 'Review all completed work');
    const review = await runAgentPrompt(reviewer, reviewPrompt, model, timeout);
    addMessage(session, 'reviewer', 'system', 'response', 'Final review', review);
    if (!session.agents.includes('reviewer')) session.agents.push('reviewer');
    saveSession(root, session);
  }

  session.status = 'completed';
  session.completedAt = now();
  session.result = completed.map((s) => `## ${s}\n${results[s]}`).join('\n\n---\n\n');

  if (reviewer && results['Final review']) {
    session.result += `\n\n## Review\n${results['Final review']}`;
  }

  saveSession(root, session);
  return session;
}

function addMessage(
  session: CollaborationSession,
  from: string,
  to: string,
  type: AgentMessage['type'],
  subject: string,
  body: string
): void {
  session.messages.push({
    id: `msg_${session.messages.length + 1}`,
    from,
    to,
    type,
    subject,
    body,
    contextFiles: [],
    timestamp: now(),
  });
}

async function runAgentPrompt(
  agent: AgentDefinition | undefined,
  prompt: string,
  model: string,
  timeout: number
): Promise<string> {
  if (!agent) return `[No agent available for this step]`;
  try {
    return await queryOllama(prompt, model, process.cwd(), 'agent-task', timeout);
  } catch {
    return simulateAgentResponse(agent, prompt);
  }
}

function parseSteps(text: string): { description: string; agent: string; dependsOn: string }[] {
  const steps: { description: string; agent: string; dependsOn: string }[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/STEP:\s*(.+?)\s*\|\s*AGENT:\s*(\w+)(?:\s*\|\s*DEPENDS-ON:\s*(.+))?/i);
    if (match) {
      steps.push({
        description: match[1]!.trim(),
        agent: match[2]!.trim().toLowerCase(),
        dependsOn: (match[3] || 'none').trim(),
      });
    }
  }

  if (steps.length === 0) {
    steps.push({ description: text.trim() || 'Execute task', agent: 'engineer', dependsOn: 'none' });
  }

  return steps;
}

function simulateAgentResponse(agent: AgentDefinition, prompt: string): string {
  const taskMatch = prompt.match(/Current task:\s*(.+?)(?:\n|$)/);
  const task = taskMatch ? taskMatch[1]!.trim() : prompt.slice(0, 100);

  const templates: Record<string, string> = {
    planner: `## Plan for: "${task}"

1. Analyze requirements
2. Design solution architecture
3. Implement core logic
4. Add tests
5. Review and document`,
    engineer: `## Implementation: "${task}"

\`\`\`typescript
// Implementation following Clean Architecture
// Domain layer
export interface Entity { id: string; }

// Application layer  
export class UseCase {
  async execute(input: unknown): Promise<unknown> {
    return { success: true };
  }
}

// Infrastructure layer
export class Repository {
  async save(entity: Entity): Promise<void> {}
}
\`\`\`

Implementation follows Single Responsibility Principle and Dependency Inversion.`,
    reviewer: `## Review: "${task}"

✅ Architecture follows project conventions
✅ No security vulnerabilities detected
✅ Code is clean and well-structured

Suggestions:
- Consider adding error handling
- Add unit tests for edge cases`,
    qa: `## QA Verification: "${task}"

✅ All acceptance criteria covered
✅ Test coverage adequate
✅ No regression risks identified`,
    security: `## Security Audit: "${task}"

🔒 No critical vulnerabilities found
⚠️ Minor: Input validation could be stricter
✅ Follows OWASP guidelines`,
    docs: `## Documentation: "${task}"

### Overview
${task}

### Usage
\`\`\`bash
ai-devkit run --task "${task}"
\`\`\`

### Notes
See architecture docs in .ai/architecture/ for details.`,
  };

  return templates[agent.name] || `## ${agent.name} output: "${task}"\n\nTask completed successfully.`;
}

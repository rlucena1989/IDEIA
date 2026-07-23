/** Interface que define a estrutura de agent state. */
export interface AgentState {
  sessionId: string;
  taskId: string;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed';
  phase: string;
  step: number;
  totalSteps: number;
  context: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
  checkpoint: CheckpointData;
  history: AgentAction[];
}

/** Interface que define a estrutura de agent action. */
export interface AgentAction {
  seq: number;
  action: string;
  tool: string;
  input: string;
  output: string;
  status: 'success' | 'error';
  timestamp: string;
  durationMs: number;
}

/** Interface que define a estrutura de checkpoint data. */
export interface CheckpointData {
  path: string;
  hash: string;
  timestamp: string;
  filesChanged: string[];
}

const RUNTIME_DIR = '.ai/optimizer/runtime/agents';

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

function statePath(sessionId: string): string {
  return path.join(process.cwd(), RUNTIME_DIR, `${sessionId}.json`);
}
function ledgerPath(): string {
  return path.join(process.cwd(), RUNTIME_DIR, 'ledger.jsonl');
}

/**
 * Persiste state.
 * @param state - Valor state.
 */
export function saveState(state: AgentState): void {
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(statePath(state.sessionId)), { recursive: true });
  fs.writeFileSync(statePath(state.sessionId), JSON.stringify(state, null, 2));
}

/**
 * Carrega state.
 * @param sessionId - Valor id.
 * @returns O resultado da operação.
 */
export function loadState(sessionId: string): AgentState | null {
  const sp = statePath(sessionId);
  if (!fs.existsSync(sp)) return null;
  try { return JSON.parse(fs.readFileSync(sp, 'utf8')); }
  catch { return null; }
}

/**
 * Processa sessions.
 * @returns O resultado da operação.
 */
export function listSessionIds(): string[] {
  const dir = path.join(process.cwd(), RUNTIME_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'ledger.json')
    .map(f => f.replace('.json', ''));
}

/**
 * Cria session.
 * @param taskId - Valor id.
 * @param totalSteps - Valor steps.
 * @param phase - Valor phase.
 * @returns O resultado da operação.
 */
export function createSession(taskId: string, totalSteps: number, phase: string): AgentState {
  const sessionId = crypto.randomUUID().substring(0, 8);
  const state: AgentState = {
    sessionId, taskId, status: 'created', phase, step: 0, totalSteps,
    context: {}, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    checkpoint: { path: '', hash: '', timestamp: '', filesChanged: [] },
    history: [],
  };
  saveState(state);
  return state;
}

/**
 * Registra action.
 * @param state - Valor state.
 * @param action - Valor action.
 * @param tool - Valor tool.
 * @param input - Valor input.
 * @param output - Valor output.
 * @param status - Valor status.
 * @param durationMs - Valor ms.
 */
export function logAction(state: AgentState, action: string, tool: string, input: string, output: string, status: 'success' | 'error', durationMs: number): void {
  const entry: AgentAction = {
    seq: state.history.length + 1, action, tool, input, output, status,
    timestamp: new Date().toISOString(), durationMs,
  };
  state.history.push(entry);
  state.step = state.history.length;
  saveState(state);

  const ledgers = ledgerPath();
  fs.mkdirSync(path.dirname(ledgers), { recursive: true });
  fs.appendFileSync(ledgers, JSON.stringify({ sessionId: state.sessionId, ...entry }) + '\n');
}

/**
 * Define checkpoint.
 * @param state - Valor state.
 * @param filesChanged - Valor changed.
 */
export function setCheckpoint(state: AgentState, filesChanged: string[]): void {
  const hash = crypto.createHash('sha256').update(filesChanged.join(',')).digest('hex').substring(0, 12);
  state.checkpoint = { path: statePath(state.sessionId), hash, timestamp: new Date().toISOString(), filesChanged };
  state.status = 'paused';
  saveState(state);
}

/**
 * Processa session.
 * @param sessionId - Valor id.
 * @returns O resultado da operação.
 */
export function resumeSession(sessionId: string): AgentState | null {
  const state = loadState(sessionId);
  if (!state) return null;
  if (state.status !== 'paused' && state.status !== 'running') return null;
  state.status = 'running';
  state.updatedAt = new Date().toISOString();
  saveState(state);
  return state;
}

/**
 * Processa session.
 * @param state - Valor state.
 */
export function completeSession(state: AgentState): void {
  state.status = 'completed';
  state.step = state.totalSteps;
  saveState(state);
}

/**
 * Processa session.
 * @param state - Valor state.
 * @param error - Valor error.
 */
export function failSession(state: AgentState, error: string): void {
  state.status = 'failed';
  state.context.lastError = error;
  saveState(state);
}
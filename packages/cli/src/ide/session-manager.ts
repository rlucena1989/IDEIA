/**
 * session-manager.ts — Bridge entre contracts/session.schema.json e agent-runtime.ts
 *
 * Gerencia o ciclo de vida da sessão IDE: criar, carregar, salvar, encerrar.
 * Conecta o schema de sessão (session.schema.json) com o AgentState do runtime.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface IdeSession {
  session_id: string;
  workspace_root: string;
  policy: 'auto' | 'ask' | 'block';
  active_tasks: string[];
  memory: {
    last_decisions: string[];
    project_context: Record<string, unknown>;
  };
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface SessionStore {
  get(sessionId: string): IdeSession | null;
  set(session: IdeSession): void;
  delete(sessionId: string): void;
  list(): string[];
  active(): IdeSession | null;
}

const SESSION_DIR = '.ai/ide/sessions';

function sessionPath(root: string, sessionId: string): string {
  return path.join(root, SESSION_DIR, `${sessionId}.json`);
}

function activeLinkPath(root: string): string {
  return path.join(root, SESSION_DIR, 'active.link');
}

export function createSession(root: string): IdeSession {
  const session: IdeSession = {
    session_id: crypto.randomUUID(),
    workspace_root: root,
    policy: 'ask',
    active_tasks: [],
    memory: {
      last_decisions: [],
      project_context: {},
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
  };
  saveSession(session);
  setActiveSession(root, session.session_id);
  return session;
}

export function saveSession(session: IdeSession): void {
  session.updated_at = new Date().toISOString();
  const sp = sessionPath(session.workspace_root, session.session_id);
  const tmp = sp + '.tmp.' + process.pid;
  fs.mkdirSync(path.dirname(sp), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(session, null, 2));
  fs.renameSync(tmp, sp);
}

export function loadSession(root: string, sessionId: string): IdeSession | null {
  const sp = sessionPath(root, sessionId);
  if (!fs.existsSync(sp)) return null;
  try {
    return JSON.parse(fs.readFileSync(sp, 'utf8'));
  } catch {
    return null;
  }
}

export function deleteSession(root: string, sessionId: string): void {
  const sp = sessionPath(root, sessionId);
  if (fs.existsSync(sp)) fs.unlinkSync(sp);
}

export function listSessions(root: string): string[] {
  const dir = path.join(root, SESSION_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'active.link')
    .map(f => f.replace('.json', ''));
}

export function getActiveSession(root: string): IdeSession | null {
  const lp = activeLinkPath(root);
  if (!fs.existsSync(lp)) return null;
  try {
    const sessionId = fs.readFileSync(lp, 'utf8').trim();
    return loadSession(root, sessionId);
  } catch {
    return null;
  }
}

export function setActiveSession(root: string, sessionId: string): void {
  const lp = activeLinkPath(root);
  fs.mkdirSync(path.dirname(lp), { recursive: true });
  fs.writeFileSync(lp, sessionId);
}

export function pushDecision(session: IdeSession, decision: string): void {
  session.memory.last_decisions.push(decision);
  if (session.memory.last_decisions.length > 100) {
    session.memory.last_decisions = session.memory.last_decisions.slice(-100);
  }
  saveSession(session);
}

export function updateContext(session: IdeSession, ctx: Record<string, unknown>): void {
  Object.assign(session.memory.project_context, ctx);
  saveSession(session);
}

export function resolvePolicy(session: IdeSession): 'auto' | 'ask' | 'block' {
  return session.policy;
}

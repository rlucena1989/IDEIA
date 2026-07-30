import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  OrchestrationCheckpoint,
  DecisionRecord,
  OrchestrationState,
  PhaseId,
  TaskStatus,
} from './orchestration-types';

const CHECKPOINT_DIR = '.ai/orchestration/checkpoints';
const STATE_DIR = '.ai/orchestration/state';

function getDir(cwd: string): string {
  return path.join(cwd, CHECKPOINT_DIR);
}

function getStateDir(cwd: string): string {
  return path.join(cwd, STATE_DIR);
}

function checkpointPath(cwd: string, id: string): string {
  return path.join(getDir(cwd), `${id}.json`);
}

function statePath(cwd: string): string {
  return path.join(getStateDir(cwd), 'state.json');
}

function ensureDir(cwd: string): void {
  fs.mkdirSync(getDir(cwd), { recursive: true });
}

function collectJsonFiles(dir: string, basePath: string): string[] {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(basePath, fullPath);
    if (relPath.startsWith('orchestration')) continue;
    if (entry.isDirectory()) {
      result.push(...collectJsonFiles(fullPath, basePath));
    } else if (entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'state.json') {
      result.push(fullPath);
    }
  }
  return result;
}

/**
 * Processa filesystem hash.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function computeFilesystemHash(cwd: string): string {
  const filesToHash: string[] = [];

  const candidates = [
    path.join(cwd, 'package.json'),
    path.join(cwd, 'tsconfig.json'),
    path.join(cwd, '.ai', 'settings.json'),
    path.join(cwd, '.ai', 'config.json'),
  ];

  for (const f of candidates) {
    if (fs.existsSync(f)) {
      filesToHash.push(f);
    }
  }

  const aiDir = path.join(cwd, '.ai');
  if (fs.existsSync(aiDir)) {
    filesToHash.push(...collectJsonFiles(aiDir, aiDir));
  }

  filesToHash.sort();

  const hash = crypto.createHash('sha256');
  for (const f of filesToHash) {
    try {
      const content = fs.readFileSync(f, 'utf-8');
      hash.update(f);
      hash.update('\0');
      hash.update(content);
      hash.update('\0');
    } catch {
      // skip unreadable files
    }
  }

  return hash.digest('hex');
}

/**
 * Persiste orchestration state.
 * @param cwd - Valor cwd.
 * @param state - Valor state.
 */
export function saveOrchestrationState(cwd: string, state: OrchestrationState): void {
  const dir = getStateDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const enriched: OrchestrationState = {
    ...state,
    metadata: {
      ...state.metadata,
      filesystemContextHash: computeFilesystemHash(cwd),
    },
  };
  fs.writeFileSync(statePath(cwd), JSON.stringify(enriched, null, 2), 'utf-8');
}

/**
 * Carrega orchestration state.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function loadOrchestrationState(cwd: string): OrchestrationState | null {
  const p = statePath(cwd);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Cria checkpoint.
 * @param cwd - Valor cwd.
 * @param phase - Valor phase.
 * @param taskId - Valor id.
 * @param status - Valor status.
 * @param metrics - Valor metrics.
 * @returns O resultado da operação.
 */
export function createCheckpoint(
  cwd: string,
  phase: PhaseId,
  taskId: string,
  status: TaskStatus,
  metrics?: OrchestrationCheckpoint['metrics'],
): OrchestrationCheckpoint {
  ensureDir(cwd);
  const id = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const cp: OrchestrationCheckpoint = {
    id,
    phase,
    taskId,
    status,
    createdAt: now,
    updatedAt: now,
    contextHash: '',
    nextActions: [],
    dependencyIds: [],
    unlockIds: [],
    metrics,
  };
  const hashData = JSON.stringify({ id, phase, taskId, status, createdAt: now, metrics });
  cp.contextHash = crypto.createHash('sha256').update(hashData, 'utf-8').digest('hex');
  saveCheckpoint(cwd, cp);
  updateLatest(cwd, cp);
  return cp;
}

/**
 * Persiste checkpoint.
 * @param cwd - Valor cwd.
 * @param cp - Valor cp.
 */
export function saveCheckpoint(cwd: string, cp: OrchestrationCheckpoint): void {
  ensureDir(cwd);
  fs.writeFileSync(checkpointPath(cwd, cp.id), JSON.stringify(cp, null, 2), 'utf-8');
  updateLatest(cwd, cp);
}

function updateLatest(cwd: string, cp: OrchestrationCheckpoint): void {
  fs.writeFileSync(
    path.join(getDir(cwd), 'latest.json'),
    JSON.stringify(cp, null, 2),
    'utf-8',
  );
}

/**
 * Carrega checkpoint.
 * @param cwd - Valor cwd.
 * @param id - Valor id.
 * @returns O resultado da operação.
 */
export function loadCheckpoint(cwd: string, id: string): OrchestrationCheckpoint | null {
  const p = checkpointPath(cwd, id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Carrega latest checkpoint.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function loadLatestCheckpoint(cwd: string): OrchestrationCheckpoint | null {
  const p = path.join(getDir(cwd), 'latest.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Processa checkpoints.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function listCheckpoints(cwd: string): OrchestrationCheckpoint[] {
  const dir = getDir(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'latest.json')
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter((c): c is OrchestrationCheckpoint => c !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Atualiza checkpoint status.
 * @param cwd - Valor cwd.
 * @param id - Valor id.
 * @param status - Valor status.
 * @param updates - Valor updates.
 * @returns O resultado da operação.
 */
export function updateCheckpointStatus(
  cwd: string,
  id: string,
  status: TaskStatus,
  updates?: Partial<OrchestrationCheckpoint>,
): OrchestrationCheckpoint | null {
  const cp = loadCheckpoint(cwd, id);
  if (!cp) return null;
  cp.status = status;
  cp.updatedAt = new Date().toISOString();
  if (updates) Object.assign(cp, updates);
  saveCheckpoint(cwd, cp);
  return cp;
}

/**
 * Processa decision to checkpoint.
 * @param cwd - Valor cwd.
 * @param checkpointId - Valor id.
 * @param decision - Valor decision.
 * @returns O resultado da operação.
 */
export function attachDecisionToCheckpoint(
  cwd: string,
  checkpointId: string,
  decision: DecisionRecord,
): OrchestrationCheckpoint | null {
  return updateCheckpointStatus(cwd, checkpointId, 'completed', { decision });
}

/**
 * Processa checkpoints by phase.
 * @param cwd - Valor cwd.
 * @param phase - Valor phase.
 * @returns O resultado da operação.
 */
export function listCheckpointsByPhase(cwd: string, phase: PhaseId): OrchestrationCheckpoint[] {
  return listCheckpoints(cwd).filter(c => c.phase === phase);
}

/**
 * Obtém checkpoint metrics.
 * @param cwd - Valor cwd.
 * @param phase - Valor phase.
 * @returns O resultado da operação.
 */
export function getCheckpointMetrics(
  cwd: string,
  phase?: PhaseId,
): { count: number; completed: number; failed: number; needsDecision: number } {
  const all = phase ? listCheckpointsByPhase(cwd, phase) : listCheckpoints(cwd);
  return {
    count: all.length,
    completed: all.filter(c => c.status === 'completed' || c.status === 'validated').length,
    failed: all.filter(c => c.status === 'failed').length,
    needsDecision: all.filter(c => c.status === 'needs-decision').length,
  };
}

/** Interface que define a estrutura de orchestration summary. */
export interface OrchestrationSummary {
  totalPhases: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  needsDecisionTasks: number;
  totalCheckpoints: number;
  completedCheckpoints: number;
  failedCheckpoints: number;
  pendingDecisions: number;
  currentPhase: string;
  overallProgress: number;
  startTime: string;
  lastUpdated: string;
}

/**
 * Obtém orchestration summary.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function getOrchestrationSummary(cwd: string): OrchestrationSummary {
  const state = loadOrchestrationState(cwd);
  const checkpoints = listCheckpoints(cwd);
  const metrics = getCheckpointMetrics(cwd);

  if (!state) {
    return {
      totalPhases: 0,
      totalTasks: 0,
      completedTasks: metrics.completed,
      failedTasks: metrics.failed,
      pendingTasks: 0,
      blockedTasks: 0,
      needsDecisionTasks: metrics.needsDecision,
      totalCheckpoints: metrics.count,
      completedCheckpoints: metrics.completed,
      failedCheckpoints: metrics.failed,
      pendingDecisions: metrics.needsDecision,
      currentPhase: 'unknown',
      overallProgress: 0,
      startTime: '',
      lastUpdated: '',
    };
  }

  let completedTasks = 0;
  let failedTasks = 0;
  let pendingTasks = 0;
  let blockedTasks = 0;
  let needsDecisionTasks = 0;
  let totalTasks = 0;

  for (const phase of state.phases) {
    totalTasks += phase.totalTasks;
    completedTasks += phase.completedTasks;
    for (const task of phase.tasks) {
      if (task.status === 'failed') failedTasks++;
      else if (task.status === 'pending') pendingTasks++;
      else if (task.status === 'blocked') blockedTasks++;
      else if (task.status === 'needs-decision') needsDecisionTasks++;
    }
  }

  return {
    totalPhases: state.phases.length,
    totalTasks,
    completedTasks,
    failedTasks,
    pendingTasks,
    blockedTasks,
    needsDecisionTasks,
    totalCheckpoints: checkpoints.length,
    completedCheckpoints: metrics.completed,
    failedCheckpoints: metrics.failed,
    pendingDecisions: state.pendingDecisions.length,
    currentPhase: state.currentPhase,
    overallProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    startTime: state.startedAt,
    lastUpdated: state.updatedAt,
  };
}

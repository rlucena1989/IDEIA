import {
  PhaseId,
  PhaseState,
  TaskNode,
  OrchestrationState,
  OrchestrationCheckpoint,
  TaskStatus,
  AutonomyLevel,
  ExecutionMode,
} from './orchestration-types';
import { createLogger } from '@ideia/logger';
import { getEffectiveAutonomyLevel, shouldAutoExecute, shouldRequestHumanDecision } from './autonomy-policy';
import { getReadyTasks, evaluateAfterCheckpoint, updateTaskStatuses } from './unlock-engine';
import { routeBatch, estimateBatchCost } from './model-router';
import * as CheckpointManager from './checkpoint-manager';
import { buildDecisionRequest, resolveDecision } from './decision-center';
import { PHASE_ORDER, PHASE_NAMES } from './phase-constants';

export { PHASE_ORDER, PHASE_NAMES };

/**
 * Cria initial state.
 * @param cwd - Valor cwd.
 * @param tasks - Valor tasks.
 * @param autonomyLevel - Valor level.
 * @returns O resultado da operação.
 */
export function createInitialState(cwd: string, tasks: TaskNode[], autonomyLevel: AutonomyLevel = 'guided'): OrchestrationState {
  const now = new Date().toISOString();
  const phases: PhaseState[] = PHASE_ORDER.map((id, idx) => {
    const phaseTasks = tasks.filter((t) => t.phase === id);
    return {
      id,
      name: PHASE_NAMES[id],
      status: idx === 0 ? ('ready' as TaskStatus) : ('pending' as TaskStatus),
      progress: 0,
      tasks: phaseTasks,
      completedTasks: 0,
      totalTasks: phaseTasks.length,
      blockedCount: 0,
    };
  });

  const state: OrchestrationState = {
    currentPhase: 'diagnosis',
    version: '1.0.0',
    phases,
    pendingDecisions: [],
    checkpoints: [],
    executionMode: autonomyLevel === 'blocked' ? 'blocked' : 'guided',
    autonomyLevel,
    confidence: 0.5,
    startedAt: now,
    updatedAt: now,
    metadata: {},
  };

  const cp = CheckpointManager.createCheckpoint(
    cwd,
    'diagnosis',
    'init',
    'completed',
    state.phases[0] ? { coverage: 0, branches: 0, scorecard: 0, risk: 0 } : undefined,
  );
  state.checkpoints.push(cp);
  state.lastCheckpointId = cp.id;

  CheckpointManager.saveOrchestrationState(cwd, state);

  return state;
}

/** Interface que define a estrutura de phase transition. */
export interface PhaseTransition {
  canAdvance: boolean;
  nextPhase?: PhaseId;
  reason: string;
  checkpoints: OrchestrationCheckpoint[];
}

/**
 * Processa phase readiness.
 * @param state - Valor state.
 * @param cwd - Valor cwd.
 * @param phaseIndex - Valor index.
 * @returns O resultado da operação.
 */
export function evaluatePhaseReadiness(state: OrchestrationState, cwd: string, phaseIndex: number): PhaseTransition {
  if (phaseIndex >= PHASE_ORDER.length - 1) {
    return { canAdvance: false, reason: 'Fase final atingida', checkpoints: state.checkpoints };
  }

  const currentPhase = state.phases[phaseIndex];
  if (!currentPhase) {
    return { canAdvance: false, reason: 'Fase atual nao encontrada', checkpoints: state.checkpoints };
  }

  const nextPhaseId = PHASE_ORDER[phaseIndex + 1];
  const nextPhase = state.phases.find((p) => p.id === nextPhaseId);

  const allCompleted = currentPhase.tasks.every((t) => t.status === 'completed' || t.status === 'validated');

  if (!allCompleted) {
    const pending = currentPhase.tasks.filter((t) => t.status !== 'completed' && t.status !== 'validated');
    return {
      canAdvance: false,
      nextPhase: nextPhaseId,
      reason: `Aguardando ${pending.length} tarefas: ${pending.map((t) => t.name).join(', ')}`,
      checkpoints: state.checkpoints,
    };
  }

  const phaseCheckpoints = state.checkpoints.filter((c) => c.phase === currentPhase.id);
  const allValidated = phaseCheckpoints.every((c) => c.status === 'completed' || c.status === 'validated');

  if (!allValidated) {
    return {
      canAdvance: false,
      nextPhase: nextPhaseId,
      reason: 'Aguardando validacao de checkpoints da fase atual',
      checkpoints: phaseCheckpoints,
    };
  }

  return {
    canAdvance: true,
    nextPhase: nextPhaseId,
    reason: `Fase ${currentPhase.name} concluida. Avancando para ${nextPhase ? nextPhase.name : nextPhaseId}`,
    checkpoints: phaseCheckpoints,
  };
}

/**
 * Processa phase.
 * @param state - Valor state.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function advancePhase(state: OrchestrationState, cwd: string): { state: OrchestrationState; transition: PhaseTransition } {
  const currentIdx = PHASE_ORDER.indexOf(state.currentPhase);
  const transition = evaluatePhaseReadiness(state, cwd, currentIdx);

  if (!transition.canAdvance || !transition.nextPhase) {
    return { state, transition };
  }

  const updatedPhases = state.phases.map((p) => {
    if (p.id === state.currentPhase) {
      return { ...p, status: 'completed' as TaskStatus, progress: 100, completedAt: new Date().toISOString() };
    }
    if (p.id === transition.nextPhase) {
      return { ...p, status: 'ready' as TaskStatus, startedAt: new Date().toISOString() };
    }
    return p;
  });

  const nextPhase = transition.nextPhase;
  const cp = CheckpointManager.createCheckpoint(cwd, nextPhase, `phase-transition-${nextPhase}`, 'completed', undefined);

  const updatedState = {
    ...state,
    currentPhase: nextPhase,
    phases: updatedPhases,
    checkpoints: [...state.checkpoints, cp],
    lastCheckpointId: cp.id,
    updatedAt: new Date().toISOString(),
  };

  CheckpointManager.saveOrchestrationState(cwd, updatedState);

  return {
    state: updatedState,
    transition,
  };
}

function tryExecuteTask(task: TaskNode, _cwd: string): boolean {
  try {
    if (task.status !== 'running') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Processa cycle.
 * @param state - Valor state.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function orchestrateCycle(
  state: OrchestrationState,
  cwd: string,
): {
  state: OrchestrationState;
  executed: string[];
  decisions: string[];
  completed: boolean;
} {
  let current = state;
  const executed: string[] = [];
  const decisions: string[] = [];

  const currentPhase = current.phases.find((p) => p.id === current.currentPhase);
  if (!currentPhase) return { state: current, executed, decisions, completed: false };

  const readyTasks = getReadyTasks(currentPhase.tasks);
  const autonomyLevel = getEffectiveAutonomyLevel({}, current.confidence, 0);

  for (const task of readyTasks) {
    if (shouldAutoExecute(task, autonomyLevel)) {
      const updatedTasks = currentPhase.tasks.map((t) => (t.id === task.id ? { ...t, status: 'running' as TaskStatus } : t));
      const updatedPhase = { ...currentPhase, tasks: updatedTasks };
      current = {
        ...current,
        phases: current.phases.map((p) => (p.id === current.currentPhase ? updatedPhase : p)),
      };
      executed.push(task.id);

      try {
        const success = tryExecuteTask(task, cwd);
        if (!success) {
          throw new Error(`Task ${task.id} execution returned failure`);
        }

        const finalTasks = updatedPhase.tasks.map((t) => (t.id === task.id ? { ...t, status: 'completed' as TaskStatus } : t));
        const finalPhase = {
          ...updatedPhase,
          tasks: finalTasks,
          completedTasks: finalTasks.filter((t) => t.status === 'completed' || t.status === 'validated').length,
          progress:
            updatedPhase.totalTasks > 0
              ? Math.round(
                  (finalTasks.filter((t) => t.status === 'completed' || t.status === 'validated').length / updatedPhase.totalTasks) * 100,
                )
              : 100,
        };
        current = {
          ...current,
          phases: current.phases.map((p) => (p.id === current.currentPhase ? finalPhase : p)),
        };

        const cp = CheckpointManager.createCheckpoint(cwd, current.currentPhase, task.id, 'completed', {
          coverage: current.metadata.coverage as number | undefined,
        });
        cp.unlockIds = [task.id];
        CheckpointManager.saveCheckpoint(cwd, cp);
        current.checkpoints.push(cp);
        current.lastCheckpointId = cp.id;
      } catch (_error) {
        const failedTasks = updatedPhase.tasks.map((t) => (t.id === task.id ? { ...t, status: 'failed' as TaskStatus } : t));
        const failedPhase = {
          ...updatedPhase,
          tasks: failedTasks,
          completedTasks: failedTasks.filter((t) => t.status === 'completed' || t.status === 'validated').length,
          progress:
            updatedPhase.totalTasks > 0
              ? Math.round(
                  (failedTasks.filter((t) => t.status === 'completed' || t.status === 'validated').length / updatedPhase.totalTasks) * 100,
                )
              : 100,
        };
        current = {
          ...current,
          phases: current.phases.map((p) => (p.id === current.currentPhase ? failedPhase : p)),
        };

        const errorMessage = _error instanceof Error ? _error.message : String(_error);
        const cp = CheckpointManager.createCheckpoint(cwd, current.currentPhase, task.id, 'failed', {
          coverage: current.metadata.coverage as number | undefined,
        });
        cp.unlockIds = [];
        cp.nextActions = [`retry:${task.id}`, `error:${errorMessage}`];
        CheckpointManager.saveCheckpoint(cwd, cp);
        current.checkpoints.push(cp);
        current.lastCheckpointId = cp.id;
      }
    } else if (shouldRequestHumanDecision(task, autonomyLevel)) {
      const lastCp = current.checkpoints[current.checkpoints.length - 1];
      if (lastCp) {
        const decisionReq = buildDecisionRequest(
          `Decisao: ${task.name}`,
          task.description,
          `Tarefa requer decisao humana (risco: ${task.riskLevel}, autonomia: ${autonomyLevel})`,
          `Fase: ${current.currentPhase}\nTarefa: ${task.name}\nDescricao: ${task.description}\nDependencias: ${task.dependsOn.join(', ')}`,
          lastCp,
          `Opcao recomendada: B — executar com configuracao padrao`,
        );
        current.pendingDecisions.push(decisionReq);
        decisions.push(decisionReq.id);

        const decisionCp = CheckpointManager.createCheckpoint(cwd, current.currentPhase, task.id, 'needs-decision', undefined);
        current.checkpoints.push(decisionCp);
        current.lastCheckpointId = decisionCp.id;
      }
    }
  }

  // Auto-replanning: check for failures and replan if needed
  const hasFailures = current.phases.some((p) => p.tasks.some((t) => t.status === 'failed'));

  if (hasFailures) {
    current = replan(current, cwd);
  }

  current.updatedAt = new Date().toISOString();
  const allDone = current.phases.every((p) => p.tasks.every((t) => t.status === 'completed' || t.status === 'validated'));

  CheckpointManager.saveOrchestrationState(cwd, current);

  return { state: current, executed, decisions, completed: allDone };
}

/**
 * Processa from checkpoint.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function resumeFromCheckpoint(cwd: string): OrchestrationState | null {
  const latest = CheckpointManager.loadLatestCheckpoint(cwd);
  if (!latest) return null;

  const allCheckpoints = CheckpointManager.listCheckpoints(cwd);

  const state: OrchestrationState = {
    currentPhase: latest.phase,
    version: '1.0.0',
    phases: PHASE_ORDER.map((id) => ({
      id,
      name: PHASE_NAMES[id],
      status: 'pending' as TaskStatus,
      progress: 0,
      tasks: [],
      completedTasks: 0,
      totalTasks: 0,
      blockedCount: 0,
    })),
    pendingDecisions: allCheckpoints
      .filter((c) => c.status === 'needs-decision')
      .map((c) =>
        buildDecisionRequest(
          `Decisao pendente: ${c.taskId ?? 'desconhecida'}`,
          'Retomada de checkpoint',
          `Checkpoint ${c.id} esta aguardando decisao`,
          `Fase: ${c.phase}\nCheckpoint: ${c.id}\nStatus: ${c.status}`,
          c,
          'Recomendado: continuar com configuracao padrao',
        ),
      ),
    checkpoints: allCheckpoints,
    executionMode: 'guided',
    autonomyLevel: 'guided',
    confidence: 0.5,
    startedAt: allCheckpoints[allCheckpoints.length - 1]?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
  };

  const phaseState = state.phases.find((p) => p.id === latest.phase);
  if (phaseState) {
    phaseState.status = 'ready';
  }

  return state;
}

/**
 * Processa changed.
 * @param cwd - Valor cwd.
 * @param state - Valor state.
 * @returns O resultado da operação.
 */
export function contextChanged(cwd: string, state: OrchestrationState): boolean {
  const storedHash = state.metadata?.filesystemContextHash;
  if (typeof storedHash !== 'string' || !storedHash) return true;

  const currentHash = CheckpointManager.computeFilesystemHash(cwd);
  return currentHash !== storedHash;
}

/**
 * Processa replan.
 * @param state - Valor state.
 * @param cwd - Valor cwd.
 * @returns O resultado da operação.
 */
export function replan(state: OrchestrationState, cwd: string): OrchestrationState {
  const now = new Date().toISOString();
  const affectedTaskIds: string[] = [];
  let phasesChanged = false;

  const updatedPhases = state.phases.map((phase) => {
    const updatedTasks = phase.tasks.map((task) => {
      if (task.status === 'failed') {
        affectedTaskIds.push(task.id);
        phasesChanged = true;
        return { ...task, status: 'pending' as TaskStatus };
      }
      if (task.status === 'blocked') {
        const depFailed = task.dependsOn.some((d) => state.phases.some((p) => p.tasks.some((t) => t.id === d && t.status === 'failed')));
        if (depFailed) {
          affectedTaskIds.push(task.id);
          phasesChanged = true;
          return { ...task, status: 'pending' as TaskStatus };
        }
      }
      return task;
    });

    return {
      ...phase,
      tasks: updatedTasks,
      completedTasks: updatedTasks.filter((t) => t.status === 'completed' || t.status === 'validated').length,
      blockedCount: updatedTasks.filter((t) => t.status === 'blocked').length,
    };
  });

  if (!phasesChanged) return state;

  const existingHistory = Array.isArray(state.metadata?.replanHistory)
    ? (state.metadata.replanHistory as Array<{ at: string; tasks: string[]; reason: string }>)
    : [];

  const updatedState: OrchestrationState = {
    ...state,
    phases: updatedPhases,
    updatedAt: now,
    metadata: {
      ...state.metadata,
      replanHistory: [
        ...existingHistory,
        {
          at: now,
          tasks: affectedTaskIds,
          reason: 'Auto-replanning after task failures',
        },
      ],
    },
  };

  const replanCp = CheckpointManager.createCheckpoint(cwd, state.currentPhase, 'replan', 'completed', undefined);
  replanCp.nextActions = [`replanned-${affectedTaskIds.length}-tasks`];
  replanCp.unlockIds = affectedTaskIds;
  CheckpointManager.saveCheckpoint(cwd, replanCp);
  updatedState.checkpoints.push(replanCp);
  updatedState.lastCheckpointId = replanCp.id;

  CheckpointManager.saveOrchestrationState(cwd, updatedState);

  return updatedState;
}

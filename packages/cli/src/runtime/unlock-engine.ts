import {
  TaskNode,
  OrchestrationCheckpoint,
  PhaseState,
  TaskStatus,
} from './orchestration-types';

/** Interface que define a estrutura de unlock result. */
export interface UnlockResult {
  unlockedTaskIds: string[];
  stillBlocked: string[];
  readyToExecute: TaskNode[];
  progressDelta: number;
}

/**
 * Obtém ready tasks.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function getReadyTasks(tasks: TaskNode[]): TaskNode[] {
  const completedIds = new Set(
    tasks.filter(t => t.status === 'completed' || t.status === 'validated').map(t => t.id),
  );

  return tasks.filter(t => {
    if (t.status !== 'pending' && t.status !== 'blocked') return false;
    const allDepsMet = t.dependsOn.every(depId => completedIds.has(depId));
    return allDepsMet;
  });
}

/**
 * Processa after checkpoint.
 * @param checkpoint - Valor checkpoint.
 * @param tasks - Valor tasks.
 * @param completedTaskIds - Valor task ids.
 * @returns O resultado da operação.
 */
export function evaluateAfterCheckpoint(
  checkpoint: OrchestrationCheckpoint,
  tasks: TaskNode[],
  completedTaskIds: string[],
): UnlockResult {
  const completed = new Set(completedTaskIds);
  const unlockedTaskIds: string[] = [];
  const stillBlocked: string[] = [];
  const readyToExecute: TaskNode[] = [];

  for (const task of tasks) {
    if (completed.has(task.id)) continue;
    if (task.status === 'completed' || task.status === 'validated') continue;

    const allDepsMet = task.dependsOn.every(depId => completed.has(depId));

    if (allDepsMet && (task.status === 'pending' || task.status === 'blocked')) {
      unlockedTaskIds.push(task.id);
      readyToExecute.push(task);
    } else if (!allDepsMet && task.status === 'blocked') {
      stillBlocked.push(task.id);
    }
  }

  const progressDelta = tasks.length > 0
    ? Math.round((completed.size / tasks.length) * 100)
    : 0;

  return { unlockedTaskIds, stillBlocked, readyToExecute, progressDelta };
}

/**
 * Obtém blocked tasks.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function getBlockedTasks(tasks: TaskNode[]): TaskNode[] {
  const completedIds = new Set(
    tasks.filter(t => t.status === 'completed' || t.status === 'validated').map(t => t.id),
  );
  const failedIds = new Set(
    tasks.filter(t => t.status === 'failed').map(t => t.id),
  );

  return tasks.filter(t => {
    if (t.status !== 'pending') return false;
    return t.dependsOn.some(depId =>
      !completedIds.has(depId) || failedIds.has(depId),
    );
  });
}

/**
 * Gera unlock plan.
 * @param checkpoints - Valor checkpoints.
 * @param phase - Valor phase.
 * @returns O resultado da operação.
 */
export function generateUnlockPlan(
  checkpoints: OrchestrationCheckpoint[],
  phase: PhaseState,
): {
  canUnlock: boolean;
  nextTasks: TaskNode[];
  blockingTasks: string[];
} {
  const completedCheckpointIds = new Set(
    checkpoints.filter(c => c.status === 'completed' || c.status === 'validated')
      .flatMap(c => c.unlockIds),
  );

  const blockingTasks: string[] = [];
  const nextTasks: TaskNode[] = [];

  for (const task of phase.tasks) {
    if (task.status !== 'pending' && task.status !== 'blocked') continue;

    const allDepsMet = task.dependsOn.every(depId => completedCheckpointIds.has(depId));

    if (allDepsMet) {
      nextTasks.push(task);
    } else {
      for (const dep of task.dependsOn) {
        if (!completedCheckpointIds.has(dep)) {
          blockingTasks.push(dep);
        }
      }
    }
  }

  return {
    canUnlock: nextTasks.length > 0,
    nextTasks,
    blockingTasks: [...new Set(blockingTasks)],
  };
}

/**
 * Obtém parallel groups.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function getParallelGroups(tasks: TaskNode[]): TaskNode[][] {
  const readyTasks = getReadyTasks(tasks);
  if (readyTasks.length === 0) return [];

  const depthMap = new Map<string, number>();

  function computeDepth(taskId: string): number {
    const cached = depthMap.get(taskId);
    if (cached !== undefined) return cached;
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.dependsOn.length === 0) {
      depthMap.set(taskId, 0);
      return 0;
    }
    const maxDep = Math.max(...task.dependsOn.map(computeDepth), -1);
    depthMap.set(taskId, maxDep + 1);
    return maxDep + 1;
  }

  for (const task of tasks) {
    computeDepth(task.id);
  }

  const groups = new Map<number, TaskNode[]>();
  for (const task of readyTasks) {
    const depth = depthMap.get(task.id) ?? 0;
    if (!groups.has(depth)) groups.set(depth, []);
    groups.get(depth) ?? {}.push(task);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, group]) => group);
}

/**
 * Estima parallel time.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function estimateParallelTime(tasks: TaskNode[]): { total: number; parallelGroups: number } {
  const groups = getParallelGroups(tasks);
  const effortWeights: Record<string, number> = { minutes: 1, hours: 60, days: 480 };
  let total = 0;
  for (const group of groups) {
    const maxEffort = Math.max(...group.map(t => effortWeights[t.estimatedEffort] ?? 1), 0);
    total += maxEffort;
  }
  return { total, parallelGroups: groups.length };
}

/**
 * Atualiza task statuses.
 * @param tasks - Valor tasks.
 * @param unlockedIds - Valor ids.
 * @param newStatus - Valor status.
 * @returns O resultado da operação.
 */
export function updateTaskStatuses(
  tasks: TaskNode[],
  unlockedIds: string[],
  newStatus: TaskStatus,
): TaskNode[] {
  return tasks.map(t => {
    if (unlockedIds.includes(t.id)) {
      return { ...t, status: newStatus };
    }
    return t;
  });
}

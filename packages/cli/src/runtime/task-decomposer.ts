import { TaskNode, DecomposedTask, PhaseId, RiskLevel } from './orchestration-types';
import { createLogger } from '@ideia/logger';

/** Interface que define a estrutura de decomposition input. */
export interface DecompositionInput {
  id: string;
  name: string;
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
  domain: string[];
  hasLLMRequirement: boolean;
  hasDeterministicParts: boolean;
}

/**
 * Processa task.
 * @param input - Valor input.
 * @param phase - Valor phase.
 * @returns O resultado da operação.
 */
export function decomposeTask(
  input: DecompositionInput,
  phase: PhaseId,
): DecomposedTask {
  const subtasks: TaskNode[] = [];
  const dependencies: Array<{ from: string; to: string }> = [];
  let counter = 0;

  const addSubtask = (
    name: string,
    description: string,
    dependsOn: string[],
    requiresLLM: boolean,
    isDeterministic: boolean,
    riskLevel: RiskLevel = 'low',
    canParallelize = true,
  ) => {
    counter++;
    const id = `${input.id}-sub-${counter}`;
    subtasks.push({
      id,
      name,
      description,
      phase,
      status: 'pending',
      dependsOn,
      blockedBy: [],
      riskLevel,
      estimatedEffort: isDeterministic ? 'minutes' : 'hours',
      canParallelize,
      isDeterministic,
      requiresLLM,
      requiredModelTier: requiresLLM ? (riskLevel === 'high' ? 'strong' : 'lightweight') : undefined,
    });
    for (const dep of dependsOn) {
      dependencies.push({ from: dep, to: id });
    }
  };

  if (input.hasDeterministicParts) {
    addSubtask(
      `${input.name}: estrutura`,
      `Criar interfaces, tipos, schemas e estrutura de ${input.name}`,
      [],
      false,
      true,
      'low',
      true,
    );
    addSubtask(
      `${input.name}: stubs`,
      `Gerar stubs, imports e assinaturas para ${input.name}`,
      [`${input.id}-sub-1`],
      false,
      true,
      'low',
      true,
    );
    addSubtask(
      `${input.name}: testes base`,
      `Criar testes unitarios para ${input.name}`,
      [`${input.id}-sub-1`],
      false,
      true,
      'low',
      true,
    );
  }

  if (input.hasLLMRequirement) {
    const lastDetIdx = subtasks.length;
    const deps = subtasks.length > 0
      ? subtasks.filter(s => s.isDeterministic).map(s => s.id)
      : [];

    addSubtask(
      `${input.name}: logica principal`,
      `Implementar logica central de ${input.name} com suporte de IA`,
      deps,
      true,
      false,
      input.estimatedComplexity === 'high' ? 'high' : 'medium',
      false,
    );

    if (input.estimatedComplexity !== 'low') {
      addSubtask(
        `${input.name}: revisao`,
        `Revisar implementacao de ${input.name} para qualidade e seguranca`,
        [`${input.id}-sub-${lastDetIdx + 1}`],
        true,
        false,
        'medium',
        false,
      );
    }
  }

  addSubtask(
    `${input.name}: validacao final`,
    `Executar quality gates e validar consistencia de ${input.name}`,
    subtasks.filter(s => s.status === 'pending' || s.id !== `${input.id}-sub-${counter}`).map(s => s.id),
    false,
    true,
    'low',
    false,
  );

  const parallelGroups = findParallelGroups(subtasks, dependencies);

  return { originalId: input.id, subtasks, dependencies, parallelGroups };
}

function findParallelGroups(
  tasks: TaskNode[],
  dependencies: Array<{ from: string; to: string }>,
): string[][] {
  const depMap = new Map<string, Set<string>>();
  for (const t of tasks) depMap.set(t.id, new Set());
  for (const d of dependencies) {
    const set = depMap.get(d.to);
    if (set) set.add(d.from);
  }

  const levels: string[][] = [];
  const remaining = new Set(tasks.map(t => t.id));

  while (remaining.size > 0) {
    const level: string[] = [];
    for (const id of remaining) {
      const deps = depMap.get(id);
      if (!deps || deps.size === 0 || ![...deps].some(d => remaining.has(d))) {
        level.push(id);
      }
    }
    if (level.length === 0) break;
    levels.push(level);
    for (const id of level) remaining.delete(id);
  }

  return levels;
}

/**
 * Detecta dependencies.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function detectDependencies(tasks: TaskNode[]): Array<{ from: string; to: string }> {
  const result: Array<{ from: string; to: string }> = [];
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      result.push({ from: dep, to: task.id });
    }
  }
  return result;
}

/**
 * Detecta parallelism.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function detectParallelism(tasks: TaskNode[]): string[][] {
  const deps = detectDependencies(tasks);
  return findParallelGroups(tasks, deps);
}

/**
 * Processa deterministic.
 * @param tasks - Valor tasks.
 * @returns O resultado da operação.
 */
export function separateDeterministic(tasks: TaskNode[]): {
  deterministic: TaskNode[];
  creative: TaskNode[];
} {
  return {
    deterministic: tasks.filter(t => t.isDeterministic),
    creative: tasks.filter(t => !t.isDeterministic),
  };
}

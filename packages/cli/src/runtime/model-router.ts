import {
  TaskNode,
  ModelRouteResult,
  RiskLevel,
} from './orchestration-types';

/** Interface que define a estrutura de model router config. */
export interface ModelRouterConfig {
  preferLocal: boolean;
  costSensitivity: number;
  latencyToleranceMs: number;
}

function isLocallySolvable(task: TaskNode): boolean {
  return task.isDeterministic || (!task.requiresLLM && task.riskLevel === 'low');
}

function estimateCost(task: TaskNode): number {
  if (task.isDeterministic) return 0;
  if (!task.requiresLLM) return 0;
  if (task.riskLevel === 'high') return 0.05;
  if (task.riskLevel === 'medium') return 0.02;
  return 0.005;
}

function estimateLatency(task: TaskNode): number {
  if (task.isDeterministic) return 1;
  if (!task.requiresLLM) return 5;
  if (task.requiredModelTier === 'local') return 200;
  if (task.requiredModelTier === 'lightweight') return 500;
  return 2000;
}

/**
 * Processa task.
 * @param task - Valor task.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function routeTask(
  task: TaskNode,
  config?: Partial<ModelRouterConfig>,
): ModelRouteResult {
  const cfg: ModelRouterConfig = {
    preferLocal: config?.preferLocal ?? true,
    costSensitivity: config?.costSensitivity ?? 0.5,
    latencyToleranceMs: config?.latencyToleranceMs ?? 5000,
  };

  if (isLocallySolvable(task)) {
    if (task.isDeterministic) {
      return {
        taskId: task.id,
        target: 'deterministic',
        reason: 'Tarefa deterministica — execucao local sem IA',
        estimatedCostUsd: 0,
        estimatedLatencyMs: 1,
        confidence: 1,
      };
    }
    return {
      taskId: task.id,
      target: 'local',
      provider: 'ollama',
      model: 'qwen2:0.5b',
      reason: 'Tarefa de baixo risco — execucao local com modelo leve',
      estimatedCostUsd: 0,
      estimatedLatencyMs: 200,
      confidence: 0.9,
    };
  }

  const cost = estimateCost(task);
  const latency = estimateLatency(task);

  if (latency > cfg.latencyToleranceMs) {
    return {
      taskId: task.id,
      target: 'local',
      provider: 'ollama',
      model: 'qwen2:0.5b',
      reason: `Tarefa excede tolerancia de latencia (${latency}ms > ${cfg.latencyToleranceMs}ms) — fallback para local`,
      estimatedCostUsd: 0,
      estimatedLatencyMs: 200,
      confidence: 0.6,
    };
  }

  if (task.riskLevel === 'high' || task.requiredModelTier === 'strong') {
    return {
      taskId: task.id,
      target: 'strong',
      provider: 'openai',
      model: 'gpt-4o',
      reason: 'Tarefa de alto risco ou complexidade — requer modelo forte',
      estimatedCostUsd: cost,
      estimatedLatencyMs: latency,
      confidence: 0.95,
    };
  }

  if (cost > cfg.costSensitivity * 0.1) {
    return {
      taskId: task.id,
      target: 'lightweight',
      provider: 'ollama',
      model: 'qwen2:0.5b',
      reason: 'Custo elevado para modelo forte — usando modelo leve',
      estimatedCostUsd: 0,
      estimatedLatencyMs: 500,
      confidence: 0.7,
    };
  }

  return {
    taskId: task.id,
    target: 'lightweight',
    provider: 'openai',
    model: 'gpt-4o-mini',
    reason: 'Tarefa de complexidade moderada — modelo leve remoto',
    estimatedCostUsd: cost * 0.3,
    estimatedLatencyMs: latency * 0.6,
    confidence: 0.85,
  };
}

/**
 * Processa batch.
 * @param tasks - Valor tasks.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function routeBatch(tasks: TaskNode[], config?: Partial<ModelRouterConfig>): ModelRouteResult[] {
  return tasks.map(t => routeTask(t, config));
}

/**
 * Estima batch cost.
 * @param routes - Valor routes.
 * @returns O resultado da operação.
 */
export function estimateBatchCost(routes: ModelRouteResult[]): { totalUsd: number; totalLatencyMs: number; parallelizable: number } {
  const totalUsd = routes.reduce((s, r) => s + r.estimatedCostUsd, 0);
  const totalLatencyMs = routes.reduce((s, r) => s + r.estimatedLatencyMs, 0);
  const parallelizable = routes.filter(r => r.target === 'deterministic' || r.target === 'local').length;
  return { totalUsd, totalLatencyMs, parallelizable };
}

/**
 * Constrói fallback chain.
 * @param task - Valor task.
 * @returns O resultado da operação.
 */
export function buildFallbackChain(task: TaskNode): ModelRouteResult[] {
  const chain: ModelRouteResult[] = [];

  chain.push(routeTask({ ...task, isDeterministic: true, requiresLLM: false }));

  chain.push(routeTask({ ...task, requiresLLM: true, riskLevel: 'low' as RiskLevel, requiredModelTier: 'local' }));

  chain.push(routeTask(task));

  return chain;
}

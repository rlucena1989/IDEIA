import { createLogger } from '@ideia/logger';
import { Task, TaskFamily, MetaParams, TaskSpecificParams, MAMLConfig, Goal, PlanningContext, MetaLearningResult, EvaluationReport, Example, ProjectMemory, MetaMetrics } from './types';
import { PolicyNetwork } from './policy-network';
import { MAMLStateEncoder } from './state-encoder';
import { GradientAdapter } from './gradient-adapter';
import { ElderlyReplayBuffer } from './replay-buffer';
import { CrossProjectLearner } from './cross-project-learner';

const _log = createLogger('maml');

export class MAML {
  private _policyNetwork: PolicyNetwork;
  private _stateEncoder: MAMLStateEncoder;
  private _gradientAdapter: GradientAdapter;
  private _replayBuffer: ElderlyReplayBuffer;
  private _crossProjectLearner: CrossProjectLearner;
  private _metaParams: MetaParams;
  private _config: MAMLConfig;
  private _taskFamilies: Map<string, TaskFamily> = new Map();
  private _metaMetrics: MetaMetrics[] = [];

  constructor(config: Partial<MAMLConfig> = {}) {
    this._policyNetwork = new PolicyNetwork([10, 32, 16, 6]);
    this._stateEncoder = new MAMLStateEncoder();
    this._gradientAdapter = new GradientAdapter();
    this._replayBuffer = new ElderlyReplayBuffer();
    this._crossProjectLearner = new CrossProjectLearner();
    this._config = { innerLR: 0.01, outerLR: 0.001, metaBatchSize: 4, adaptationSteps: 5, maxTrainingTasks: 1000, convergenceThreshold: 0.01, taskSimilarityThreshold: 0.6, explorationRate: 0.1, ...config };
    this._metaParams = { strategies: ['top-down', 'bottom-up', 'hybrid', 'example-based', 'agile', 'waterfall'], weights: { complexity: 0.3, similarity: 0.25, context: 0.2, taskType: 0.15, resources: 0.1 }, adaptationRate: this._config.innerLR, explorationRate: this._config.explorationRate };
  }

  async adapt(task: Task, family: TaskFamily, context: PlanningContext, examples: Example[]): Promise<MetaLearningResult> {
    const state = this._stateEncoder.encode(task, family, context);
    const strategy = this._policyNetwork.getDecompositionStrategy(state);
    const startTime = Date.now();
    let totalReward = 0;
    let adaptationSteps = 0;
    const paramsHistory: TaskSpecificParams[] = [];

    for (let step = 0; step < this._config.adaptationSteps; step++) {
      const taskParams: TaskSpecificParams = { strategy, complexity: task.description.length / 1000, iterations: step + 1, confidence: 0.5 + step * 0.1, convergenceRate: 1 / (step + 1), reward: 0 };
      paramsHistory.push(taskParams);

      if (step > 0) {
        const adaptedParams = this._gradientAdapter.adapt(this._metaParams, paramsHistory, this._config.innerLR);
        taskParams.confidence = adaptedParams.weights.complexity * taskParams.complexity + adaptedParams.weights.similarity * 0.5;
      }

      const reward = this._simulateExecution(task, strategy, examples);
      totalReward += reward;
      adaptationSteps++;
    }

    const endTime = Date.now();
    const success = totalReward / adaptationSteps > 0.6;

    const sample = { task, strategy, params: paramsHistory[paramsHistory.length - 1] || { strategy, complexity: 0, iterations: 0, confidence: 0, convergenceRate: 0, reward: 0 }, metrics: { executionTime: endTime - startTime, reward: totalReward, adaptations: adaptationSteps, success }, timestamp: Date.now() } as any;
    this._replayBuffer.add(sample);

    return {
      success, strategy, confidence: totalReward / adaptationSteps,
      adaptations: adaptationSteps, metrics: { adaptationSpeed: adaptationSteps / 5, transferEfficiency: 0.5, generalizationGap: 0.3 },
      recommendations: [`Estratégia usada: ${strategy}`, `Confiança: ${((totalReward / adaptationSteps) * 100).toFixed(0)}%`],
    };
  }

  private _simulateExecution(task: Task, strategy: string, examples: Example[]): number {
    let reward = 0;
    const hasExamples = examples.length > 0;
    const hasDomain = task.domain !== undefined && task.domain !== '';
    const descQuality = task.description.length > 50 ? 0.3 : 0.1;
    const strategyBonus = strategy === 'top-down' ? 0.2 : strategy === 'bottom-up' ? 0.15 : 0.1;
    reward += hasExamples ? 0.3 : 0;
    reward += hasDomain ? 0.2 : 0;
    reward += descQuality;
    reward += strategyBonus;
    return Math.min(reward, 1);
  }

  async metaLearn(tasks: Task[], families: TaskFamily[], contexts: PlanningContext[], examples: Example[][]): Promise<MetaMetrics> {
    const taskParams: TaskSpecificParams[] = [];
    let totalReward = 0;
    let completedTasks = 0;

    const batchSize = Math.min(this._config.metaBatchSize, tasks.length);
    for (let i = 0; i < batchSize; i++) {
      const task = tasks[i];
      const family = families[i] || { id: 'default', name: 'default', domain: task?.domain || 'general', description: '' };
      const context = contexts[i] || { hasExamples: false, hasSimilarTasks: false, hasArchitecturalGuidance: false, hasConstraints: false, hasRiskAssessment: false };
      const exs = examples[i] || [];

      if (task) {
        const result = await this.adapt(task, family, context, exs);
        if (result.success) completedTasks++;
        totalReward += result.confidence;
        taskParams.push({ strategy: result.strategy, complexity: result.adaptations, iterations: result.adaptations, confidence: result.confidence, convergenceRate: result.confidence, reward: result.confidence });
      }
    }

    if (taskParams.length > 0) this._metaParams = this._gradientAdapter.adapt(this._metaParams, taskParams, this._config.outerLR);

    const metrics: MetaMetrics = {
      iteration: this._metaMetrics.length + 1, accuracy: completedTasks / batchSize, loss: 1 - totalReward / batchSize, adaptationSpeed: taskParams.reduce((s, p) => s + p.convergenceRate, 0) / taskParams.length,
      generalizationGap: 0.1 + Math.random() * 0.2, transferEfficiency: Math.min(completedTasks / batchSize + 0.1, 1), taskCount: tasks.length, completedTasks, timestamp: Date.now(),
    };
    this._metaMetrics.push(metrics);
    return metrics;
  }

  async plan(goal: Goal, context: PlanningContext): Promise<{ tasks: Task[]; strategy: string; confidence: number }> {
    const tasks: Task[] = goal.objectives!!.map((obj, i) => ({
      id: `task_${Date.now()}_${i}`, type: 'feature', domain: goal.domain || 'general', description: obj,
      acceptanceCriteria: [], dependencies: [], technicalNotes: '', files: [],
    }));

    const family: TaskFamily = { id: goal.id || 'goal', name: goal.title || 'Goal', domain: goal.domain || 'general', description: goal.description || '', tasks };
    const state = this._stateEncoder.encode(tasks[0] || { id: '', type: 'feature', domain: 'general', description: '', acceptanceCriteria: [], dependencies: [], technicalNotes: '', files: [] }, family, context);
    const strategy = this._policyNetwork.getDecompositionStrategy(state);
    const confidence = Math.min(this._metaMetrics.length > 0 ? this._metaMetrics[this._metaMetrics.length - 1].accuracy : 0.5, 1);

    return { tasks, strategy, confidence };
  }

  async evaluate(tasks: Task[], families: TaskFamily[], contexts: PlanningContext[], examples: Example[][]): Promise<EvaluationReport> {
    let totalAccuracy = 0;
    const perTaskResults: { taskId: string; accuracy: number; confidence: number }[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (!task) continue;
      const family = families[i] || { id: 'default', name: 'default', domain: task.domain || 'general', description: '' };
      const context = contexts[i] || { hasExamples: false, hasSimilarTasks: false, hasArchitecturalGuidance: false, hasConstraints: false, hasRiskAssessment: false };
      const result = await this.adapt(task, family, context, examples[i] || []);
      totalAccuracy += result.confidence;
      perTaskResults.push({ taskId: task.id, accuracy: result.confidence, confidence: result.confidence });
    }

    const avgAccuracy = tasks.length > 0 ? totalAccuracy / tasks.length : 0;
    return {
      overallAccuracy: avgAccuracy, generalizationScore: avgAccuracy * 0.8 + 0.2,
      adaptationEfficiency: 1 - (this._metaMetrics.length > 0 ? this._metaMetrics[this._metaMetrics.length - 1].loss : 0.5),
      perTaskResults, recommendations: tasks.length === 0 ? ['No tasks evaluated'] : [`Overall accuracy: ${(avgAccuracy * 100).toFixed(1)}%`],
      metaMetrics: this._metaMetrics[this._metaMetrics.length - 1] || { iteration: 0, accuracy: 0, loss: 0, adaptationSpeed: 0, generalizationGap: 0, transferEfficiency: 0, taskCount: 0, completedTasks: 0, timestamp: Date.now() },
    };
  }

  get crossProjectLearner(): CrossProjectLearner { return this._crossProjectLearner; }
  get replayBuffer(): ElderlyReplayBuffer { return this._replayBuffer; }
  get policyNetwork(): PolicyNetwork { return this._policyNetwork; }
  get metaParams(): MetaParams { return { ...this._metaParams }; }
  get metaMetrics(): MetaMetrics[] { return [...this._metaMetrics]; }
}

export function computeMetaParams(params: MetaParams, grads: TaskSpecificParams[], lr: number): MetaParams {
  const updated = { ...params, weights: { ...params.weights } };
  for (const [key, val] of Object.entries(updated.weights)) {
    let gradSum = 0;
    for (const g of grads) {
      const gVal = (g as unknown as Record<string, number>)[key];
      if (typeof gVal === 'number') gradSum += gVal;
    }
    updated.weights[key as keyof typeof updated.weights] = val - lr * (grads.length > 0 ? gradSum / grads.length : 0);
  }
  updated.adaptationRate = params.adaptationRate - lr * (grads.length > 0 ? grads.reduce((s, g) => s + g.convergenceRate, 0) / grads.length : 0);
  updated.explorationRate = params.explorationRate - lr * (grads.length > 0 ? grads.reduce((s, g) => s + (1 - g.confidence), 0) / grads.length : 0);
  return updated;
}

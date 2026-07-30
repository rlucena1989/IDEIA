import { DecompositionExample, Goal, LoRAConfig, PlannedStep, PlanningContext, TrainingRunConfig } from './types';
import { createLogger } from '@ideia/logger';
import { LoRAFineTuner } from './lora-fine-tuner';
const logger = createLogger('neural-task-decomposer');

export class NeuralTaskDecomposer {
  private _fewShotExamples: DecompositionExample[] = [];
  private _loraFineTuner: LoRAFineTuner;

  constructor() {
    this._loraFineTuner = new LoRAFineTuner({ baseModel: 'deepseek-coder-6.7b', rank: 16, alpha: 32 });
  }

  async decompose(goal: Goal, context: PlanningContext): Promise<PlannedStep[]> {
    const strategy = this._selectStrategy(goal);
    const examples = this._getSimilarExamples(goal, 3);
    const steps = this._buildSteps(goal, context, strategy, examples);
    return steps;
  }

  private _selectStrategy(goal: Goal): string {
    if (goal.complexity > 0.7) return 'top-down';
    if (goal.complexity > 0.4) return 'hybrid';
    return 'bottom-up';
  }

  private _getSimilarExamples(goal: Goal, maxCount: number): DecompositionExample[] {
    return this._fewShotExamples
      .sort((a, b) => Math.abs(a.goal.complexity - goal.complexity) - Math.abs(b.goal.complexity - goal.complexity))
      .slice(0, maxCount);
  }

  private _buildSteps(goal: Goal, context: PlanningContext, strategy: string, _examples: DecompositionExample[]): PlannedStep[] {
    const estimatedStepCount = Math.max(1, Math.ceil(goal.complexity * 5));
    const steps: PlannedStep[] = [];
    for (let i = 0; i < estimatedStepCount; i++) {
      steps.push({
        id: `step_${i + 1}`,
        description: `${strategy} step ${i + 1} for ${goal.description}`,
        filesAffected: [],
        estimatedTokens: Math.ceil(goal.complexity * 500 / estimatedStepCount),
        dependencies: i > 0 ? [`step_${i}`] : [],
        acceptanceCriteria: [`Criteria for step ${i + 1}`],
      });
    }
    return steps;
  }

  async fineTune(trainingData: DecompositionExample[]): Promise<void> {
    this._fewShotExamples.push(...trainingData);
    if (this._fewShotExamples.length > 100) {
      this._fewShotExamples = this._fewShotExamples.slice(-100);
    }
    const formattedData = trainingData.map(d => ({
      input: `Decompose: ${d.goal.description}`,
      output: JSON.stringify({ steps: d.steps }),
    }));
    await this._loraFineTuner.train(formattedData, { epochs: 3, batchSize: 8, learningRate: 2e-4, validationSplit: 0.1 });
  }

  getExampleCount(): number { return this._fewShotExamples.length; }
}

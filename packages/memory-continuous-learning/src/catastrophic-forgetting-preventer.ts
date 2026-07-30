import { EWCTrainingResult, TrainingExample } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('catastrophic-forgetting-preventer');

export class CatastrophicForgettingPreventer {
  private _importanceMatrix: Map<string, number[]> = new Map();
  private _previousWeights: Map<string, number[]> = new Map();
  private _lambda: number;
  private _siOmega: Map<string, number[]> = new Map();

  constructor(lambda = 500) {
    this._lambda = lambda;
  }

  computeImportance(weights: number[], fisherSamples: number[][]): number[] {
    const importance = new Array(weights.length).fill(0);
    for (const sample of fisherSamples) {
      for (let i = 0; i < weights.length; i++) {
        const grad = this._computeGradient(weights, sample, i);
        importance[i] += grad * grad;
      }
    }
    return importance.map(v => v / Math.max(1, fisherSamples.length));
  }

  elasticWeightConsolidationLoss(newWeights: number[], taskId: string): number {
    const prevW = this._previousWeights.get(taskId);
    const importances = this._importanceMatrix.get(taskId);
    if (!prevW || !importances) return 0;
    let ewcLoss = 0;
    for (let i = 0; i < newWeights.length; i++) {
      ewcLoss += (this._lambda / 2) * importances[i] * ((newWeights[i] - prevW[i]) ** 2);
    }
    return ewcLoss;
  }

  synapticIntelligenceLoss(newWeights: number[]): number {
    let siLoss = 0;
    for (const [, omega] of this._siOmega) {
      for (let i = 0; i < Math.min(newWeights.length, omega.length); i++) {
        siLoss += omega[i] * newWeights[i] * newWeights[i];
      }
    }
    return siLoss;
  }

  async trainNewTask(taskData: TrainingExample[], taskId: string, initialWeights: number[]): Promise<EWCTrainingResult> {
    const prevW = [...initialWeights];
    this._previousWeights.set(taskId, prevW);
    const fisherSamples = taskData.map(d => this._sampleFisher(d.input));
    const importance = this.computeImportance(initialWeights, fisherSamples);
    this._importanceMatrix.set(taskId, importance);
    const omega = importance.map(v => v / Math.max(1, importance.reduce((a, b) => a + b, 0)));
    this._siOmega.set(taskId, omega);
    const trainedWeights = initialWeights.map((w, i) => {
      const noise = (Math.random() - 0.5) * 0.01;
      return w + (importance[i] ?? 0) * 0.01 * noise;
    });
    const ewcLoss = this.elasticWeightConsolidationLoss(trainedWeights, taskId);
    const siLoss = this.synapticIntelligenceLoss(trainedWeights);
    const forgetting = this._measureForgetting(taskId, taskData, trainedWeights);
    const weightChange = trainedWeights.reduce((s, w, i) => s + Math.abs(w - initialWeights[i]), 0) / Math.max(1, trainedWeights.length);
    return {
      taskId,
      ewcLoss: ewcLoss + siLoss,
      forgetting,
      weightChange,
      performanceRetained: 1 - forgetting,
    };
  }

  getTotalEwcLoss(newWeights: number[]): number {
    let total = 0;
    for (const [taskId] of this._previousWeights) {
      total += this.elasticWeightConsolidationLoss(newWeights, taskId);
    }
    total += this.synapticIntelligenceLoss(newWeights);
    return total;
  }

  getTaskCount(): number {
    return this._previousWeights.size;
  }

  reset(): void {
    this._importanceMatrix.clear();
    this._previousWeights.clear();
    this._siOmega.clear();
  }

  private _measureForgetting(taskId: string, originalData: TrainingExample[], _newWeights: number[]): number {
    const origCorrect = originalData.filter(d => d.label.length > 0).length;
    const simulatedCorrect = originalData.filter(d => this._predictLabel(d.input, _newWeights)).length;
    return Math.max(0, (origCorrect - simulatedCorrect) / Math.max(1, origCorrect));
  }

  private _predictLabel(input: string[], weights: number[]): boolean {
    const hashSum = input.reduce((s, v) => {
      let h = 0;
      for (let i = 0; i < v.length; i++) h += v.charCodeAt(i);
      return s + h;
    }, 0);
    const weightedSum = weights.reduce((s, w, i) => s + w * (hashSum % (i + 1 || 1)), 0);
    return weightedSum > 0;
  }

  private _computeGradient(weights: number[], _sample: number[], idx: number): number {
    return weights[idx] * (Math.random() * 0.1);
  }

  private _sampleFisher(input: string[]): number[] {
    return input.map(() => Math.random());
  }
}

import { MetaMetrics, MetaTrainingMetrics, ThresholdTask } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('meta-threshold-adapter');

export class MetaThresholdAdapter {
  private _metaWeights: number[][] = [];
  private _metaBias: number[] = [];
  private _config = { innerLR: 0.01, outerLR: 0.001, innerSteps: 5, nSupport: 10, nQuery: 10, metaBatchSize: 4 };
  private _taskHistory: Map<string, ThresholdTask[]> = new Map();
  private _adaptedWeights: Map<string, { weights: number[]; bias: number }> = new Map();

  constructor(inputDim: number, hiddenDim: number) {
    this._metaWeights = Array.from({ length: inputDim }, () =>
      Array.from({ length: hiddenDim }, () => Math.random() * 0.1)
    );
    this._metaBias = new Array(hiddenDim).fill(0);
  }

  async metaTrain(tasks: ThresholdTask[], metaEpochs = 100): Promise<MetaTrainingMetrics> {
    let metaLoss = 0, metaAccuracy = 0, taskCount = 0;
    for (let epoch = 0; epoch < metaEpochs; epoch++) {
      const batch = this._sampleTasks(tasks, this._config.metaBatchSize);
      let epochLoss = 0, epochAcc = 0;
      for (const task of batch) {
        const { innerWeights, innerBias } = this._innerLoop(task);
        const queryLoss = this._computeLoss(task.queryFeatures, task.queryLabels, innerWeights, innerBias);
        const queryAcc = this._computeAccuracy(task.queryFeatures, task.queryLabels, innerWeights, innerBias);
        epochLoss += queryLoss;
        epochAcc += queryAcc;
        this._metaUpdate(innerWeights, innerBias, task.queryFeatures, task.queryLabels);
      }
      metaLoss = epochLoss / batch.length;
      metaAccuracy = epochAcc / batch.length;
      taskCount = batch.length;
    }
    return { finalLoss: metaLoss, finalAccuracy: metaAccuracy, epochs: metaEpochs, tasksPerEpoch: taskCount, convergenceSteps: 0 };
  }

  private _innerLoop(task: ThresholdTask): { innerWeights: number[][]; innerBias: number[] } {
    let innerWeights = this._metaWeights.map(row => [...row]);
    let innerBias = [...this._metaBias];
    for (let step = 0; step < this._config.innerSteps; step++) {
      const gradW = this._computeGradientW(task.supportFeatures, task.supportLabels, innerWeights, innerBias);
      const gradB = this._computeGradientB(task.supportFeatures, task.supportLabels, innerWeights, innerBias);
      for (let i = 0; i < innerWeights.length; i++) {
        for (let j = 0; j < (innerWeights[i]?.length ?? 0); j++) {
          innerWeights[i][j] -= this._config.innerLR * (gradW[i]?.[j] ?? 0);
        }
      }
      for (let j = 0; j < innerBias.length; j++) {
        innerBias[j] -= this._config.innerLR * (gradB[j] ?? 0);
      }
    }
    return { innerWeights, innerBias };
  }

  private _computeLoss(features: number[][], labels: number[], weights: number[][], bias: number[]): number {
    let loss = 0;
    for (let i = 0; i < features.length; i++) {
      const pred = this._forward(features[i], weights, bias);
      loss += (pred - labels[i]) ** 2;
    }
    return loss / features.length;
  }

  private _computeAccuracy(features: number[][], labels: number[], weights: number[][], bias: number[]): number {
    let correct = 0;
    for (let i = 0; i < features.length; i++) {
      const pred = this._forward(features[i], weights, bias);
      if ((pred > 0.5 ? 1 : 0) === labels[i]) correct++;
    }
    return correct / features.length;
  }

  private _forward(features: number[], weights: number[][], bias: number[]): number {
    const hidden = weights.map((row, i) =>
      this._relu(row.reduce((sum, w, j) => sum + w * (features[j] ?? 0), 0) + (bias[i] ?? 0))
    );
    const output = hidden.reduce((sum, h, i) => sum + h * (1 / (i + 1)), 0);
    return this._sigmoid(output);
  }

  private _computeGradientW(features: number[][], labels: number[], weights: number[][], bias: number[]): number[][] {
    const grad = weights.map(row => new Array(row.length).fill(0));
    for (let i = 0; i < features.length; i++) {
      const pred = this._forward(features[i], weights, bias);
      const error = pred - labels[i];
      for (let j = 0; j < weights.length; j++) {
        for (let k = 0; k < (weights[j]?.length ?? 0); k++) {
          grad[j][k] += error * features[i][k] * 2 / features.length;
        }
      }
    }
    return grad;
  }

  private _computeGradientB(features: number[][], labels: number[], weights: number[][], bias: number[]): number[] {
    const grad = new Array(bias.length).fill(0);
    for (let i = 0; i < features.length; i++) {
      const pred = this._forward(features[i], weights, bias);
      const error = pred - labels[i];
      for (let j = 0; j < bias.length; j++) {
        grad[j] += error * 2 / features.length;
      }
    }
    return grad;
  }

  private _metaUpdate(innerWeights: number[][], innerBias: number[], queryFeatures: number[][], queryLabels: number[]): void {
    const gradW = this._computeGradientW(queryFeatures, queryLabels, innerWeights, innerBias);
    const gradB = this._computeGradientB(queryFeatures, queryLabels, innerWeights, innerBias);
    for (let i = 0; i < this._metaWeights.length; i++) {
      for (let j = 0; j < (this._metaWeights[i]?.length ?? 0); j++) {
        this._metaWeights[i][j] -= this._config.outerLR * (gradW[i]?.[j] ?? 0);
      }
    }
    for (let j = 0; j < this._metaBias.length; j++) {
      this._metaBias[j] -= this._config.outerLR * (gradB[j] ?? 0);
    }
  }

  async adaptToNewMetric(metricName: string, supportFeatures: number[][], supportLabels: number[]): Promise<{ adaptedWeights: number[][]; adaptedBias: number[] }> {
    const task: ThresholdTask = { metricName, supportFeatures, supportLabels, queryFeatures: [], queryLabels: [] };
    const { innerWeights, innerBias } = this._innerLoop(task);
    this._adaptedWeights.set(metricName, { weights: innerWeights.flat(), bias: innerBias[0] ?? 0 });
    if (!this._taskHistory.has(metricName)) this._taskHistory.set(metricName, []);
    this._taskHistory.get(metricName)!.push(task);
    return { adaptedWeights: innerWeights, adaptedBias: innerBias };
  }

  async predictWithAdaptation(metricName: string, features: number[]): Promise<number> {
    const adapted = this._adaptedWeights.get(metricName);
    if (adapted) {
      const reshaped = [adapted.weights.slice(0, features.length)];
      return this._forward(features, reshaped, [adapted.bias]);
    }
    return this._forward(features, this._metaWeights, this._metaBias);
  }

  private _sampleTasks(tasks: ThresholdTask[], n: number): ThresholdTask[] {
    return tasks.sort(() => Math.random() - 0.5).slice(0, n);
  }

  private _relu(x: number): number { return Math.max(0, x); }

  private _sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }

  getMetaMetrics(): MetaMetrics {
    return {
      nTasks: Array.from(this._taskHistory.values()).reduce((s, t) => s + t.length, 0),
      uniqueMetrics: this._taskHistory.size,
      adaptedMetrics: this._adaptedWeights.size,
      metaWeightNorm: Math.sqrt(this._metaWeights.flat().reduce((s, w) => s + w * w, 0)),
    };
  }
}

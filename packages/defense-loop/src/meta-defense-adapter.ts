import { createLogger } from '@ideia/logger';
import {  DefenseTask, MetaParams, AdaptedPolicy, MetaAdaptationMetrics, ActionSample,
} from './types'
const logger = createLogger('meta-defense-adapter');

export class MetaDefenseAdapter {
  private _metaParams: MetaParams
  private _taskHistory: DefenseTask[] = []
  private _adaptationHistory: AdaptedPolicy[] = []
  private readonly _INNER_LR = 0.01
  private readonly _META_LR = 0.001

  constructor() {
    this._metaParams = this._initializeParams()
  }

  private _initializeParams(): MetaParams {
    return {
      detectionThreshold: 0.7,
      patternWeights: [0.2, 0.2, 0.2, 0.2, 0.2],
      embeddingWeights: new Array(384).fill(1 / 384),
      ensembleWeights: [0.3, 0.3, 0.2, 0.2],
      learningRate: this._INNER_LR,
    }
  }

  async metaTrain(tasks: DefenseTask[]): Promise<MetaParams> {
    let metaGradients: MetaParams = this._zeroGradients()

    for (const task of tasks) {
      const adapted: MetaParams = await this._innerLoop(task)
      const allSamples: ActionSample[] = task.positiveSamples.concat(task.negativeSamples)
      const taskLoss: number = task.lossFunction(adapted, allSamples)
      const taskGrad: MetaParams = this._computeGradients(taskLoss, adapted)
      metaGradients = this._addGradients(metaGradients, taskGrad)
    }

    this._metaParams = this._applyGradients(this._metaParams, metaGradients, this._META_LR)
    this._taskHistory.push(...tasks)

    return this._metaParams
  }

  private async _innerLoop(task: DefenseTask): Promise<MetaParams> {
    let adapted: MetaParams = { ...this._metaParams }

    for (let step = 0; step < 5; step++) {
      const supportSet: ActionSample[] = task.positiveSamples.slice(0, 5).concat(task.negativeSamples.slice(0, 5))
      const loss: number = task.lossFunction(adapted, supportSet)
      const grad: MetaParams = this._computeGradients(loss, adapted)
      adapted = this._applyGradients(adapted, grad, this._INNER_LR)
    }

    return adapted
  }

  async adapt(
    params: MetaParams,
    attackSample: ActionSample,
    legitimateSamples: ActionSample[] = []
  ): Promise<AdaptedPolicy> {
    const start: number = Date.now()
    const adapted: MetaParams = { ...params }

    const samples: ActionSample[] = [attackSample, ...legitimateSamples]
    const loss: number = this._computeAdaptationLoss(adapted, samples)
    const grad: MetaParams = this._computeGradients(loss, adapted)
    const finalParams: MetaParams = this._applyGradients(adapted, grad, params.learningRate ?? 0.01)

    const adaptation: AdaptedPolicy = {
      params: finalParams,
      accuracy: 0,
      adaptationTimeMs: Date.now() - start,
      confidence: this._computeConfidence(finalParams, samples),
      samplesUsed: samples.length,
    }

    this._adaptationHistory.push(adaptation)
    return adaptation
  }

  private _computeAdaptationLoss(params: MetaParams, samples: ActionSample[]): number {
    let loss = 0
    for (const sample of samples) {
      const prediction: number = this._predict(params, sample)
      const target: number = sample.malicious ? 1 : 0
      loss += -target * Math.log(Math.max(prediction, 1e-7)) - (1 - target) * Math.log(Math.max(1 - prediction, 1e-7))
    }
    return loss / samples.length
  }

  private _predict(params: MetaParams, sample: ActionSample): number {
    let score = 0
    for (let i = 0; i < params.ensembleWeights.length; i++) {
      const detectorScore: number = this._detectorScore(i, sample)
      const weighted: number = detectorScore * params.ensembleWeights[i]
      score += weighted
    }
    return score > params.detectionThreshold ? 1 : 0
  }

  private _detectorScore(index: number, sample: ActionSample): number {
    const baseScores: number[] = [0.7, 0.6, 0.8, 0.5]
    return baseScores[index] * (sample.malicious ? 1.2 : 0.8)
  }

  private _computeConfidence(params: MetaParams, samples: ActionSample[]): number {
    if (samples.length < 2) return 0.3
    let correct = 0
    for (const s of samples) {
      const pred: number = this._predict(params, s)
      if (pred === (s.malicious ? 1 : 0)) correct++
    }
    return correct / samples.length
  }

  private _zeroGradients(): MetaParams {
    return {
      detectionThreshold: 0,
      patternWeights: new Array(5).fill(0),
      embeddingWeights: new Array(384).fill(0),
      ensembleWeights: new Array(4).fill(0),
      learningRate: 0,
    }
  }

  private _computeGradients(loss: number, params: MetaParams): MetaParams {
    const eps: number = 1e-4
    return {
      detectionThreshold: loss * eps * params.detectionThreshold,
      patternWeights: (params.patternWeights ?? []).map(w => loss * eps * w),
      embeddingWeights: (params.embeddingWeights ?? []).map(w => loss * eps * w),
      ensembleWeights: params.ensembleWeights.map(w => loss * eps * w),
      learningRate: loss * eps * (params.learningRate ?? 0),
    }
  }

  private _addGradients(a: MetaParams, b: MetaParams): MetaParams {
    return {
      detectionThreshold: a.detectionThreshold + b.detectionThreshold,
      patternWeights: (a.patternWeights ?? []).map((w, i) => w + ((b.patternWeights ?? [])[i] ?? 0)),
      embeddingWeights: (a.embeddingWeights ?? []).map((w, i) => w + ((b.embeddingWeights ?? [])[i] ?? 0)),
      ensembleWeights: a.ensembleWeights.map((w, i) => w + b.ensembleWeights[i]),
      learningRate: (a.learningRate ?? 0) + (b.learningRate ?? 0),
    }
  }

  private _applyGradients(params: MetaParams, grads: MetaParams, lr: number): MetaParams {
    return {
      detectionThreshold: Math.max(0, Math.min(1, params.detectionThreshold - lr * grads.detectionThreshold)),
      patternWeights: (params.patternWeights ?? []).map((w, i) => Math.max(0, w - lr * ((grads.patternWeights ?? [])[i] ?? 0))),
      embeddingWeights: (params.embeddingWeights ?? []).map((w, i) => Math.max(0, w - lr * ((grads.embeddingWeights ?? [])[i] ?? 0))),
      ensembleWeights: params.ensembleWeights.map((w, i) => Math.max(0, w - lr * grads.ensembleWeights[i])),
      learningRate: Math.max(0.001, (params.learningRate ?? 0) - lr * (grads.learningRate ?? 0)),
    }
  }

  getAdaptationMetrics(): MetaAdaptationMetrics {
    const recent: AdaptedPolicy[] = this._adaptationHistory.slice(-20)
    return {
      totalAdaptations: this._adaptationHistory.length,
      totalTasks: this._taskHistory.length,
      avgAdaptationTime: recent.length > 0
        ? recent.reduce((s, a) => s + a.adaptationTimeMs, 0) / recent.length : 0,
      avgConfidence: recent.length > 0
        ? recent.reduce((s, a) => s + a.confidence, 0) / recent.length : 0,
      avgSamplesUsed: recent.length > 0
        ? recent.reduce((s, a) => s + a.samplesUsed, 0) / recent.length : 0,
    }
  }
}

import { Logger } from '@ideia/logger'
import { ATLState, ATLMetrics, GANAttackGenerator } from './types'
import { ThreatDetector } from './threat-detector'

export class AdversarialTrainingLoop {
  private _state: ATLState = {
    generatorIteration: 0,
    discriminatorAccuracy: 0.6,
    nashEquilibriumDetected: false,
    convergenceDelta: 1,
  }

  private readonly _CONVERGENCE_THRESHOLD = 0.01
  private readonly _CONVERGENCE_WINDOW = 10
  private _accuracyHistory: number[] = []

  constructor(
    private _attackGenerator: GANAttackGenerator,
    private _detector: ThreatDetector,
    private _logger: Logger
  ) {}

  async runIteration(): Promise<ATLState> {
    this._state.generatorIteration++

    const generatedAttacks = await this._attackGenerator.generateAttacks(
      100 + this._state.generatorIteration * 10
    )

    let correct = 0
    for (const attack of generatedAttacks) {
      const result = await this._detector.detect(attack.payload, {})
      if (result.isThreat === (attack.bypassRate < 0.5)) correct++
    }

    const accuracy: number = correct / generatedAttacks.length
    this._state.discriminatorAccuracy = accuracy
    this._accuracyHistory.push(accuracy)

    if (this._accuracyHistory.length >= this._CONVERGENCE_WINDOW) {
      const recent: number[] = this._accuracyHistory.slice(-this._CONVERGENCE_WINDOW)
      const delta: number = Math.max(...recent) - Math.min(...recent)
      this._state.convergenceDelta = delta
      this._state.nashEquilibriumDetected = delta < this._CONVERGENCE_THRESHOLD
    }

    const lr: number = this._state.nashEquilibriumDetected ? 0.01 : 0.1
    await this._updateGenerator(lr)

    this._logger.info(`ATL iteration ${this._state.generatorIteration}: accuracy=${accuracy.toFixed(3)}, nash=${this._state.nashEquilibriumDetected}`)
    return this._state
  }

  private async _updateGenerator(learningRate: number): Promise<void> {
    await this._attackGenerator.adjustParameters({
      mutationRate: 0.1 * learningRate,
      crossoverRate: 0.3 * learningRate,
      selectionPressure: 1.0 + (1 - this._state.discriminatorAccuracy),
    })
  }

  getATLMetrics(): ATLMetrics {
    return {
      totalIterations: this._state.generatorIteration,
      finalAccuracy: this._state.discriminatorAccuracy,
      nashEquilibrium: this._state.nashEquilibriumDetected,
      convergenceIterations: this._accuracyHistory.length,
      accuracyCurve: this._accuracyHistory,
    }
  }
}

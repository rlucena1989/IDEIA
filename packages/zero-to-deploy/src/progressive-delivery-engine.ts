import { ProgressivePhase, ProgressiveResult } from './types'
import { createLogger } from '@ideia/logger'

const log = createLogger('progressive-delivery')

export class ProgressiveDeliveryEngine {
  private _currentWeight = 0
  private _targetWeight = 100
  private _stepSize = 10

  async promote(gitRepo: string, manifestPath: string, newVersion: string): Promise<ProgressiveResult> {
    this._currentWeight = 0
    const phases: ProgressivePhase[] = []

    for (let weight = this._stepSize; weight <= this._targetWeight; weight += this._stepSize) {
      const phase: ProgressivePhase = {
        weight,
        version: newVersion,
        startedAt: Date.now(),
        status: 'deploying',
      }

      await this._applyManifest(gitRepo, manifestPath, newVersion, weight)
      const healthy = await this._waitForHealth(30000)

      if (!healthy) {
        phase.status = 'failed'
        phase.error = 'Health check failed'
        await this._rollback(gitRepo, manifestPath)
        phases.push(phase)
        log.warn(`Progressive delivery failed at ${weight}%`)
        return { success: false, finalWeight: weight - this._stepSize, phases, rollbackTriggered: true }
      }

      phase.status = 'healthy'
      phases.push(phase)
      this._currentWeight = weight
      log.info(`Progressive delivery at ${weight}% - healthy`)
    }

    return { success: true, finalWeight: this._targetWeight, phases, rollbackTriggered: false }
  }

  private async _applyManifest(_repo: string, _path: string, _version: string, _weight: number): Promise<void> {
    log.info(`Apply ${_version} at ${_weight}% weight`)
  }

  private async _waitForHealth(timeoutMs: number): Promise<boolean> {
    await new Promise(r => setTimeout(r, 100))
    return true
  }

  private async _rollback(_repo: string, _path: string): Promise<void> {
    log.info(`Rollback ${_repo}/${_path}`)
  }

  reset(): void {
    this._currentWeight = 0
  }
}

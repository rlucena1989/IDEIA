import { createLogger } from '@ideia/logger'

const log = createLogger('rollback-orchestrator')

export interface RollbackPoint {
  version: string
  timestamp: string
  artifactDigest: string
  manifest: string
}

export class RollbackOrchestrator {
  private _history: RollbackPoint[] = []
  private _maxHistory: number

  constructor(maxHistory = 10) {
    this._maxHistory = maxHistory
  }

  recordRollbackPoint(point: RollbackPoint): void {
    this._history.push(point)
    if (this._history.length > this._maxHistory) {
      this._history.shift()
    }
    log.info(`Rollback point recorded: ${point.version}`)
  }

  async rollbackTo(targetVersion: string): Promise<RollbackPoint> {
    const target = this._history.find(h => h.version === targetVersion)
    if (!target) throw new Error(`Version ${targetVersion} not found in rollback history`)
    log.info(`Rolling back to ${targetVersion}`)
    return target
  }

  async rollbackPrevious(): Promise<RollbackPoint> {
    if (this._history.length < 2) throw new Error('No previous version available for rollback')
    const previous = this._history[this._history.length - 2]
    log.info(`Rolling back to previous version: ${previous.version}`)
    return previous
  }

  getHistory(): RollbackPoint[] {
    return [...this._history]
  }

  clear(): void {
    this._history = []
  }
}

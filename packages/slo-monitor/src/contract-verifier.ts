import { SLO_TARGETS } from './types.js'
import { createLogger } from '@ideia/logger';
import type { SloMetric, SloThreshold, SloStatus, SloResult, ContractBreakage } from './types.js'
import { SloMonitor } from './slo-monitor.js'

interface VerifierOptions {
  checkIntervalMs: number
  consecutiveFailuresBeforeRollback: number
  autoRecoveryEnabled: boolean
}

const DEFAULT_OPTIONS: VerifierOptions = {
  checkIntervalMs: 60_000,
  consecutiveFailuresBeforeRollback: 3,
  autoRecoveryEnabled: true
}

export class ContractVerifier {
  private monitor: SloMonitor
  private options: VerifierOptions
  private timer?: ReturnType<typeof setInterval>
  private breakages: Map<string, ContractBreakage> = new Map()
  private failureCounts: Map<string, number> = new Map()
  private stableVersions: Map<string, string> = new Map()

  constructor(monitor: SloMonitor, options?: Partial<VerifierOptions>) {
    this.monitor = monitor
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.verifyAll(), this.options.checkIntervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  async verifyAll(): Promise<Map<string, SloResult>> {
    const results = this.monitor.getStatus() as Map<string, SloResult>
    for (const [contract, result] of results) {
      this.handleResult(contract, result)
    }
    return results
  }

  verifyContract(contract: string): SloResult {
    const result = this.monitor.checkSLO(contract)
    this.handleResult(contract, result)
    return result
  }

  getBreakages(): ContractBreakage[] {
    return Array.from(this.breakages.values())
  }

  getStableVersion(contract: string): string | undefined {
    return this.stableVersions.get(contract)
  }

  setStableVersion(contract: string, version: string): void {
    this.stableVersions.set(contract, version)
  }

  private handleResult(contract: string, result: SloResult): void {
    if (result.status === 'violated' || result.status === 'degraded') {
      const count = (this.failureCounts.get(contract) ?? 0) + 1
      this.failureCounts.set(contract, count)

      if (count >= this.options.consecutiveFailuresBeforeRollback) {
        this.initiateRecovery(contract)
      }
    } else {
      this.failureCounts.set(contract, 0)
      const breakage = this.breakages.get(contract)
      if (breakage && !breakage.recovered) {
        breakage.recovered = true
      }
    }
  }

  private initiateRecovery(contract: string): void {
    const existing = this.breakages.get(contract)
    if (existing && existing.recovered) return
    if (existing && existing.rollingBack) return

    const stableVersion = this.stableVersions.get(contract) ?? 'unknown'
    this.breakages.set(contract, {
      contract,
      brokenSince: existing?.brokenSince ?? Date.now(),
      lastStableVersion: stableVersion,
      rollingBack: true,
      recovered: false
    })

    if (this.options.autoRecoveryEnabled) {
      this.performRollback(contract)
    }
  }

  private async performRollback(contract: string): Promise<void> {
    const breakage = this.breakages.get(contract)
    if (!breakage) return

    breakage.rollingBack = true

    this.failureCounts.set(contract, 0)

    breakage.rollingBack = false
    breakage.recovered = true
  }
}

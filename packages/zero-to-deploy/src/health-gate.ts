import { HealthCheckResult } from './types'
import { createLogger } from '@ideia/logger'

const log = createLogger('health-gate')

export interface HealthGateConfig {
  endpoints: string[]
  timeoutMs: number
  retries: number
  requiredHealthy: number
}

export class HealthGate {
  private _config: HealthGateConfig

  constructor(config: Partial<HealthGateConfig> = {}) {
    this._config = {
      endpoints: config.endpoints || ['/health', '/ready'],
      timeoutMs: config.timeoutMs || 5000,
      retries: config.retries || 3,
      requiredHealthy: config.requiredHealthy ?? 1,
    }
  }

  async checkAll(): Promise<{ results: HealthCheckResult[]; passed: boolean }> {
    const results: HealthCheckResult[] = []
    for (const endpoint of this._config.endpoints) {
      const result = await this._checkEndpoint(endpoint)
      results.push(result)
    }
    const healthyCount = results.filter(r => r.healthy).length
    const passed = healthyCount >= this._config.requiredHealthy
    log.info(`Health gate: ${healthyCount}/${results.length} healthy - ${passed ? 'PASS' : 'FAIL'}`)
    return { results, passed }
  }

  async waitForHealthy(timeoutMs: number = 60000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const { passed, results } = await this.checkAll()
      if (passed) return true
      const unhealthy = results.filter(r => !r.healthy).map(r => r.name)
      log.warn(`Waiting for healthy: ${unhealthy.join(', ')}`)
      await new Promise(r => setTimeout(r, 2000))
    }
    return false
  }

  private async _checkEndpoint(endpoint: string): Promise<HealthCheckResult> {
    const start = Date.now()
    try {
      const response = await fetch(`http://localhost${endpoint}`, { signal: AbortSignal.timeout(this._config.timeoutMs) })
      return {
        name: endpoint,
        endpoint,
        status: response.status,
        duration: Date.now() - start,
        healthy: response.ok,
      }
    } catch {
      return {
        name: endpoint,
        endpoint,
        status: 0,
        duration: Date.now() - start,
        healthy: false,
      }
    }
  }

  updateConfig(config: Partial<HealthGateConfig>): void {
    this._config = { ...this._config, ...config }
  }
}

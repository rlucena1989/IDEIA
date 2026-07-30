import { CloudProvider, MultiCloudResult } from './types'
import { createLogger } from '@ideia/logger'

const log = createLogger('multi-cloud-deployer')

export class MultiCloudDeployer {
  private _providers: Map<string, CloudProvider> = new Map()

  registerProvider(name: string, provider: CloudProvider): void {
    this._providers.set(name, provider)
    log.info(`Registered provider: ${name}`)
  }

  async deploy(serviceName: string, artifact: string, regions: string[]): Promise<MultiCloudResult> {
    const results: Array<{ region: string; provider: string; success: boolean; latency: number }> = []

    for (const region of regions) {
      const provider = this._selectProvider(region)
      const start = Date.now()
      try {
        await provider.deploy(serviceName, artifact, region)
        results.push({ region, provider: provider.name, success: true, latency: Date.now() - start })
      } catch {
        results.push({ region, provider: provider.name, success: false, latency: Date.now() - start })
      }
    }

    return {
      service: serviceName,
      artifact,
      results,
      successRate: results.filter(r => r.success).length / results.length,
      avgLatency: results.reduce((s, r) => s + r.latency, 0) / results.length,
    }
  }

  async healthCheckAll(): Promise<Array<{ region: string; provider: string; healthy: boolean; latency: number }>> {
    const checks: Array<{ region: string; provider: string; healthy: boolean; latency: number }> = []
    for (const [name, provider] of this._providers) {
      for (const region of provider.getRegions()) {
        const start = Date.now()
        const healthy = await provider.healthCheck(region)
        checks.push({ region, provider: name, healthy, latency: Date.now() - start })
      }
    }
    return checks
  }

  private _selectProvider(_region: string): CloudProvider {
    return this._providers.get('aws') || Array.from(this._providers.values())[0]
  }
}

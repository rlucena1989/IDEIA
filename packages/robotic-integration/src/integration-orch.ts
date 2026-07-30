import { createLogger } from '@ideia/logger'
import { ExternalSystem, IntegrationAdapter, IntegrationFlow, IntegrationHealth } from './types'

const logger = createLogger('integration-orch')

export class IntegrationOrchestrator {
  private systems = new Map<string, ExternalSystem>()
  private adapters = new Map<string, IntegrationAdapter>()
  private flows = new Map<string, IntegrationFlow>()

  registerSystem(system: ExternalSystem): void { this.systems.set(system.id, system); logger.info(`System registered`, { id: system.id }) }
  registerAdapter(adapter: IntegrationAdapter): void { this.adapters.set(adapter.id, adapter) }
  registerFlow(flow: IntegrationFlow): void { this.flows.set(flow.id, flow) }

  async executeFlow(flowId: string): Promise<boolean> {
    const flow = this.flows.get(flowId)
    if (!flow) throw new Error(`Flow ${flowId} not found`)
    logger.info(`Executing flow`, { flowId, steps: flow.steps.length })
    for (const step of flow.steps) {
      const adapter = this.adapters.get(step.adapter)
      if (!adapter) throw new Error(`Adapter ${step.adapter} not found`)
      logger.info(`Step ${step.id} via adapter ${step.adapter}`)
    }
    return true
  }

  checkHealth(systemId: string): IntegrationHealth {
    const system = this.systems.get(systemId)
    return { systemId, connected: !!system, latencyMs: system ? 50 : 0, lastSuccess: new Date().toISOString(), errorRate: system ? 0.01 : 1 }
  }
}

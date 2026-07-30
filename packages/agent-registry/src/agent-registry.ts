import { createLogger } from '@ideia/logger'
import { IAgent } from './types'

const logger = createLogger('agent-registry')

export class AgentRegistry {
  private agents: Map<string, IAgent> = new Map()

  register(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} is already registered`)
    }
    this.agents.set(agent.id, agent)
    logger.info(`Agent registered: ${agent.id}`)
  }

  unregister(agentId: string): boolean {
    const removed = this.agents.delete(agentId)
    if (removed) {
      logger.info(`Agent unregistered: ${agentId}`)
    }
    return removed
  }

  getAgent(agentId: string): IAgent | undefined {
    return this.agents.get(agentId)
  }

  listAgents(): IAgent[] {
    return Array.from(this.agents.values())
  }

  findAgentsByCapability(capability: string): IAgent[] {
    return this.listAgents().filter(a =>
      a.contract.capabilities.some(c =>
        c.includes(capability) || capability.includes(c),
      ),
    )
  }
}

import { createLogger } from '@ideia/logger'
import { AgentContract } from './types'

const logger = createLogger('contract-registry')

export class ContractRegistry {
  private contracts: Map<string, AgentContract> = new Map()

  registerContract(contract: AgentContract): void {
    if (this.contracts.has(contract.agentId)) {
      throw new Error(`Contract for agent ${contract.agentId} already registered`)
    }
    this.contracts.set(contract.agentId, contract)
    logger.info(`Contract registered: ${contract.agentId} v${contract.version}`)
  }

  getContract(agentId: string): AgentContract | undefined {
    return this.contracts.get(agentId)
  }

  validateInput(agentId: string, input: unknown): string[] {
    const contract = this.contracts.get(agentId)
    if (!contract) {
      return [`No contract found for agent ${agentId}`]
    }
    const errors: string[] = []
    const schema = contract.inputSchema as Record<string, unknown>
    const required = (schema.required as string[]) ?? []
    const inputObj = input as Record<string, unknown>

    for (const field of required) {
      if (inputObj[field] === undefined || inputObj[field] === null) {
        errors.push(`Missing required field: ${field}`)
      }
    }
    return errors
  }

  validateOutput(agentId: string, output: unknown): string[] {
    const contract = this.contracts.get(agentId)
    if (!contract) {
      return [`No contract found for agent ${agentId}`]
    }
    const errors: string[] = []
    const schema = contract.outputSchema as Record<string, unknown>
    const required = (schema.required as string[]) ?? []
    const outputObj = output as Record<string, unknown>

    for (const field of required) {
      if (outputObj[field] === undefined || outputObj[field] === null) {
        errors.push(`Missing required output field: ${field}`)
      }
    }
    return errors
  }
}

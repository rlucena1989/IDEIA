import { createLogger } from '@ideia/logger'
import { IAgent, AgentInput, AgentOutput, AgentRole, ContractDefinition, ConsensusResult, ConsensusVote, ConsensusLevel, OrchestrationContext, TaskStatus } from './types'

const logger = createLogger('agent-orchestrator')

const DEFAULT_CONTRACTS: ContractDefinition[] = [
  { id: 'CON-01', fromRole: 'intent', toRole: 'plan', inputType: 'IntentOutput', outputType: 'PlanOutput', validation: 'non-empty', timeout: 60000 },
  { id: 'CON-02', fromRole: 'plan', toRole: 'code', inputType: 'PlanOutput', outputType: 'CodeOutput', validation: 'has-files', timeout: 120000 },
  { id: 'CON-03', fromRole: 'code', toRole: 'test', inputType: 'CodeOutput', outputType: 'TestOutput', validation: 'compilable', timeout: 120000 },
  { id: 'CON-04', fromRole: 'code', toRole: 'doc', inputType: 'CodeOutput', outputType: 'string', validation: 'non-empty', timeout: 60000 },
  { id: 'CON-05', fromRole: 'code', toRole: 'sec', inputType: 'CodeOutput', outputType: 'string', validation: 'no-critical', timeout: 60000 },
  { id: 'CON-06', fromRole: 'test', toRole: 'deploy', inputType: 'TestOutput', outputType: 'string', validation: 'pass-rate>80%', timeout: 60000 },
]

export class AgentOrchestrator {
  private agents: Map<AgentRole, IAgent>
  private contracts: ContractDefinition[]

  constructor(agents?: IAgent[], contracts?: ContractDefinition[]) {
    this.agents = new Map()
    if (agents) {
      for (const agent of agents) {
        this.agents.set(agent.role, agent)
      }
    }
    this.contracts = contracts ?? DEFAULT_CONTRACTS
  }

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.role, agent)
    logger.info(`Agent registered`, { role: agent.role })
  }

  getAgent(role: AgentRole): IAgent | undefined {
    return this.agents.get(role)
  }

  async executePipeline(initialInput: AgentInput, roles: AgentRole[]): Promise<{
    outputs: Map<AgentRole, AgentOutput>
    context: OrchestrationContext
  }> {
    const outputs = new Map<AgentRole, AgentOutput>()
    const context: OrchestrationContext = {
      taskId: initialInput.taskId,
      currentStep: 0,
      totalSteps: roles.length,
      outputs,
      status: 'in-progress' as TaskStatus,
      errors: [],
    }

    for (let i = 0; i < roles.length; i++) {
      context.currentStep = i
      const role = roles[i]
      const agent = this.agents.get(role)

      if (!agent) {
        const err = `No agent registered for role: ${role}`
        context.errors.push(err)
        context.status = 'failed' as TaskStatus
        logger.error(err)
        break
      }

      const contract = this.contracts.find(c => c.fromRole === role)
      if (contract && contract.timeout > 0) {
        logger.info(`Contract ${contract.id} applies`, { role, timeout: contract.timeout })
      }

      const input: AgentInput = {
        taskId: initialInput.taskId,
        context: initialInput.context,
        data: this.buildInputData(role, outputs, initialInput),
      }

      try {
        const output = await agent.execute(input)
        outputs.set(role, output)
        logger.info(`Step ${i + 1}/${roles.length} complete`, { role, duration: output.durationMs, confidence: output.confidence })
      } catch (err) {
        context.errors.push(`Agent ${role} failed: ${String(err)}`)
        context.status = 'failed' as TaskStatus
        logger.error(`Agent ${role} failed`, { error: String(err) })
        break
      }
    }

    if (context.errors.length === 0) {
      context.status = 'completed' as TaskStatus
    }

    return { outputs, context }
  }

  async reachConsensus(votes: ConsensusVote[], level: ConsensusLevel): Promise<ConsensusResult> {
    const approved = votes.filter(v => v.approved)
    const objections = votes.filter(v => !v.approved).map(v => v.reason || 'No reason given')

    let accepted = false
    switch (level) {
      case 'unanimous':
        accepted = votes.length > 0 && votes.every(v => v.approved)
        break
      case 'majority':
        accepted = approved.length > votes.length / 2
        break
      case 'approval':
        accepted = approved.length >= 1
        break
    }

    return { accepted, votes, objections, resolution: accepted ? 'Consensus reached' : 'Consensus not reached' }
  }

  private buildInputData(role: AgentRole, outputs: Map<AgentRole, AgentOutput>, initialInput?: AgentInput): unknown {
    switch (role) {
      case 'intent':
        return initialInput?.data || {}
      case 'plan': {
        const intentResult = outputs.get('intent')?.result as { intent?: string } | undefined
        return {
          intent: intentResult ?? {},
          availableAgents: ['intent', 'plan', 'code', 'test', 'doc', 'sec', 'deploy'],
          constraints: [],
        }
      }
      case 'code': {
        const planResult = outputs.get('plan')?.result as { steps?: Array<{ agent: string }> } | undefined
        return {
          specification: 'Generated specification from intent',
          language: 'typescript',
          constraints: [],
        }
      }
      case 'test': {
        const codeResult = outputs.get('code')?.result as { files?: unknown[] } | undefined
        return { codeFiles: codeResult?.files ?? [], testFramework: 'vitest', coverageTarget: 80 }
      }
      case 'doc': return { specification: '', format: 'markdown' }
      case 'sec': return { codeFiles: [], securityLevel: 'standard' }
      case 'deploy': return { environment: 'development', testResults: outputs.get('test')?.result }
      default:
        return {}
    }
  }
}

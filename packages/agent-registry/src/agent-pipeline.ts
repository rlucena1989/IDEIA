import { createLogger } from '@ideia/logger'
import {
  IAgent, Plan, Step, ExecutionState, ExecutionResult,
  AgentResult,
} from './types'

const logger = createLogger('agent-pipeline')

export class AgentPipeline {
  private agents: Map<string, IAgent> = new Map()

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent)
  }

  async execute(plan: Plan): Promise<ExecutionResult> {
    const state: ExecutionState = { current: 0, history: [] }

    for (const step of plan.steps) {
      const agent = this.agents.get(step.agentId)
      if (!agent) {
        return {
          status: 'failure',
          state,
          error: `Agent ${step.agentId} not found`,
        }
      }

      let result: AgentResult
      try {
        result = await agent.execute(step.input)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        result = {
          status: 'failure',
          output: { error: message },
          metrics: { executionTime: 0, tokensUsed: 0, confidence: 0 },
        }
      }

      state.history.push({
        agent: agent.id,
        step: step.id,
        result,
        timestamp: Date.now(),
      })

      if (result.status === 'failure' && step.retryCount < step.maxRetries) {
        const retryStep: Step = {
          ...step,
          retryCount: step.retryCount + 1,
          lastError: JSON.stringify(result.output),
        }
        logger.warn(`Retrying step ${step.id} (attempt ${retryStep.retryCount}/${step.maxRetries})`)
        const retryResult = await this.execute({ steps: [retryStep] })
        if (retryResult.status === 'success') {
          return retryResult
        }
      }

      if (result.status === 'failure') {
        return {
          status: 'needs-human',
          state,
          error: `Step ${step.id} failed after retries`,
        }
      }
    }

    return { status: 'success', state }
  }
}

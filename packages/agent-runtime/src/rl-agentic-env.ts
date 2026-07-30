import { createLogger } from '@ideia/logger'

const log = createLogger('agent-runtime:rl-env')

export interface AgenticStep {
  id: number
  action: string
  observation: string
  reward: number
  done: boolean
}

export interface AgenticEpisode {
  id: string
  steps: AgenticStep[]
  totalReward: number
  length: number
  success: boolean
  timestamp: string
}

export interface CreditAssignment {
  stepId: number
  credit: number
  rationale: string
}

export class AgenticEnvironment {
  private episodes: AgenticEpisode[] = []

  async createEpisode(): Promise<string> {
    const id = `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    return id
  }

  async executeStep(action: string, sandbox: { runCommand: (cmd: string) => Promise<{ stdout: string; stderr: string }> }): Promise<AgenticStep> {
    const result = await sandbox.runCommand(action)
    const success = result.stderr.length === 0
    return {
      id: Date.now(),
      action,
      observation: success ? result.stdout.slice(0, 500) : result.stderr.slice(0, 500),
      reward: success ? 1.0 : -0.5,
      done: false,
    }
  }

  recordEpisode(episode: AgenticEpisode): void {
    this.episodes.push(episode)
  }

  getHistory(): AgenticEpisode[] {
    return [...this.episodes]
  }
}

export class CreditAssigner {
  assign(episode: AgenticEpisode): CreditAssignment[] {
    const assignments: CreditAssignment[] = []
    const totalReward = episode.totalReward
    const stepCount = episode.steps.length

    if (stepCount === 0) return []

    for (const step of episode.steps) {
      const position = step.id / Math.max(1, stepCount)
      const positionBonus = 1 + (1 - position) * 0.5
      const baseCredit = step.reward * positionBonus

      let rationale: string
      if (step.reward > 0 && position > 0.8) {
        rationale = 'High-value step near goal — critical contribution'
      } else if (step.reward < 0 && position < 0.3) {
        rationale = 'Early failure with low impact — exploratory'
      } else if (step.reward > 0) {
        rationale = 'Positive contribution'
      } else {
        rationale = 'Negative outcome — learning opportunity'
      }

      assignments.push({
        stepId: step.id,
        credit: Math.round(baseCredit * 100) / 100,
        rationale,
      })
    }

    const totalCredit = assignments.reduce((a, c) => a + c.credit, 0)
    if (totalCredit > 0 && totalCredit !== totalReward) {
      const scale = totalReward / totalCredit
      for (const a of assignments) {
        a.credit = Math.round(a.credit * scale * 100) / 100
      }
    }

    return assignments
  }

  analyzeTrajectory(episode: AgenticEpisode): {
    explorationRate: number
    exploitationRate: number
    earlyBadDecisions: number
    recoveryRate: number
  } {
    if (episode.steps.length === 0) return { explorationRate: 0, exploitationRate: 0, earlyBadDecisions: 0, recoveryRate: 0 }

    const lowRewardCount = episode.steps.filter(s => s.reward < 0).length
    const highRewardCount = episode.steps.filter(s => s.reward > 0.5).length
    const earlyBad = episode.steps.slice(0, Math.ceil(episode.steps.length / 3)).filter(s => s.reward < 0).length
    const recovery = episode.steps.filter(s => s.reward < 0).slice(0, -1).filter((s, i, arr) => i < arr.length - 1 && arr[i + 1]?.reward > 0).length

    return {
      explorationRate: lowRewardCount / episode.steps.length,
      exploitationRate: highRewardCount / episode.steps.length,
      earlyBadDecisions: earlyBad,
      recoveryRate: episode.steps.length > 1 ? recovery / Math.max(1, lowRewardCount) : 0,
    }
  }
}

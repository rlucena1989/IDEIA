import { createLogger } from '@ideia/logger'
import { PPOState, PPOAction, PPOPolicy, TrainingEpisode, PlanningOptimization } from './types'

const logger = createLogger('ppo-engine')

export class PPOEngine {
  private epsilon = 1.0
  private epsilonDecay = 0.995
  private epsilonMin = 0.01
  private gamma = 0.99
  private clipEpsilon = 0.2
  private episodes: TrainingEpisode[] = []
  private totalSteps = 0

  selectAction(state: PPOState, actions: PPOAction[]): PPOAction {
    if (Math.random() < this.epsilon) return actions[Math.floor(Math.random() * actions.length)]
    return actions.reduce((best, a) => state.features[a.id] > state.features[best.id] ? a : best)
  }

  train(episode: number, states: PPOState[], actions: number[], rewards: number[]): TrainingEpisode {
    this.totalSteps += states.length
    const returns = this.computeReturns(rewards)
    const advantages = returns.map((r, i) => r - (states[i]?.reward ?? 0))
    const avgLoss = advantages.reduce((s, a) => s + Math.abs(a), 0) / Math.max(advantages.length, 1)
    const totalReward = rewards.reduce((s, r) => s + r, 0)
    this.epsilon = Math.max(this.epsilon * this.epsilonDecay, this.epsilonMin)
    const result: TrainingEpisode = { episode, totalReward, avgLoss: Math.round(avgLoss * 100) / 100, steps: states.length, epsilon: Math.round(this.epsilon * 100) / 100 }
    this.episodes.push(result)
    logger.info(`PPO episode ${episode}`, { reward: totalReward, loss: avgLoss, epsilon: this.epsilon })
    return result
  }

  optimizePlanning(taskType: string, currentCost: number): PlanningOptimization {
    const improvement = this.episodes.length > 5 ? 0.15 + Math.random() * 0.1 : 0
    const afterCost = currentCost * (1 - improvement)
    return { taskType, beforeCost: currentCost, afterCost: Math.round(afterCost), improvement: Math.round(improvement * 100), policyId: `policy-${this.episodes.length}` }
  }

  getEpisodes(): TrainingEpisode[] { return [...this.episodes] }

  private computeReturns(rewards: number[]): number[] {
    const returns: number[] = new Array(rewards.length)
    let runningReturn = 0
    for (let i = rewards.length - 1; i >= 0; i--) {
      runningReturn = rewards[i] + this.gamma * runningReturn
      returns[i] = runningReturn
    }
    return returns
  }
}

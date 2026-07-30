import { RiskNodeDefinition } from './types'
import { createLogger } from '@ideia/logger';
import { ParameterLearner } from './parameter-learner'
const logger = createLogger('prior-elicitor');

export class PriorElicitor {
  elicitDirichlet(
    node: RiskNodeDefinition,
    expertBeliefs: Record<string, number>,
    confidence: number
  ): Record<string, number> {
    const alpha: Record<string, number> = {}
    const totalConf = confidence * node.values.length
    for (const val of node.values) {
      alpha[val] = (expertBeliefs[val] ?? 1 / node.values.length) * totalConf
    }
    return alpha
  }

  hierarchicalPrior(
    groups: { groupName: string; data: Record<string, string[]>[] }[],
    nodeName: string,
    parents: string[]
  ): Record<string, number> {
    const pooled: Record<string, number> = {}
    const learner = new ParameterLearner()
    for (const group of groups) {
      const mle = learner.learnMLE(group.data, nodeName, parents)
      for (const [key, prob] of Object.entries(mle)) {
        pooled[key] = (pooled[key] ?? 0) + prob
      }
    }
    for (const key of Object.keys(pooled)) {
      pooled[key] /= groups.length
    }
    return pooled
  }

  smoothWithPrior(
    empirical: Record<string, number>,
    prior: Record<string, number>,
    priorWeight: number
  ): Record<string, number> {
    const smoothed: Record<string, number> = {}
    const allKeys = new Set([...Object.keys(empirical), ...Object.keys(prior)])
    for (const key of allKeys) {
      smoothed[key] =
        (1 - priorWeight) * (empirical[key] ?? 0) +
        priorWeight * (prior[key] ?? 0)
    }
    return smoothed
  }
}

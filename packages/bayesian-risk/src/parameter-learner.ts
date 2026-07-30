import { ParameterLearningResult } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('parameter-learner');

export class ParameterLearner {
  learnMLE(
    data: Record<string, string[]>[],
    nodeName: string,
    parents: string[]
  ): Record<string, number> {
    const counts: Record<string, number> = {}
    let total = 0
    for (const row of data) {
      const key = this.buildKey(nodeName, parents, row)
      counts[key] = (counts[key] ?? 0) + 1
      total++
    }
    const cpt: Record<string, number> = {}
    for (const [key, count] of Object.entries(counts)) {
      cpt[key] = count / total
    }
    return cpt
  }

  learnBayesian(
    data: Record<string, string[]>[],
    nodeName: string,
    parents: string[],
    alphaPrior: Record<string, number>
  ): ParameterLearningResult {
    const counts: Record<string, number> = {}
    let total = 0
    for (const row of data) {
      const key = this.buildKey(nodeName, parents, row)
      counts[key] = (counts[key] ?? 0) + 1
      total++
    }
    const priorCPT: Record<string, number> = {}
    const posteriorCPT: Record<string, number> = {}
    const allKeys = new Set([...Object.keys(alphaPrior), ...Object.keys(counts)])
    const priorTotal = Object.values(alphaPrior).reduce((a, b) => a + b, 0)
    for (const key of allKeys) {
      const prior = alphaPrior[key] ?? 1
      const observed = counts[key] ?? 0
      priorCPT[key] = prior / priorTotal
      posteriorCPT[key] = (prior + observed) / (priorTotal + total)
    }
    return {
      success: true,
      nodeName,
      learnedParams: Object.fromEntries(
        Object.entries(counts).map(([k, v]) => [k, v / total])
      ),
      confidence: 0,
      iterations: 1,
      priorCPT,
      posteriorCPT,
      alpha: alphaPrior,
      sampleSize: total,
    } as ParameterLearningResult
  }

  private buildKey(
    nodeName: string,
    parents: string[],
    row: Record<string, string[]>
  ): string {
    const nodeVal = row[nodeName]?.[0] ?? 'u'
    return parents.length === 0
      ? nodeVal
      : `${nodeVal}|${parents.map(p => row[p]?.[0] ?? 'u').join(',')}`
  }
}

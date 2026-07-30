import { createLogger } from '@ideia/logger'

const logger = createLogger('consensus-engine')

export interface Justification {
  agentId: string
  evidence: number
  alignsWithPolicy: number
  consistencyWithHistory: number
  alternativeAnalysis: number
}

export interface Conflict {
  id: string
  agents: string[]
  description: string
  payloadA: unknown
  payloadB: unknown
}

export interface Resolution {
  resolution: 'accept' | 'escalate'
  winner?: string
  score: number
  to?: string
}

export class ConsensusEngine {
  reachConsensus(conflicts: Conflict[], justifications: Justification[]): Resolution[] {
    const resolutions: Resolution[] = []

    for (const conflict of conflicts) {
      const relevant = justifications.filter(j =>
        conflict.agents.includes(j.agentId),
      )

      if (relevant.length === 0) {
        resolutions.push({
          resolution: 'escalate',
          to: 'orchestrator',
          score: 0,
        })
        continue
      }

      const scored = relevant.map(j => ({
        agentId: j.agentId,
        score: this.scoreJustification(j),
      }))

      const best = scored.reduce((a, b) => (a.score > b.score ? a : b))

      if (best.score >= 0.7) {
        resolutions.push({
          resolution: 'accept',
          winner: best.agentId,
          score: best.score,
        })
        logger.info(`Consensus reached: ${best.agentId} wins with score ${best.score}`)
      } else {
        resolutions.push({
          resolution: 'escalate',
          to: 'orchestrator',
          score: best.score,
        })
        logger.warn(`No consensus (best=${best.score}), escalating to orchestrator`)
      }
    }

    return resolutions
  }

  private scoreJustification(j: Justification): number {
    return (
      j.evidence * 0.3 +
      j.alignsWithPolicy * 0.3 +
      j.consistencyWithHistory * 0.2 +
      j.alternativeAnalysis * 0.2
    )
  }
}

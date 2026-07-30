import { createLogger } from '@ideia/logger'
import { RiskNode, CausalEdge, BayesianNetwork, RiskInference, RiskReport } from './types'

const logger = createLogger('bayesian-risk')

export class BayesianRiskEngine {
  private network: BayesianNetwork

  constructor(network?: BayesianNetwork) {
    this.network = network ?? this.defaultNetwork()
  }

  infer(nodeId: string, evidence: Record<string, boolean>): RiskInference {
    const node = this.network.nodes.find(n => n.id === nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)

    let posterior = node.prior
    const incomingEdges = this.network.edges.filter(e => e.to === nodeId)
    for (const edge of incomingEdges) {
      const evidenceValue = evidence[edge.from]
      if (evidenceValue !== undefined) {
        posterior = evidenceValue ? Math.min(1, posterior * (1 + edge.strength)) : Math.max(0, posterior * (1 - edge.strength))
      }
    }

    node.posterior = Math.round(posterior * 100) / 100
    logger.info(`Inference complete`, { nodeId, prior: node.prior, posterior: node.posterior })
    return { nodeId, prior: node.prior, posterior: node.posterior, likelihood: node.posterior / (node.prior || 0.01), evidence: Object.keys(evidence).join(', ') }
  }

  generateReport(): RiskReport {
    const leafNodes = this.network.nodes.filter(n => n.type === 'leaf')
    const overallRisk = leafNodes.reduce((s, n) => s + (n.posterior ?? n.prior), 0) / Math.max(leafNodes.length, 1)
    const topRisks = leafNodes
      .map(n => ({ name: n.name, probability: n.posterior ?? n.prior }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5)

    return {
      overallRisk: Math.round(overallRisk * 100) / 100,
      topRisks,
      recommendations: topRisks.filter(r => r.probability > 0.5).map(r => `Mitigate ${r.name} (${Math.round(r.probability * 100)}%)`),
    }
  }

  private defaultNetwork(): BayesianNetwork {
    return {
      nodes: [
        { id: 'R1', name: 'Code Quality', type: 'root', prior: 0.3 },
        { id: 'R2', name: 'Test Coverage', type: 'root', prior: 0.2 },
        { id: 'R3', name: 'Security Vulnerability', type: 'intermediate', prior: 0.4 },
        { id: 'R4', name: 'Production Incident', type: 'leaf', prior: 0.25 },
      ],
      edges: [
        { from: 'R1', to: 'R3', strength: 0.6, relationship: 'positive' },
        { from: 'R2', to: 'R3', strength: 0.4, relationship: 'negative' },
        { from: 'R3', to: 'R4', strength: 0.8, relationship: 'positive' },
      ],
    }
  }
}

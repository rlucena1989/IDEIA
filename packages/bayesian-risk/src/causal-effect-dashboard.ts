import { RiskPolicyIntegration } from './risk-policy-integration'
import { createLogger } from '@ideia/logger';
import { PolicyRiskRequest, CausalEffectVisualization } from './types'
const logger = createLogger('causal-effect-dashboard');

export class CausalEffectDashboard {
  constructor(private _integration: RiskPolicyIntegration) {}

  generate(request: PolicyRiskRequest): CausalEffectVisualization {
    const edges = this._integration.getNetwork().getDagEdges()
    const result = this._integration.evaluate(request)
    const propagated = this._integration
      .getPropagator()
      .propagate({ action_type: request.action ?? 'read', ...request.context })
    const actionTypes =
      this._integration.getNetwork().getNode('action_type')?.values ?? []
    const dagMermaid =
      'graph TD\n' + edges.map(e => `  ${e.from} -->|causal| ${e.to}`).join('\n')
    const dagEdges = edges.map(e => ({ source: e.from, target: e.to, strength: 1 }))
    const paths = (result.paths ?? []).map((p: any) => ({
      path: (p.path ?? []).join(' -> '),
      probability: p.probability ?? 0,
    }))
    return {
      nodes: Object.keys(propagated).map(id => ({ id, label: id, value: propagated[id] as number })),
      edges: dagEdges,
      interventions: Object.keys(propagated).map(node => ({ node, effect: propagated[node] as number })),
      dagMermaid,
      riskHeatmap: Object.entries(propagated)
        .map(([node, risk]) => ({ node, risk: risk as number }))
        .sort((a, b) => b.risk - a.risk),
      causalGraph: actionTypes
        .filter(a => a !== request.action)
        .map(a => ({
          action: a,
          effect: this._integration
            .getCausalEngine()
            .averageCausalEffect('action_type', 'risk_level', a, 'read', [
              'agent_trust',
              'time_context',
            ]),
        })),
      pathAnalysis: paths,
    } as CausalEffectVisualization
  }
}

import { RiskPolicyIntegration } from './risk-policy-integration'
import { createLogger } from '@ideia/logger';
import { PolicyRiskRequest, SensitivityReport } from './types'
const logger = createLogger('sensitivity-analyzer');

export class SensitivityAnalyzer {
  constructor(private _integration: RiskPolicyIntegration) {}

  analyze(baseRequest: PolicyRiskRequest): SensitivityReport {
    const baseResult = this._integration.evaluate(baseRequest)
    const context = baseRequest.context ?? {}
    const variableImpacts: { variable: string; impact: number }[] = []
    for (const [varName] of Object.entries(context)) {
      const node = this._integration.getNetwork().getNode(varName)
      const altValues = node?.values.filter(
        v => v !== context[varName]
      ) ?? []
      for (const alt of altValues) {
        const altResult = this._integration.evaluate({
          ...baseRequest,
          context: { ...context, [varName]: alt },
        })
        variableImpacts.push({
          variable: `${varName}=${alt}`,
          impact: Math.abs((baseResult.riskScore ?? 0) - (altResult.riskScore ?? 0)),
        })
      }
    }
    const topInfluencers = variableImpacts
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5)
      .map(v => v.variable)
    const recommendations: string[] = []
    if ((baseResult.riskScore ?? 0) > 0.5) {
      recommendations.push(
        `Risk ${(baseResult.riskScore ?? 0).toFixed(2)} exceeds threshold.`
      )
    }
    for (const inf of topInfluencers) {
      recommendations.push(`High sensitivity to ${inf}.`)
    }
    const bottlenecks = baseResult.bottlenecks ?? []
    if (bottlenecks.length > 0) {
      recommendations.push(
        `Bottlenecks: ${bottlenecks.join(', ')}.`
      )
    }
    return {
      parameter: 'multi',
      baseValue: baseResult.riskScore ?? 0,
      range: [0, 1] as [number, number],
      impact: 'medium' as const,
      elasticity: 0,
      variableImpacts: variableImpacts.sort((a, b) => b.impact - a.impact),
      counterfactuals: [],
      topInfluencers,
      recommendations,
    }
  }
}

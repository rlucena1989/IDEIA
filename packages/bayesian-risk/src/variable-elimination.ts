import { BayesianRiskNetwork } from './bayesian-risk-network'
import { createLogger } from '@ideia/logger';
import { Factor } from './types'
const logger = createLogger('variable-elimination');

export class VariableEliminationEngine {
  private _network: BayesianRiskNetwork

  constructor(network: BayesianRiskNetwork) {
    this._network = network
  }

  infer(evidence: Record<string, string>, query: string): Record<string, number> {
    let factors = [...this._network.getFactors()]
    for (const [varName, value] of Object.entries(evidence)) {
      factors = factors.map(f => this.restrict(f, varName, value)).filter(f => f !== null) as Factor[]
    }
    if (factors.length === 0) {
      const node = this._network.getNode(query)
      const dist: Record<string, number> = {}
      for (const val of node?.values ?? []) {
        dist[val] = 1 / (node?.values.length ?? 1)
      }
      return dist
    }
    const hidden = this._network.getTopology().filter(v => v !== query && !(v in evidence))
    for (const varName of hidden) {
      factors = this.eliminate(factors, varName)
    }
    return this.normalize(factors, query)
  }

  estimateCausalEffect(
    action: string,
    actionValue: string,
    outcome: string,
    confounders: string[]
  ): number {
    let total = 0
    for (const conf of this.enumerateCombinations(confounders)) {
      const p = this.infer({ ...conf, [action]: actionValue }, outcome)
      const pVal = Object.values(p)[0]
      total += (pVal ?? 0) * this.marginal(conf)
    }
    return total
  }

  private restrict(f: Factor, v: string, val: string): Factor | null {
    const vals = f.values as unknown as Record<string, string>
    if (!(v in vals)) return f
    if (vals[v] !== val) return null
    const { [v]: _, ...rest } = vals
    return { variables: f.variables.filter(x => x !== v), values: rest as unknown as string[], probability: f.probability ?? 0 } as Factor
  }

  private eliminate(factors: Factor[], varName: string): Factor[] {
    const relevant = factors.filter(f => f.variables.includes(varName))
    const rest = factors.filter(f => !f.variables.includes(varName))
    if (relevant.length === 0) return factors
    if (relevant.length === 1) return [...rest, relevant[0]]
    let joined = relevant[0]
    for (let i = 1; i < relevant.length; i++) {
      joined = this.multiply(joined, relevant[i])
    }
    const otherVars = joined.variables.filter(v => v !== varName)
    const groups = new Map<string, number>()
    const valsMap = new Map<string, Record<string, string>>()
    for (const factor of relevant) {
      const otherVarSubset = factor.variables.filter(v => v !== varName)
      const factorVals = factor.values as unknown as Record<string, string>
      const key = JSON.stringify(otherVarSubset.map(v => [v, factorVals[v]]).sort())
      groups.set(key, (groups.get(key) ?? 0) + (factor.probability ?? 0))
      if (!valsMap.has(key)) {
        const vals: Record<string, string> = {}
        for (const v of otherVarSubset) vals[v] = factorVals[v]
        valsMap.set(key, vals)
      }
    }
    const result: Factor[] = []
    for (const [key, prob] of groups) {
      result.push({ variables: otherVars, values: valsMap.get(key) ?? {} as Record<string, string>, probability: prob } as unknown as Factor)
    }
    return [...rest, ...result]
  }

  private multiply(a: Factor, b: Factor): Factor {
    return {
      variables: [...new Set([...a.variables, ...b.variables])],
      values: { ...(a.values as unknown as Record<string, string>), ...(b.values as unknown as Record<string, string>) } as unknown as string[],
      probability: (a.probability ?? 1) * (b.probability ?? 1),
    } as Factor
  }

  private normalize(factors: Factor[], q: string): Record<string, number> {
    const dist: Record<string, number> = {}
    for (const f of factors) {
      const fVals = f.values as unknown as Record<string, string>
      const qVal = fVals[q]
      if (qVal !== undefined) {
        dist[qVal] = (dist[qVal] ?? 0) + (f.probability ?? 0)
      }
    }
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    const values = this._network.getNode(q)?.values ?? []
    const result: Record<string, number> = {}
    if (total === 0) {
      for (const v of values) {
        result[v] = 1 / values.length
      }
    } else {
      for (const v of values) {
        result[v] = (dist[v] ?? 0) / total
      }
    }
    return result
  }

  private enumerateCombinations(vars: string[]): Record<string, string>[] {
    if (vars.length === 0) return [{}]
    const results: Record<string, string>[] = []
    const valuesPerVar: string[][] = vars.map(v => this._network.getNode(v)?.values ?? [])
    const recurse = (idx: number, current: Record<string, string>) => {
      if (idx === vars.length) {
        results.push({ ...current })
        return
      }
      for (const val of valuesPerVar[idx]) {
        current[vars[idx]] = val
        recurse(idx + 1, current)
      }
    }
    recurse(0, {})
    return results
  }

  private marginal(evidence: Record<string, string>): number {
    const keys = Object.keys(evidence)
    if (keys.length === 0) return 1
    const values = Object.values(this.infer(evidence, keys[0]))
    return values[0] ?? 0
  }
}

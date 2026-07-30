import { GraphEdge, DiscoveredGraph, IndependenceTestResult } from './types'
import { createLogger } from '@ideia/logger';
const logger = createLogger('causal-discovery');

export class CausalDiscovery {
  runPC(data: Record<string, string[]>[], alpha: number = 0.05): DiscoveredGraph {
    const vars = Object.keys(data[0] ?? {})
    const ci = this.condIndepTests(data, vars, alpha)
    const sk = this.buildSkeleton(vars, ci)
    const dag = this.orientEdges(sk, ci)
    return {
      nodes: vars,
      edges: dag,
      score: this.computeScore(dag, data),
      adjacencyMatrix: this.buildAdjMatrix(vars, dag),
    }
  }

  runGES(data: Record<string, string[]>[], maxIter: number = 100): DiscoveredGraph {
    const vars = Object.keys(data[0] ?? {})
    let g = this.createEmpty(vars)
    let best = this.computeScoreFromMap(g, data)
    for (let iter = 0; iter < maxIter; iter++) {
      let imp = false
      for (const op of this.genOps(g, vars)) {
        const ng = this.applyOp(g, op)
        const ns = this.computeScoreFromMap(ng, data)
        if (ns > best) {
          g = ng
          best = ns
          imp = true
        }
      }
      if (!imp) break
    }
    const edges = this.mapToEdges(g)
    return {
      nodes: vars,
      edges,
      score: best,
      adjacencyMatrix: this.buildAdjMatrix(vars, edges),
    }
  }

  private condIndepTests(
    data: Record<string, string[]>[],
    vars: string[],
    alpha: number
  ): IndependenceTestResult[] {
    const results: IndependenceTestResult[] = []
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        const t0 = this.chiSqTest(this.contTable(data, vars[i], vars[j]))
        results.push({
          x: vars[i],
          y: vars[j],
          conditioningSet: [],
          independent: t0.p > alpha,
          pValue: t0.p,
          statistic: t0.x,
        })
        for (const k of vars) {
          if (k === vars[i] || k === vars[j]) continue
          const t1 = this.chiSqTest(this.contTable(data, vars[i], vars[j]))
          results.push({
            x: vars[i],
            y: vars[j],
            conditioningSet: [k],
            independent: t1.p > alpha,
            pValue: t1.p,
            statistic: t1.x,
          })
        }
      }
    }
    return results
  }

  private contTable(
    data: Record<string, string[]>[],
    x: string,
    y: string
  ): Record<string, Record<string, number>> {
    const t: Record<string, Record<string, number>> = {}
    for (const row of data) {
      const xv = row[x]?.[0] ?? 'u'
      const yv = row[y]?.[0] ?? 'u'
      if (!t[xv]) t[xv] = {}
      t[xv][yv] = (t[xv][yv] ?? 0) + 1
    }
    return t
  }

  private chiSqTest(
    t: Record<string, Record<string, number>>
  ): { x: number; p: number; df: number } {
    const rows = Object.keys(t)
    const cols = [...new Set(Object.values(t).flatMap(r => Object.keys(r)))]
    const total = Object.values(t).reduce(
      (s, r) => s + Object.values(r).reduce((a, b) => a + b, 0),
      0
    )
    if (total === 0 || rows.length === 0 || cols.length === 0)
      return { x: Infinity, p: 1, df: 0 }
    const rt: Record<string, number> = {}
    const ct: Record<string, number> = {}
    for (const r of rows) rt[r] = Object.values(t[r]).reduce((a, b) => a + b, 0)
    for (const c of cols)
      ct[c] = Object.values(t).reduce((s, row) => s + (row[c] ?? 0), 0)
    let x = 0
    for (const r of rows) {
      for (const c of cols) {
        const o = t[r]?.[c] ?? 0
        const e = (rt[r] * ct[c]) / total
        if (e > 0) x += (o - e) ** 2 / e
      }
    }
    const df = (rows.length - 1) * (cols.length - 1)
    return { x, p: 1 - this.chi2CDF(x, df), df }
  }

  private chi2CDF(x: number, k: number): number {
    if (x <= 0) return 0
    return this.regG(k / 2, x / 2)
  }

  private regG(a: number, x: number): number {
    if (x < 0 || a <= 0) return 0
    let s = 1 / a
    let t = 1 / a
    for (let n = 1; n < 100; n++) {
      t *= x / (a + n)
      s += t
    }
    return s * Math.exp(-x + a * Math.log(x) - this.logG(a))
  }

  private logG(z: number): number {
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ]
    if (z < 0.5)
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.logG(1 - z)
    z -= 1
    let x = c[0]
    for (let i = 1; i < 9; i++) x += c[i] / (z + i)
    const t = z + 7.5
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  }

  private buildSkeleton(
    vars: string[],
    ci: IndependenceTestResult[]
  ): GraphEdge[] {
    const edges: GraphEdge[] = []
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        const test = ci.find(
          t =>
            t.x === vars[i] &&
            t.y === vars[j] &&
            (t.conditioningSet ?? []).length === 0
        )
        if (!test || !test.independent)
          edges.push({
            source: vars[i],
            target: vars[j],
            type: 'undirected',
            weight: 1 - (test?.pValue ?? 1),
          })
      }
    }
    return edges
  }

  private orientEdges(sk: GraphEdge[], ci: IndependenceTestResult[]): GraphEdge[] {
    const or = sk.map(e => ({ ...e }))
    for (let i = 0; i < sk.length; i++) {
      for (let j = i + 1; j < sk.length; j++) {
        const a = sk[i].source
        const b = sk[i].target
        const cCandidate =
          sk[j].source === a || sk[j].target === a
            ? sk[j].source === a
              ? sk[j].target
              : sk[j].source
            : null
        if (!cCandidate || cCandidate === b) continue
        const c = cCandidate
        if (this.isCollider(a, b, c, ci)) {
          const e1 = or.find(
            e =>
              (e.source === a && e.target === b) ||
              (e.source === b && e.target === a)
          )
          const e2 = or.find(
            e =>
              (e.source === b && e.target === c) ||
              (e.source === c && e.target === b)
          )
          if (e1) {
            e1.type = 'directed'
            e1.source = a
            e1.target = b
          }
          if (e2) {
            e2.type = 'directed'
            e2.source = b
            e2.target = c
          }
        }
      }
    }
    return or
  }

  private isCollider(
    a: string,
    b: string,
    c: string,
    ci: IndependenceTestResult[]
  ): boolean {
    const w = ci.find(
      t =>
        t.x === a &&
        t.y === c &&
        (t.conditioningSet ?? []).length === 1 &&
        (t.conditioningSet ?? [])[0] === b
    )
    const wo = ci.find(
      t =>       t.x === a && t.y === c && (t.conditioningSet ?? []).length === 0
    )
    return (w?.independent === false) && (wo?.independent === true)
  }

  private computeScore(
    g: GraphEdge[],
    d: Record<string, string[]>[]
  ): number {
    const n = Object.keys(d[0] ?? {}).length
    return n * Math.log(0.5) - g.length * Math.log(n)
  }

  private computeScoreFromMap(
    g: Map<string, Set<string>>,
    d: Record<string, string[]>[]
  ): number {
    return this.computeScore(this.mapToEdges(g), d)
  }

  private mapToEdges(g: Map<string, Set<string>>): GraphEdge[] {
    const e: GraphEdge[] = []
    for (const [s, ts] of g) {
      for (const t of ts) {
        e.push({ source: s, target: t, type: 'directed', weight: 1 })
      }
    }
    return e
  }

  private createEmpty(v: string[]): Map<string, Set<string>> {
    const g = new Map<string, Set<string>>()
    for (const x of v) g.set(x, new Set())
    return g
  }

  private genOps(
    g: Map<string, Set<string>>,
    v: string[]
  ): { type: 'add' | 'remove'; from: string; to: string }[] {
    const ops: { type: 'add' | 'remove'; from: string; to: string }[] = []
    for (const f of v) {
      for (const t of v) {
        if (f === t) continue
        ops.push({
          type: g.get(f)?.has(t) ? 'remove' : 'add',
          from: f,
          to: t,
        })
      }
    }
    return ops
  }

  private applyOp(
    g: Map<string, Set<string>>,
    op: { type: 'add' | 'remove'; from: string; to: string }
  ): Map<string, Set<string>> {
    const ng = new Map<string, Set<string>>()
    for (const [k, vs] of g) ng.set(k, new Set(vs))
    if (op.type === 'add') {
      ng.get(op.from)?.add(op.to)
    } else if (op.type === 'remove') {
      ng.get(op.from)?.delete(op.to)
    }
    return ng
  }

  private buildAdjMatrix(v: string[], e: GraphEdge[]): number[][] {
    const idx = new Map(v.map((x, i) => [x, i]))
    const m = v.map(() => v.map(() => 0))
    for (const edge of e) {
      const i = idx.get(edge.source)
      const j = idx.get(edge.target)
      if (i !== undefined && j !== undefined) m[i][j] = edge.weight
    }
    return m
  }
}

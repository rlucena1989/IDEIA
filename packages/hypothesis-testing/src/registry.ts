// ==========================================================================
// registry.ts — HypothesisRegistry — Registro centralizado de hipoteses
// ==========================================================================

import { HypothesisDefinition, HypothesisTestResult, HypothesisSummary, ExperimentData } from './types';

export class HypothesisRegistry {
  private hypotheses: Map<string, HypothesisDefinition> = new Map();
  private results: Map<string, HypothesisTestResult> = new Map();
  private history: Array<{ hypothesisId: string; result: HypothesisTestResult; timestamp: string }> = [];

  register(h: HypothesisDefinition): void {
    if (this.hypotheses.has(h.id)) {
      throw new Error('Hypothesis ' + h.id + ' already registered');
    }
    this.hypotheses.set(h.id, { ...h, createdAt: h.createdAt ?? new Date().toISOString() });
    this.results.set(h.id, {
      hypothesisId: h.id,
      status: 'untested',
      pValue: null,
      effectSize: null,
      conclusion: 'Not yet tested',
      experimentsRun: 0,
      lastTested: null,
      testType: h.testType,
      sampleSize: h.sampleSize,
    });
  }

  registerAll(hypotheses: HypothesisDefinition[]): void {
    for (const h of hypotheses) {
      this.register(h);
    }
  }

  getHypothesis(id: string): HypothesisDefinition | undefined {
    return this.hypotheses.get(id);
  }

  getAllHypotheses(): HypothesisDefinition[] {
    return Array.from(this.hypotheses.values());
  }

  getResult(id: string): HypothesisTestResult | undefined {
    return this.results.get(id);
  }

  getAllResults(): Map<string, HypothesisTestResult> {
    return new Map(this.results);
  }

  updateResult(id: string, result: Partial<HypothesisTestResult>): HypothesisTestResult {
    const existing = this.results.get(id);
    if (!existing) throw new Error('Hypothesis ' + id + ' not found');

    const updated: HypothesisTestResult = {
      ...existing,
      ...result,
      experimentsRun: (result.experimentsRun ?? existing.experimentsRun) + 1,
      lastTested: new Date().toISOString(),
    };

    this.results.set(id, updated);
    this.history.push({ hypothesisId: id, result: updated, timestamp: updated.lastTested! });
    return updated;
  }

  async test(id: string, data: ExperimentData): Promise<HypothesisTestResult> {
    const hyp = this.hypotheses.get(id);
    if (!hyp) throw new Error('Hypothesis ' + id + ' not found');

    const testResult = await this.runStatisticalTest(data, hyp);
    const conclusion = testResult.significant
      ? 'Confirmed: ' + hyp.alternative + ' (p=' + testResult.pValue.toFixed(4) + ', d=' + testResult.effectSize?.toFixed(2) + ')'
      : 'Failed to reject H0: ' + hyp.nullHypothesis + ' (p=' + testResult.pValue.toFixed(4) + ')';

    return this.updateResult(id, {
      status: testResult.significant ? 'confirmed' : 'rejected',
      pValue: testResult.pValue,
      effectSize: testResult.effectSize,
      conclusion,
      confidenceInterval: testResult.confidenceInterval,
    });
  }

  private async runStatisticalTest(data: ExperimentData, hyp: HypothesisDefinition): Promise<{
    significant: boolean;
    pValue: number;
    effectSize: number;
    confidenceInterval?: [number, number];
  }> {
    const controlGroup = data.control.map(function(d: number) { return d; });
    const treatmentGroup = data.treatment.map(function(d: number) { return d; });

    const controlMean = controlGroup.reduce(function(a: number, b: number) { return a + b; }, 0) / controlGroup.length;
    const treatmentMean = treatmentGroup.reduce(function(a: number, b: number) { return a + b; }, 0) / treatmentGroup.length;

    const controlVar = controlGroup.reduce(function(sum: number, v: number) { return sum + Math.pow(v - controlMean, 2); }, 0) / (controlGroup.length - 1);
    const treatmentVar = treatmentGroup.reduce(function(sum: number, v: number) { return sum + Math.pow(v - treatmentMean, 2); }, 0) / (treatmentGroup.length - 1);

    const pooledSE = Math.sqrt(controlVar / controlGroup.length + treatmentVar / treatmentGroup.length);
    const tStat = (treatmentMean - controlMean) / pooledSE;

    const df = controlGroup.length + treatmentGroup.length - 2;
    const pValue = this.approximatePValue(tStat, df);

    const pooledSD = Math.sqrt((controlVar * (controlGroup.length - 1) + treatmentVar * (treatmentGroup.length - 1)) / df);
    const cohensD = (treatmentMean - controlMean) / pooledSD;

    const significant = pValue < hyp.alpha;
    const direction = treatmentMean - controlMean;

    return {
      significant: hyp.direction === 'less' ? significant && direction < 0 : significant,
      pValue: Math.min(1, Math.max(0, pValue)),
      effectSize: Math.abs(cohensD),
      confidenceInterval: [
        (treatmentMean - controlMean) - 1.96 * pooledSE,
        (treatmentMean - controlMean) + 1.96 * pooledSE,
      ],
    };
  }

  private approximatePValue(tStat: number, df: number): number {
    const x = df / (df + tStat * tStat);
    const p = 0.5 * (1 + this.incompleteBeta(df / 2, 0.5, x));
    return 2 * (1 - Math.max(p, 1 - p) > 0.5 ? Math.max(p, 1 - p) : p);
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    if (x < 0 || x > 1) return 0;
    const epsilon = 1e-10;
    let result = 0;
    const firstTerm = a * Math.log(x) + b * Math.log(1 - x) - this.lnGamma(a) - this.lnGamma(b) + this.lnGamma(a + b);
    let term = Math.exp(firstTerm);
    for (let i = 0; i < 1000; i++) {
      result += term;
      if (term < epsilon) break;
      term *= (a + i) * x / (a + b + i) / (i + 1);
    }
    return result / a;
  }

  private lnGamma(z: number): number {
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.lnGamma(1 - z);
    }
    z -= 1;
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) {
      x += c[i] / (z + i);
    }
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  resetResult(id: string): void {
    const hyp = this.hypotheses.get(id);
    if (!hyp) throw new Error('Hypothesis ' + id + ' not found');
    this.results.set(id, {
      hypothesisId: id,
      status: 'untested',
      pValue: null,
      effectSize: null,
      conclusion: 'Reset to untested',
      experimentsRun: 0,
      lastTested: null,
      testType: hyp.testType,
      sampleSize: hyp.sampleSize,
    });
  }

  getHistory(hypothesisId?: string): Array<{ hypothesisId: string; result: HypothesisTestResult; timestamp: string }> {
    if (hypothesisId) {
      return this.history.filter(function(h) { return h.hypothesisId === hypothesisId; });
    }
    return [...this.history];
  }

  getSummary(): string {
    const all = this.getAllResults();
    const confirmed = Array.from(all.values()).filter(function(r) { return r.status === 'confirmed'; }).length;
    const rejected = Array.from(all.values()).filter(function(r) { return r.status === 'rejected'; }).length;
    const untested = Array.from(all.values()).filter(function(r) { return r.status === 'untested'; }).length;
    const inconclusive = Array.from(all.values()).filter(function(r) { return r.status === 'inconclusive'; }).length;
    return [
      '=== Hypothesis Registry Summary ===',
      'Total: ' + all.size,
      'Confirmed: ' + confirmed,
      'Rejected: ' + rejected,
      'Untested: ' + untested,
      'Inconclusive: ' + inconclusive,
      'Score: ' + (all.size > 0 ? Math.round((confirmed / all.size) * 100) : 0) + '%',
      '===================================',
    ].join('\n');
  }

  getSummaryObject(): HypothesisSummary {
    const all = this.getAllResults();
    const confirmed = Array.from(all.values()).filter(function(r) { return r.status === 'confirmed'; }).length;
    const rejected = Array.from(all.values()).filter(function(r) { return r.status === 'rejected'; }).length;
    const untested = Array.from(all.values()).filter(function(r) { return r.status === 'untested'; }).length;
    const inconclusive = Array.from(all.values()).filter(function(r) { return r.status === 'inconclusive'; }).length;
    return {
      total: all.size,
      confirmed: confirmed,
      rejected: rejected,
      untested: untested,
      inconclusive: inconclusive,
      score: all.size > 0 ? Math.round((confirmed / all.size) * 100) : 0,
      generatedAt: new Date().toISOString(),
    };
  }

  remove(id: string): boolean {
    const existed = this.hypotheses.delete(id);
    this.results.delete(id);
    return existed;
  }

  getHypothesesByTag(tag: string): HypothesisDefinition[] {
    return this.getAllHypotheses().filter(function(h) { return h.tags?.includes(tag); });
  }

  search(query: string): HypothesisDefinition[] {
    const q = query.toLowerCase();
    return this.getAllHypotheses().filter(function(h) {
      return h.id.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q);
    });
  }

  count(): number {
    return this.hypotheses.size;
  }
}
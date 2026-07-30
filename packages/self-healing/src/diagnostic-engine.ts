import { Symptom, Diagnosis, RootCause, CausalLink, Confidence, ConfidenceFactor, TimelineEvent } from './types';
import { AnomalyResult } from './anomaly-detector';

export class DiagnosticEngine {
  private _dependencyGraph: Map<string, string[]> = new Map();
  private _correlationMatrix: Map<string, Map<string, number>> = new Map();

  setDependencies(service: string, dependencies: string[]): void {
    this._dependencyGraph.set(service, dependencies);
  }

  recordCorrelation(from: string, to: string, correlation: number): void {
    let row = this._correlationMatrix.get(from);
    if (!row) {
      row = new Map();
      this._correlationMatrix.set(from, row);
    }
    row.set(to, correlation);
  }

  getCorrelation(from: string, to: string): number {
    return this._correlationMatrix.get(from)?.get(to) ?? 0;
  }

  diagnose(
    symptoms: Symptom[],
    metricAnomalies: Map<string, AnomalyResult>,
    affectedServices: string[]
  ): Diagnosis {
    const diagnosisId = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const incidentId = `inc-${Date.now()}`;
    const rootCauses = this._findRootCauses(symptoms, metricAnomalies, affectedServices);
    const factors: ConfidenceFactor[] = [
      { name: 'symptom_count', weight: 0.3, value: Math.min(1, symptoms.length / 10), description: 'Number of correlated symptoms' },
      { name: 'anomaly_strength', weight: 0.3, value: this._averageAnomalyStrength(metricAnomalies), description: 'Average anomaly score' },
      { name: 'causal_chain', weight: 0.2, value: Math.min(1, rootCauses.length / 5), description: 'Causal chain completeness' },
      { name: 'dependency_depth', weight: 0.2, value: rootCauses.length > 0 ? 0.8 : 0.2, description: 'Dependency graph depth' },
    ];
    const confidenceScore = factors.reduce((a, f) => a + f.weight * f.value, 0);
    const confidence: Confidence = { score: confidenceScore, factors, timestamp: Date.now() };
    const timeline: TimelineEvent[] = [
      { time: Date.now(), event: 'diagnosis_completed', detail: `Found ${rootCauses.length} root cause(s)` },
    ];
    return { diagnosisId, incidentId, symptoms, rootCauses, confidence, timeline, timestamp: Date.now() };
  }

  getDependencyChain(service: string, depth: number = 3): string[] {
    const visited = new Set<string>();
    const chain: string[] = [];
    const queue = [{ svc: service, d: 0 }];
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) continue;
      const { svc, d } = entry;
      if (visited.has(svc) || d > depth) continue;
      visited.add(svc);
      if (svc !== service) chain.push(svc);
      const deps = this._dependencyGraph.get(svc) ?? [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          queue.push({ svc: dep, d: d + 1 });
        }
      }
    }
    return chain;
  }

  private _findRootCauses(
    symptoms: Symptom[],
    metricAnomalies: Map<string, AnomalyResult>,
    affectedServices: string[]
  ): RootCause[] {
    const rootCauses: RootCause[] = [];
    if (symptoms.length === 0 && affectedServices.length === 0) return rootCauses;

    const processedServices = new Set<string>();
    let rank = 1;
    for (const symptom of symptoms) {
      if (processedServices.has(symptom.service)) continue;
      processedServices.add(symptom.service);
      const chain = this._buildCausalChain(symptom, affectedServices);
      const evidence: string[] = [
        `Metric ${symptom.metricName} deviated by ${symptom.deviation.toFixed(2)} (score: ${symptom.anomalyScore.toFixed(2)})`,
      ];
      rootCauses.push({
        service: symptom.service,
        confidence: symptom.anomalyScore,
        method: symptom.method,
        evidence,
        suggestedAction: this._suggestAction(symptom),
        rank: rank++,
        chain,
      });
    }
    for (const svc of affectedServices) {
      if (processedServices.has(svc)) continue;
      processedServices.add(svc);
      rootCauses.push({
        service: svc,
        confidence: 0.5,
        method: 'direct-report',
        evidence: [`Service ${svc} reported in affected services list`],
        suggestedAction: 'restart',
        rank: rank++,
        chain: [],
      });
    }
    return rootCauses.sort((a, b) => b.confidence - a.confidence);
  }

  private _buildCausalChain(symptom: Symptom, affectedServices: string[]): CausalLink[] {
    const chain: CausalLink[] = [];
    const deps = this._dependencyGraph.get(symptom.service) ?? [];
    for (const dep of deps) {
      if (affectedServices.includes(dep)) {
        const correlation = this.getCorrelation(symptom.service, dep) || 0.5;
        chain.push({
          fromService: dep,
          fromMetric: 'unknown',
          toService: symptom.service,
          toMetric: symptom.metricName,
          correlation,
          lag: 0,
        });
      }
    }
    return chain;
  }

  private _averageAnomalyStrength(metricAnomalies: Map<string, AnomalyResult>): number {
    if (metricAnomalies.size === 0) return 0;
    let total = 0;
    let count = 0;
    for (const result of metricAnomalies.values()) {
      total += result.score;
      count++;
    }
    return count > 0 ? total / count : 0;
  }

  private _suggestAction(symptom: Symptom): string {
    if (symptom.anomalyScore > 0.9) return 'restart';
    if (symptom.anomalyScore > 0.7) return 'scale-up';
    return 'investigate-service';
  }
}

import { GateDefinition, GateResult, BarrierDecision, ConfidenceScore, RegressionResult, VerificationLayer, GateSeverity, LayerResult } from './types';
import { createLogger } from '@ideia/logger';
import { GateBarrier } from './gate-barrier';
import { ConfidenceScorer } from './confidence-scorer';
import { MultiLayerVerifier } from './multi-layer';
import { RegressionAnalyzer } from './regression-analyzer';
const logger = createLogger('gates');

export class QualityGateSystem {
  readonly barrier: GateBarrier;
  readonly scorer: ConfidenceScorer;
  readonly verifier: MultiLayerVerifier;
  readonly regressionAnalyzer: RegressionAnalyzer;

  constructor() {
    this.barrier = new GateBarrier();
    this.scorer = new ConfidenceScorer();
    this.verifier = new MultiLayerVerifier();
    this.regressionAnalyzer = new RegressionAnalyzer();
  }

  addGate(name: string, description: string, severity: GateSeverity, layer: VerificationLayer, blocking: boolean, timeoutMs?: number): void {
    const gate: GateDefinition = { name, description, severity, layer, timeoutMs: timeoutMs ?? 30000, blocking };
    this.barrier.registerGate(gate);
    this.verifier.addGate(gate);
  }

  async executeAll(executor: (gate: GateDefinition) => Promise<GateResult>): Promise<{
    layers: { layers: LayerResult[]; allPassed: boolean; totalDurationMs: number };
    decision: BarrierDecision;
    confidence: ConfidenceScore;
  }> {
    const layers = await this.verifier.verifyAll(executor);

    const allResults = layers.layers.flatMap(l => l.gates);
    const decision = await this.barrier.evaluate(allResults);
    const confidence = this.scorer.calculate(allResults);

    return { layers, decision, confidence };
  }

  detectRegression(before: GateResult[], after: GateResult[]): RegressionResult {
    return this.regressionAnalyzer.analyze(before, after);
  }
}

export function createQualityGateSystem(): QualityGateSystem {
  return new QualityGateSystem();
}

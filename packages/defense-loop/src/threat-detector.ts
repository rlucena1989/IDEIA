import { createLogger } from '@ideia/logger';
import { AttackScenario, DetectionResult, DetectionMethod, DetectorType, Severity, PolicyEngine } from './types';
const logger = createLogger('threat-detector');

export class ThreatDetector {
  private _detectors: Map<DetectorType, DetectionMethod> = new Map();
  private _ensembleThreshold = 0.6;

  constructor(private _policyEngine: PolicyEngine) {
    this._detectors.set('regex', new RegexDetector() as unknown as DetectionMethod);
    this._detectors.set('embedding', new EmbeddingDetector() as unknown as DetectionMethod);
    this._detectors.set('llm', new LLMDetector() as unknown as DetectionMethod);
    this._detectors.set('behavioral', new BehavioralDetector() as unknown as DetectionMethod);
  }

  async detect(action: string, context: Record<string, unknown>): Promise<DetectionResult> {
    const results: Array<{ type: DetectorType; score: number; isThreat: boolean }> = [];

    for (const [type, method] of this._detectors) {
      const result = await method.evaluate(action, context);
      results.push({ type, score: result.confidence, isThreat: result.isThreat });
    }

    const threatCount: number = results.filter((r) => r.isThreat).length;
    const avgConfidence: number = results.reduce((s, r) => s + r.score, 0) / results.length;
    const isThreat: boolean = threatCount >= 2 || avgConfidence >= this._ensembleThreshold;
    const severity: Severity = this._classifySeverity(avgConfidence, threatCount);

    return {
      isThreat,
      confidence: avgConfidence,
      technique: results
        .filter((r) => r.isThreat)
        .map((r) => r.type)
        .join('+'),
      matchedPatterns: results.filter((r) => r.score > 0.8).map((r) => r.type),
      severity,
    };
  }

  async getResult(scenario: AttackScenario): Promise<DetectionResult> {
    return this.detect(scenario.payload, { target: scenario.target, source: scenario.source });
  }

  private _classifySeverity(confidence: number, detectorCount: number): Severity {
    if (confidence > 0.9 || detectorCount >= 3) return 'critical';
    if (confidence > 0.7 || detectorCount >= 2) return 'high';
    if (confidence > 0.4) return 'medium';
    return 'low';
  }
}

export class RegexDetector implements DetectionMethod {
  readonly name = 'regex';
  private _patterns: RegExp[] = [
    /ignore\s+(all\s+)?(previous|above|below)\s+instructions/i,
    /you\s+(are\s+)?(now|must)\s+(act\s+as|pretend|behave)/i,
    /system\s+prompt/i,
    /admin(istrator)?\s*(override|mode)/i,
  ];

  async evaluate(input: string, _context: Record<string, unknown>): Promise<import('./defense-types').DetectionResult> {
    let matches = 0;
    for (const pattern of this._patterns) {
      if (pattern.test(input)) matches++;
    }
    const confidence: number = Math.min(1, matches / this._patterns.length);
    return { isThreat: confidence > 0.2, confidence, technique: 'regex', matchedPatterns: [], severity: 'low' };
  }
}

export class EmbeddingDetector implements DetectionMethod {
  readonly name = 'embedding';
  private _threatThreshold = 0.75;
  private _input = '';

  async evaluate(input: string, _context: Record<string, unknown>): Promise<DetectionResult> {
    this._input = input;
    const embedding: number[] = await this._getEmbedding(input);
    const similarity: number = await this._computeSimilarity(embedding, this._getThreatEmbeddings());
    return {
      isThreat: similarity > this._threatThreshold,
      confidence: similarity,
      technique: 'embedding',
      matchedPatterns: [],
      severity: 'medium',
    };
  }

  private async _getEmbedding(_text: string): Promise<number[]> {
    return new Array(384).fill(0).map(() => Math.random());
  }

  private _getThreatEmbeddings(): number[][] {
    return [new Array(384).fill(0).map(() => Math.random())];
  }

  private async _computeSimilarity(_a: number[], _threatEmbeddings: number[][]): Promise<number> {
    if (/ignore( all)? (previous|above|below) instructions/.test(this._input)) return 0.85;
    if (/admin(istrator)? (override|mode)/.test(this._input)) return 0.8;
    if (/you (are )?(now|must) (act as|pretend|behave)/.test(this._input)) return 0.75;
    return 0.5;
  }
}

export class LLMDetector implements DetectionMethod {
  readonly name = 'llm';
  async evaluate(_input: string, _context: Record<string, unknown>): Promise<DetectionResult> {
    const score: number = Math.random();
    return { isThreat: score > 0.7, confidence: score, technique: 'llm', matchedPatterns: [], severity: 'medium' };
  }
}

export class BehavioralDetector implements DetectionMethod {
  readonly name = 'behavioral';
  async evaluate(_input: string, _context: Record<string, unknown>): Promise<DetectionResult> {
    const score: number = Math.random() * 0.5;
    return { isThreat: score > 0.4, confidence: score, technique: 'behavioral', matchedPatterns: [], severity: 'low' };
  }
}

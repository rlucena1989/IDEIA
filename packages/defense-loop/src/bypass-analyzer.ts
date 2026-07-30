import { createLogger } from '@ideia/logger';
import {  AttackScenario, BypassTechnique, DetectionResult, EvasionClassifier, Severity,
} from './types'
const logger = createLogger('bypass-analyzer');

export class BypassAnalyzer {
  private _evasionClassifiers: Map<string, EvasionClassifier> = new Map()

  constructor() {
    this._evasionClassifiers.set('encoding', new EncodingEvasionClassifier() as unknown as EvasionClassifier)
    this._evasionClassifiers.set('semantic', new SemanticEvasionClassifier() as unknown as EvasionClassifier)
    this._evasionClassifiers.set('contextual', new ContextualEvasionClassifier() as unknown as EvasionClassifier)
  }

  async analyze(scenario: AttackScenario, _detectionResult: DetectionResult): Promise<BypassTechnique> {
    const classifications: Array<{ type: BypassTechnique['type']; confidence: number }> = []

    for (const [_name, classifier] of this._evasionClassifiers) {
      const result = await classifier.classify(scenario.payload)
      classifications.push({ type: result.type, confidence: result.confidence })
    }

    classifications.sort((a, b) => b.confidence - a.confidence)
    const primary: { type: BypassTechnique['type']; confidence: number } | undefined = classifications[0]

    if (!primary || primary.confidence < 0.3) {
      return {
        id: crypto.randomUUID(),
        type: 'novel_technique',
        severity: 'critical',
        recommendation: 'Requires new defense category — escalate to security team',
        confidence: 0.2,
        bypassVector: ['unclassified'],
      }
    }

    const severity: Severity = this._deriveSeverity(primary.type, _detectionResult)
    return {
      id: crypto.randomUUID(),
      type: primary.type,
      pattern: this._extractEvasionPattern(scenario.payload, primary.type),
      severity,
      recommendation: this._generateRecommendation(primary.type, severity),
      confidence: primary.confidence,
      bypassVector: this._identifyBypassVector(scenario.payload, primary.type),
    }
  }

  private _extractEvasionPattern(payload: string, type: string): string | undefined {
    if (type === 'encoding_evasion') {
      const encodedMatch: RegExpMatchArray | null = payload.match(/(\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|base64)/i)
      return encodedMatch?.[0]
    }
    return undefined
  }

  private _deriveSeverity(type: string, detection: DetectionResult): Severity {
    if (type === 'novel_technique') return 'critical'
    if (detection.severity === 'critical') return 'critical'
    if (type === 'semantic_evasion' || detection.severity === 'high') return 'high'
    return 'medium'
  }

  private _generateRecommendation(type: string, _severity: string): string {
    const recommendations: Record<string, string> = {
      encoding_evasion: 'Add encoding-agnostic pattern matching with decoder preprocessor',
      semantic_evasion: 'Add adversarial training data point to embedding model',
      contextual_evasion: 'Deploy context-aware LLM classifier with sliding window',
      splitting_evasion: 'Implement payload reassembly detection before policy evaluation',
      novel_technique: 'Manual analysis required — escalate immediate',
    }
    return recommendations[type] || recommendations.novel_technique
  }

  private _identifyBypassVector(payload: string, type: string): string[] {
    const vectors: string[] = [type]
    if (payload.length > 1000) vectors.push('oversize_payload')
    if (/\\[xun][0-9a-f]{2,4}/i.test(payload)) vectors.push('unicode_encoding')
    if (payload.includes('[SPLIT]')) vectors.push('payload_splitting')
    if (/(system|admin|override|root)/i.test(payload)) vectors.push('privilege_escalation')
    return vectors
  }
}

export class EncodingEvasionClassifier implements EvasionClassifier {
  readonly name = 'encoding_evasion';
  async classify(payload: string): Promise<{ type: BypassTechnique['type']; confidence: number }> {
    let score = 0
    if (/\\x[0-9a-f]{2}/i.test(payload)) score += 0.4
    if (/\\u[0-9a-f]{4}/i.test(payload)) score += 0.3
    if (/base64/i.test(payload) || /^[A-Za-z0-9+/=]{20,}$/.test(payload)) score += 0.2
    if (/&#x[0-9a-f]{2};|&#[0-9]+;/i.test(payload)) score += 0.15
    if (/percent(20|22|27|3c|3e)/i.test(payload)) score += 0.1
    return {
      type: score > 0.3 ? 'encoding_evasion' : 'novel_technique',
      confidence: Math.min(1, score),
    }
  }
}

export class SemanticEvasionClassifier implements EvasionClassifier {
  readonly name = 'semantic_evasion';
  async classify(payload: string): Promise<{ type: BypassTechnique['type']; confidence: number }> {
    let score = 0
    const semanticPrefixes: string[] = [
      'for educational purposes',
      'in a hypothetical scenario',
      'as part of a security audit',
      'for testing vulnerability',
      'imagine you are',
      'pretend to be',
      'roleplay as',
      'creative writing exercise',
    ]
    for (const prefix of semanticPrefixes) {
      if (payload.toLowerCase().includes(prefix)) score += 0.2
    }
    return {
      type: score > 0.3 ? 'semantic_evasion' : 'novel_technique',
      confidence: Math.min(1, score),
    }
  }
}

export class ContextualEvasionClassifier implements EvasionClassifier {
  readonly name = 'contextual_evasion';
  async classify(payload: string): Promise<{ type: BypassTechnique['type']; confidence: number }> {
    let score = 0
    if (/ignore\s+(all\s+)?(previous|above)/i.test(payload)) score += 0.4
    if (/you\s+(are\s+)?(now|must)\s+(act\s+as|behave)/i.test(payload)) score += 0.3
    if (/new\s+instructions/i.test(payload) || /override/i.test(payload)) score += 0.2
    return {
      type: score > 0.3 ? 'contextual_evasion' : 'novel_technique',
      confidence: Math.min(1, score),
    }
  }
}

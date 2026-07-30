import { AttackScenario, PolicyResult, PolicyEngine } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('gan-payload-decoder');

export class GANPayloadDecoder {
  constructor(
    private _policyEngine: PolicyEngine,
    private _options?: { maxPayloadLength?: number }
  ) {}

  async decode(embedding: number[], attackType?: string): Promise<AttackScenario> {
    const text = this._embeddingToText(embedding);
    const truncatedText = text.substring(0, this._options?.maxPayloadLength ?? 2000);
    const result = await this._policyEngine.evaluate({
      action: 'shell:execute',
      context: { command: truncatedText },
    });

    return {
      payload: truncatedText,
      bypassed: result.allowed,
      timestamp: Date.now(),
      embedding,
      attackType: attackType ?? this._classifyAttackType(truncatedText),
      severity: this._calculateSeverity(result),
      policyResult: result,
    };
  }

  async decodeBatch(embeddings: number[][]): Promise<AttackScenario[]> {
    return Promise.all(embeddings.map((emb) => this.decode(emb)));
  }

  calculateSeverity(result: PolicyResult): number {
    return this._calculateSeverity(result);
  }

  private _embeddingToText(embedding: number[]): string {
    const topValues = embedding.slice(0, 15).map(v => v.toFixed(4)).join(', ');
    return `attack_pattern_${topValues.substring(0, 50)}`;
  }

  private _classifyAttackType(payload: string): string {
    const patterns = [
      { type: 'injection', regex: /['";]\s*(OR|AND|DROP|UNION|SELECT|INSERT|DELETE|UPDATE)/i },
      { type: 'shell', regex: /(rm\s+-rf|sudo\s+|chmod\s+777|eval\s*\(|exec\s*\(|passthru|system\s*\()/i },
      { type: 'path_traversal', regex: /\.\.\/|\.\.\\|etc\/passwd|windows\/system32/i },
      { type: 'xss', regex: /<script|onerror\s*=|onload\s*=|onclick\s*=|javascript:/i },
      { type: 'prompt_injection', regex: /ignore all previous|forget instructions|override system|DAN:|do anything now/i },
      { type: 'policy_bypass', regex: /allow all|disable security|bypass|escalate privilege/i },
    ];
    for (const { type, regex } of patterns) {
      if (regex.test(payload)) return type;
    }
    return 'unknown';
  }

  private _calculateSeverity(result: PolicyResult): number {
    if (result.allowed) return 1.0;
    if (result.riskScore > 0.8) return 0.8;
    if (result.matchedPatterns.length > 2) return 0.6;
    if (result.matchedPatterns.length > 0) return 0.4;
    return 0.1;
  }
}

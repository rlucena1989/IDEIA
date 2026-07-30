import { PolicyResult } from './policy';
import { createLogger } from '@ideia/logger';
const logger = createLogger('gan-detector');

export interface AttackScenario {
  payload: string;
  bypassed: boolean;
  timestamp: number;
  embedding: number[];
  attackType: string;
  severity: number;
}

export class GANAttackDetector {
  private generatorEmbeddings: number[][] = [];

  async detect(payload: string, policyEvaluate: (action: string, ctx: Record<string, unknown>) => Promise<PolicyResult>): Promise<AttackScenario> {
    const embedding = this.textToEmbedding(payload);
    const result = await policyEvaluate('shell:execute', { command: payload });

    const scenario: AttackScenario = {
      payload,
      bypassed: result.decision === 'auto',
      timestamp: Date.now(),
      embedding,
      attackType: this.classifyAttackType(payload),
      severity: this.calculateSeverity(result),
    };

    this.generatorEmbeddings.push(embedding);

    return scenario;
  }

  async detectWithEnsemble(payload: string, evaluators: Array<(p: string) => Promise<PolicyResult>>): Promise<{ results: AttackScenario[]; ensembleDecision: boolean }> {
    const results = await Promise.all(
      evaluators.map(fn => this.detect(payload, (_, ctx) => fn(ctx['command'] as string)))
    );

    const bypassCount = results.filter(r => r.bypassed).length;
    return {
      results,
      ensembleDecision: bypassCount > evaluators.length / 2,
    };
  }

  private textToEmbedding(text: string): number[] {
    const vec = new Array(128).fill(0);
    for (let i = 0; i < text.length && i < 128; i++) {
      vec[i] = text.charCodeAt(i) / 255;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return norm === 0 ? vec : vec.map(v => v / norm);
  }

  private classifyAttackType(payload: string): string {
    const patterns = [
      { type: 'injection', regex: /['";]\s*(OR|AND|DROP|UNION)/i },
      { type: 'shell', regex: /(rm|sudo|chmod|eval|exec|passthru)/i },
      { type: 'path_traversal', regex: /\.\.\/|\.\.\\/ },
      { type: 'xss', regex: /<script|onerror|onload/i },
      { type: 'prompt_injection', regex: /ignore|forget|override|system.*prompt/i },
    ];
    for (const { type, regex } of patterns) {
      if (regex.test(payload)) return type;
    }
    return 'unknown';
  }

  private calculateSeverity(result: PolicyResult): number {
    if (result.decision === 'auto') return 1.0;
    if (result.reason?.includes('blocked')) return 0.8;
    if (result.reason?.includes('ask')) return 0.4;
    return 0.1;
  }

  getGeneratedCount(): number { return this.generatorEmbeddings.length; }

  getDiversityScore(): number {
    if (this.generatorEmbeddings.length < 2) return 1;
    let totalSim = 0;
    let count = 0;
    for (let i = 0; i < this.generatorEmbeddings.length - 1; i++) {
      for (let j = i + 1; j < Math.min(i + 5, this.generatorEmbeddings.length); j++) {
        const sim = this.cosineSim(this.generatorEmbeddings[i], this.generatorEmbeddings[j]);
        totalSim += sim;
        count++;
      }
    }
    return 1 - (count > 0 ? totalSim / count : 0);
  }

  private cosineSim(a: number[], b: number[]): number {
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      nA += a[i] * a[i];
      nB += b[i] * b[i];
    }
    const denom = Math.sqrt(nA) * Math.sqrt(nB);
    return denom === 0 ? 0 : dot / denom;
  }
}

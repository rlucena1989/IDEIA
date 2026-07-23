/**
 * active-learning.ts — Active Learning + In-Context + Fine-Tuning (Items 41-43)
 *
 * 41. Fine-Tuning Pipeline (KTO + QLoRA) — preparação de dados para fine-tuning
 * 42. In-Context Learning — seleção automática de few-shot examples
 * 43. Active Learning — pede confirmação quando confiança < threshold
 */

import { randomUUID } from 'crypto';

// === Item 43: Active Learning ===

export interface ConfidenceCheck {
  action: string;
  confidence: number;
  requiresConfirmation: boolean;
  reason: string;
}

export class ActiveLearner {
  private threshold: number;

  constructor(threshold = 0.8) {
    this.threshold = threshold;
  }

  evaluate(action: string, confidence: number, context: string[]): ConfidenceCheck {
    const requiresConfirmation = confidence < this.threshold;
    const reasons: string[] = [];
    if (confidence < this.threshold) reasons.push(`Low confidence (${Math.round(confidence * 100)}% < ${Math.round(this.threshold * 100)}%)`);
    if (context.some(c => c.includes('unknown') || c.includes('uncertain'))) reasons.push('Uncertain context');
    if (action.includes('delete') || action.includes('rm ') || action.includes('drop')) reasons.push('Destructive action');

    return {
      action,
      confidence,
      requiresConfirmation,
      reason: reasons.join('; ') || 'Sufficient confidence',
    };
  }
}

// === Item 42: In-Context Learning ===

export interface FewShotExample {
  input: string;
  output: string;
  tags: string[];
  quality: number;
}

export class InContextLearner {
  private examples: FewShotExample[] = [];

  addExample(input: string, output: string, tags: string[] = [], quality = 1.0): void {
    this.examples.push({ input, output, tags, quality });
  }

  selectExamples(query: string, maxExamples = 3): FewShotExample[] {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const scored = this.examples.map(ex => {
      const exWords = new Set(ex.input.toLowerCase().split(/\s/));
      const overlap = Array.from(queryWords).filter(w => exWords.has(w)).length;
      const score = overlap * ex.quality;
      return { ...ex, score };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxExamples);
  }
}

// === Item 41: Fine-Tuning Pipeline ===

export interface TrainingExample {
  prompt: string;
  completion: string;
  metadata?: Record<string, unknown>;
}

export class FineTuningPipeline {
  private examples: TrainingExample[] = [];
  private maxExamples = 1000;

  addExample(prompt: string, completion: string, metadata?: Record<string, unknown>): void {
    if (this.examples.length >= this.maxExamples) this.examples.shift();
    this.examples.push({ prompt, completion, metadata });
  }

  exportForFineTuning(format: 'openai' | 'llama' = 'openai'): string {
    if (format === 'openai') {
      return this.examples.map(ex => JSON.stringify({
        messages: [
          { role: 'user', content: ex.prompt },
          { role: 'assistant', content: ex.completion },
        ],
      })).join('\n');
    }
    return this.examples.map(ex =>
      `<s>[INST] ${ex.prompt} [/INST] ${ex.completion} </s>`
    ).join('\n');
  }

  getStats(): { total: number; avgPromptLength: number; avgCompletionLength: number } {
    if (this.examples.length === 0) return { total: 0, avgPromptLength: 0, avgCompletionLength: 0 };
    return {
      total: this.examples.length,
      avgPromptLength: this.examples.reduce((s, e) => s + e.prompt.length, 0) / this.examples.length,
      avgCompletionLength: this.examples.reduce((s, e) => s + e.completion.length, 0) / this.examples.length,
    };
  }
}

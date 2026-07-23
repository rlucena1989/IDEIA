import { PatternRegistry, PatternDefinition, PatternCategory, PatternMatch } from './pattern-registry';

/** Interface que define a estrutura de pattern signal. */
export interface PatternSignal {
  id: string;
  patternId: string;
  source: string;
  line: number;
  content: string;
  confidence: number;
  timestamp: number;
}

/** Interface que define a estrutura de observation result. */
export interface ObservationResult {
  signals: PatternSignal[];
  matches: PatternMatch[];
  score: number;
  dominantPatterns: string[];
  summary: string;
}

/** Interface que define a estrutura de inferencer result. */
export interface InferencerResult {
  patternId: string;
  confidence: number;
  evidence: string[];
  recommendation: string;
}

/** Classe responsável por processa observer. */
export class PatternObserver {
  private registry: PatternRegistry;
  private signals: PatternSignal[] = [];

  constructor(registry: PatternRegistry) {
    this.registry = registry;
  }

  observe(content: string, source: string): ObservationResult {
    const signals: PatternSignal[] = [];
    const matches: PatternMatch[] = [];
    const patterns = this.registry.getAll();
    const lines = content.split('\n');

    for (const pattern of patterns) {
      for (let i = 0; i < pattern.examples.length; i++) {
        const example = pattern.examples[i];
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          if (lines[lineIdx]!.toLowerCase().includes(example.toLowerCase())) {
            const signal: PatternSignal = {
              id: `sig_${pattern.id}_${source}_${lineIdx}`,
              patternId: pattern.id,
              source,
              line: lineIdx + 1,
              content: lines[lineIdx]!.trim(),
              confidence: pattern.confidence,
              timestamp: Date.now(),
            };
            signals.push(signal);
            matches.push({
              patternId: pattern.id,
              source,
              line: lineIdx + 1,
              confidence: pattern.confidence,
              evidence: lines[lineIdx]!.trim(),
            });
          }
        }
      }
    }

    const patternCounts = new Map<string, number>();
    for (const m of matches) {
      patternCounts.set(m.patternId, (patternCounts.get(m.patternId) || 0) + 1);
    }
    const sorted = Array.from(patternCounts.entries()).sort((a, b) => b[1] - a[1]);
    const dominantPatterns = sorted.slice(0, 5).map(([id]) => id);

    const uniquePatterns = new Set(matches.map(m => m.patternId)).size;
    const totalPatterns = patterns.length;
    const score = totalPatterns > 0 ? Math.round((uniquePatterns / totalPatterns) * 100) : 0;

    const summary = uniquePatterns > 0
      ? `Observados ${matches.length} sinais de ${uniquePatterns} padroes (score: ${score}%). Dominantes: ${dominantPatterns.join(', ')}.`
      : `Nenhum padrao observado em "${source}". Score: 0%.`;

    this.signals.push(...signals);

    return { signals, matches, score, dominantPatterns, summary };
  }

  getRecentSignals(limit: number = 50): PatternSignal[] {
    return this.signals.slice(-limit);
  }

  clearSignals(): void {
    this.signals = [];
  }
}

/**
 * Processa pattern.
 * @param patterns - Valor patterns.
 * @param signals - Valor signals.
 * @param threshold - Valor threshold.
 * @returns O resultado da operação.
 */
export function inferPattern(
  patterns: PatternDefinition[],
  signals: PatternSignal[],
  threshold: number = 0.3,
): InferencerResult[] {
  const results: InferencerResult[] = [];
  const signalByPattern = new Map<string, PatternSignal[]>();

  for (const s of signals) {
    if (!signalByPattern.has(s.patternId)) {
      signalByPattern.set(s.patternId, []);
    }
    signalByPattern.get(s.patternId) ?? {}.push(s);
  }

  for (const pattern of patterns) {
    const patternSignals = signalByPattern.get(pattern.id) || [];
    if (patternSignals.length === 0) continue;

    const avgConfidence = patternSignals.reduce((sum, s) => sum + s.confidence, 0) / patternSignals.length;
    const finalConfidence = Math.round(avgConfidence * 100) / 100;

    if (finalConfidence < threshold) continue;

    const evidence = patternSignals.map(s => `${s.source}:${s.line} — ${s.content}`);

    results.push({
      patternId: pattern.id,
      confidence: finalConfidence,
      evidence: evidence.slice(0, 5),
      recommendation: generateRecommendation(pattern, finalConfidence),
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

function generateRecommendation(pattern: PatternDefinition, confidence: number): string {
  if (confidence >= 0.8) {
    return `Padrao "${pattern.name}" confirmado com alta confianca (${Math.round(confidence * 100)}%). ${pattern.description}.`;
  }
  if (confidence >= 0.5) {
    return `Possivel ocorrencia do padrao "${pattern.name}" (${Math.round(confidence * 100)}%). Verifique se a implementacao segue: ${pattern.description}.`;
  }
  return `Indicio do padrao "${pattern.name}" detectado (${Math.round(confidence * 100)}%). Considere aplicar intencionalmente: ${pattern.description}.`;
}

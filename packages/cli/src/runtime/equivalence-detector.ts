/**
 * @deprecated Use `packages/diff-engine` — consolidated import.
 * Semantic code equivalence detection.
 */

export interface EquivalenceConfig {
  strict: boolean;
  ignoreWhitespace: boolean;
  threshold: number;
}

export interface EquivalenceResult {
  equivalent: boolean;
  confidence: number;
  differences: string[];
}

export const DEFAULT_EQUIVALENCE_CONFIG: EquivalenceConfig = {
  strict: false,
  ignoreWhitespace: true,
  threshold: 0.8,
};

export function detectEquivalence(a: string, b: string, _config?: Partial<EquivalenceConfig>): EquivalenceResult {
  const normalizedA = a.trim();
  const normalizedB = b.trim();
  return {
    equivalent: normalizedA === normalizedB,
    confidence: normalizedA === normalizedB ? 1.0 : 0.0,
    differences: normalizedA !== normalizedB ? ['Strings differ'] : [],
  };
}

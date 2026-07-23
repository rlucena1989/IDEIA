export interface ScoringFactors {
  keywordMatch: number;
  domainFit: number;
  complexityFit: number;
  stackFit: number;
}

export const WEIGHTS = {
  keywordMatch: 0.35,
  domainFit: 0.25,
  complexityFit: 0.20,
  stackFit: 0.20,
} as const;

export function calculateConfidence(factors: ScoringFactors): number {
  const raw =
    factors.keywordMatch * WEIGHTS.keywordMatch +
    factors.domainFit * WEIGHTS.domainFit +
    factors.complexityFit * WEIGHTS.complexityFit +
    factors.stackFit * WEIGHTS.stackFit;
  return clamp(raw, 0, 1);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeKeywords(matched: number, total: number): number {
  if (total === 0) return 0;
  return clamp(matched / total, 0, 1);
}

export function normalizeStack(overlap: number, targetSize: number): number {
  if (targetSize === 0) return 0.5;
  return clamp(overlap / targetSize, 0, 1);
}

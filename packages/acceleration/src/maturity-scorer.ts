import { MaturityScore, ScorecardAnalysis, CoverageAnalysis, Gap } from './types';

export function scoreMaturity(
  scorecard: ScorecardAnalysis,
  coverage: CoverageAnalysis,
  gaps: Gap[]
): MaturityScore {
  // Weight: 50% scorecard, 30% coverage, 20% gaps
  let score = Math.round(
    scorecard.score * 0.5 +
    coverage.total * 0.3 +
    Math.max(0, 100 - gaps.length * 10) * 0.2
  );
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low'
  };
}

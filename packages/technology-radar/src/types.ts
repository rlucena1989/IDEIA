export interface TechSource {
  github?: { stars: number; releases: number; language: string; updatedAt: string };
  npm?: { downloads: number; maintainers: number; dependencies: number; version: string };
  arxiv?: { recentPapers: number; categories: string[] };
}

export interface Technology {
  name: string;
  description: string;
  category: string;
  sources: TechSource;
  scores: ScoringResult;
  validated: boolean;
  scannedAt: string;
}

export interface ScoringResult {
  value: number;
  differentiation: number;
  synergy: number;
  costBenefit: number;
  maturity: number;
  weightedTotal: number;
}

export interface StudyDraft {
  techName: string;
  rationale: string;
  compatibility: Record<string, boolean>;
  estimatedEffort: string;
  taskRef: string;
  generatedAt: string;
}

export interface Recommendation {
  technology: Technology;
  draft?: StudyDraft;
  score: number;
}

export interface ScoredWeights {
  value: number;
  differentiation: number;
  synergy: number;
  costBenefit: number;
  maturity: number;
}

export type ScanTarget = 'github' | 'npm' | 'arxiv';

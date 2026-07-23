import { z } from 'zod';

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low', 'unknown']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const ClassificationResultSchema = z.object({
  domain: z.array(z.string()),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()),
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const ConsensusVoteSchema = z.object({
  provider: z.string(),
  decision: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ConsensusVote = z.infer<typeof ConsensusVoteSchema>;

export const ConsensusResultSchema = z.object({
  consensus: z.string(),
  confidence: z.number().min(0).max(1),
  agreement: z.number().min(0).max(1),
  votes: z.array(ConsensusVoteSchema),
});
export type ConsensusResult = z.infer<typeof ConsensusResultSchema>;

export const ScoringFactorSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(1),
});
export type ScoringFactor = z.infer<typeof ScoringFactorSchema>;

export const ConfidenceScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  level: ConfidenceLevelSchema,
  factors: z.array(ScoringFactorSchema),
});
export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

export interface ConsensusProvider {
  name: string;
  vote(prompt: string): Promise<{ decision: string; confidence: number }>;
}

export const GUARDRAIL_RULES = [
  { id: 'min_confidence', description: 'Minimum confidence threshold', defaultThreshold: 0.3 },
  { id: 'max_variance', description: 'Maximum variance between votes', defaultThreshold: 0.5 },
  { id: 'min_votes', description: 'Minimum votes for consensus', defaultThreshold: 2 },
] as const;

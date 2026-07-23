export interface ProjectNeed {
  id: string;
  description: string;
  category?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  keywords: string[];
  constraints?: string[];
}

export interface MatchScore {
  capabilityName: string;
  provider: string;
  score: number;
  confidence: number;
  reasoning: string;
}

export interface MatchResult {
  need: ProjectNeed;
  matches: MatchScore[];
  topMatch: MatchScore | null;
  coverage: number;
  gaps: string[];
}

export interface MatchingProfile {
  name: string;
  version: string;
  needs: ProjectNeed[];
  context?: Record<string, unknown>;
}

export interface Suggestion {
  type: 'agent' | 'workflow' | 'context-pack' | 'tutorial' | 'blueprint';
  name: string;
  description: string;
  relevance: number;
}

export interface MatchingReport {
  profile: MatchingProfile;
  results: MatchResult[];
  overallCoverage: number;
  suggestions: Suggestion[];
  matchedCapabilities: string[];
  unmatchedNeeds: string[];
  timestamp: string;
}

// Types for the scorecard subsystem. Extracted from scorecard.ts (QLD-05: file >300 lines).

/** Interface que define a estrutura de scorecard item. */
export interface ScorecardItem {
  id: string; description: string; passed: boolean; weight: number;
  hint?: string; fixCommand?: string; value?: string | number;
}

/** Interface que define a estrutura de scorecard category. */
export interface ScorecardCategory {
  name: string; weight: number; score: number; maxScore: number; items: ScorecardItem[];
}

/** Interface que define a estrutura de scorecard trend. */
export interface ScorecardTrend {
  timestamp: string; overallScore: number;
  categories: { name: string; score: number }[];
}

/** Interface que define a estrutura de scorecard alert. */
export interface ScorecardAlert {
  category: string; item: string; severity: "warn" | "error"; message: string;
}

/** Interface que define a estrutura de correlation alert. */
export interface CorrelationAlert { severity: 'info' | 'warn' | 'critical'; message: string; categories: string[]; }

/** Interface que define a estrutura de scorecard result. */
export interface ScorecardResult {
  timestamp: string; overallScore: number; maturityLevel: "A" | "B" | "C" | "D";
  categories: ScorecardCategory[];
  recommendations: { text: string; fixCommand?: string }[];
  evolution: { version: string; categories: number; items: number };
  trends: ScorecardTrend[]; alerts: ScorecardAlert[];
  correlationAlerts: CorrelationAlert[]; forecast: { forecast: number; confidence: string; trend: string; history: number[] };
  git: { branch: string; commit: string; message: string };
  meta: { durationMs: number; scorecardVersion: string };
}

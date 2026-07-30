export interface SessionMetadata {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  commandCount: number;
  errorCount: number;
  projectPath: string;
}

export interface RepeatedCommand {
  command: string;
  count: number;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  sessions: string[];
}

export interface FrequentError {
  errorPattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  sessions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CodePattern {
  patternId: string;
  description: string;
  language: string;
  snippet: string;
  frequency: number;
  sessions: string[];
  firstSeen: string;
  lastSeen: string;
  category: 'boilerplate' | 'architecture' | 'security' | 'performance' | 'testing';
}

export interface PatternSuggestion {
  suggestionId: string;
  patternType: 'command' | 'error' | 'code';
  pattern: RepeatedCommand | FrequentError | CodePattern;
  automationScript?: string;
  suggestion: string;
  confidence: number;
  occurrences: number;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'automated';
}

export interface PatternStoreEntry {
  sessions: SessionMetadata[];
  repeatedCommands: RepeatedCommand[];
  frequentErrors: FrequentError[];
  codePatterns: CodePattern[];
  suggestions: PatternSuggestion[];
  lastAnalyzed: string;
}

export interface LearningFeedback {
  suggestionId: string;
  accepted: boolean;
  timestamp: string;
  reason?: string;
}

export interface AdaptiveRule {
  ruleId: string;
  sourceSuggestionId: string;
  pattern: string;
  automationScript: string;
  acceptedCount: number;
  rejectedCount: number;
  lastTriggered: string;
  autoExecute: boolean;
  enabled: boolean;
}

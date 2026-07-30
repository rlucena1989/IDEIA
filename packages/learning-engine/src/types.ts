export type SuggestionType = 'alias' | 'workflow' | 'config' | 'shortcut' | 'automation' | 'profile';

export interface UsageRecord {
  id: string;
  feature: string;
  action: string;
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  source?: string;
}

export interface UsageStats {
  feature: string;
  totalUses: number;
  sessionsUsed: number;
  firstUsed: string;
  lastUsed: string;
  avgDurationMs?: number;
  frequencyByHour: Record<string, number>;
  frequencyByDay: Record<string, number>;
}

export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  confidence: number;
  reason: string;
  createdAt: string;
  applied: boolean;
  dismissed: boolean;
  sourceFeature: string;
  suggestedAction: string;
}

export interface TrackerConfig {
  maxRecords?: number;
  persistPath?: string;
}

export interface GeneratorConfig {
  aliasThreshold?: number;
  workflowThreshold?: number;
  shortcutThreshold?: number;
  automationThreshold?: number;
  profileThreshold?: number;
  windowSizeMs?: number;
}

export interface EngineConfig {
  trackerConfig?: TrackerConfig;
  generatorConfig?: GeneratorConfig;
  autoApply?: boolean;
  minConfidence?: number;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  totalRecords: number;
  analysisPeriod: string;
  generatedAt: string;
}

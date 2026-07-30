import { createLogger, type Logger } from '@ideia/logger';
import { UsageTracker } from './usage-tracker';
import { SuggestionGenerator } from './suggestion-generator';
import type {
  UsageRecord,
  Suggestion,
  SuggestionResult,
  EngineConfig,
  UsageStats,
} from './types';

export class AdaptiveLearningEngine {
  private tracker: UsageTracker;
  private generator: SuggestionGenerator;
  private config: Required<EngineConfig>;
  private logger: Logger;
  private suggestions: Suggestion[] = [];

  constructor(config?: EngineConfig) {
    this.config = {
      trackerConfig: config?.trackerConfig ?? {},
      generatorConfig: config?.generatorConfig ?? {},
      autoApply: config?.autoApply ?? false,
      minConfidence: config?.minConfidence ?? 0.3,
    };
    this.tracker = new UsageTracker(this.config.trackerConfig);
    this.generator = new SuggestionGenerator(this.config.generatorConfig);
    this.logger = createLogger('learning-engine');
  }

  recordUsage(
    feature: string,
    action: string,
    sessionId: string,
    metadata?: Record<string, unknown>,
    durationMs?: number,
    source?: string,
  ): UsageRecord {
    const record = this.tracker.record(feature, action, sessionId, metadata, durationMs, source);
    this.logger.debug('Usage recorded', {
      feature,
      action,
      sessionId,
      totalRecords: this.tracker.getTotalRecords(),
    });

    if (this.config.autoApply) {
      this.logger.info('Auto-analyze triggered', { feature, action });
      this.analyze();
    }

    return record;
  }

  analyze(): SuggestionResult {
    const records = this.tracker.getRecords();
    const result = this.generator.generate(records, this.config.minConfidence);
    this.suggestions = result.suggestions;
    this.logger.info('Analysis complete', {
      totalRecords: result.totalRecords,
      suggestionsGenerated: result.suggestions.length,
    });
    return result;
  }

  getSuggestions(includeDismissed?: boolean): Suggestion[] {
    if (includeDismissed) {
      return [...this.suggestions];
    }
    return this.suggestions.filter(s => !s.dismissed);
  }

  applySuggestion(id: string): boolean {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (suggestion && !suggestion.applied && !suggestion.dismissed) {
      suggestion.applied = true;
      this.logger.info('Suggestion applied', { id, type: suggestion.type, title: suggestion.title });
      return true;
    }
    return false;
  }

  dismissSuggestion(id: string): boolean {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (suggestion && !suggestion.dismissed) {
      suggestion.dismissed = true;
      this.logger.info('Suggestion dismissed', { id, type: suggestion.type });
      return true;
    }
    return false;
  }

  getStats(feature?: string): UsageStats[] | UsageStats {
    if (feature) {
      return this.tracker.getStats(feature);
    }
    return this.tracker.getAllStats();
  }

  getTracker(): UsageTracker {
    return this.tracker;
  }

  getGenerator(): SuggestionGenerator {
    return this.generator;
  }

  getLogger(): Logger {
    return this.logger;
  }

  getConfig(): Readonly<EngineConfig> {
    return { ...this.config };
  }
}

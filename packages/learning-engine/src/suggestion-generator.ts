import { randomUUID } from 'node:crypto';
import { createLogger } from '@ideia/logger';
import type { UsageRecord, Suggestion, SuggestionType, GeneratorConfig, SuggestionResult } from './types';
const logger = createLogger('suggestion-generator');

const DEFAULT_THRESHOLDS = {
  aliasThreshold: 10,
  workflowThreshold: 5,
  shortcutThreshold: 8,
  automationThreshold: 3,
  profileThreshold: 15,
  windowSizeMs: 7 * 24 * 60 * 60 * 1000,
};

export class SuggestionGenerator {
  private config: Required<GeneratorConfig>;

  constructor(config?: GeneratorConfig) {
    this.config = {
      aliasThreshold: config?.aliasThreshold ?? DEFAULT_THRESHOLDS.aliasThreshold,
      workflowThreshold: config?.workflowThreshold ?? DEFAULT_THRESHOLDS.workflowThreshold,
      shortcutThreshold: config?.shortcutThreshold ?? DEFAULT_THRESHOLDS.shortcutThreshold,
      automationThreshold: config?.automationThreshold ?? DEFAULT_THRESHOLDS.automationThreshold,
      profileThreshold: config?.profileThreshold ?? DEFAULT_THRESHOLDS.profileThreshold,
      windowSizeMs: config?.windowSizeMs ?? DEFAULT_THRESHOLDS.windowSizeMs,
    };
  }

  generate(records: UsageRecord[], minConfidence?: number): SuggestionResult {
    const windowEnd = Date.now();
    const windowStart = windowEnd - this.config.windowSizeMs;
    const windowed = records.filter(r => new Date(r.timestamp).getTime() >= windowStart);

    const suggestions: Suggestion[] = [
      ...this.detectFrequentCommands(windowed),
      ...this.detectRepeatedSequence(windowed),
      ...this.detectSlowCommands(windowed),
      ...this.detectFeatureClusters(windowed),
      ...this.detectIdleOptimization(windowed),
    ];

    const threshold = minConfidence ?? 0.3;
    const filtered = suggestions.filter(s => s.confidence >= threshold);
    const sorted = filtered.sort((a, b) => b.confidence - a.confidence);

    const now = new Date();
    const periodStart = new Date(windowStart).toISOString();
    const periodEnd = new Date(windowEnd).toISOString();

    return {
      suggestions: sorted,
      totalRecords: records.length,
      analysisPeriod: `${periodStart}/${periodEnd}`,
      generatedAt: now.toISOString(),
    };
  }

  getConfig(): Readonly<GeneratorConfig> {
    return { ...this.config };
  }

  private detectFrequentCommands(records: UsageRecord[]): Suggestion[] {
    const actionCounts = new Map<string, { count: number; feature: string; firstSeen: string }>();
    for (const r of records) {
      const key = `${r.feature}:${r.action}`;
      const existing = actionCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        actionCounts.set(key, { count: 1, feature: r.feature, firstSeen: r.timestamp });
      }
    }

    const result: Suggestion[] = [];
    for (const [key, info] of actionCounts) {
      if (info.count >= this.config.aliasThreshold) {
        const [feature, action] = key.split(':');
        result.push(this.makeSuggestion(
          'alias',
          `Create alias for "${action}"`,
          `You used "${action}" ${info.count} times — add a shortcut alias`,
          info.count / (this.config.aliasThreshold * 2),
          `Used ${info.count} times in ${this.fmtDuration(this.config.windowSizeMs)}`,
          feature,
          `alias:${action}`,
        ));
      }
    }
    return result;
  }

  private detectRepeatedSequence(records: UsageRecord[]): Suggestion[] {
    if (records.length < 3) return [];
    const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const sequenceMap = new Map<string, number>();
    for (let i = 0; i < sorted.length - 2; i++) {
      const seq = `${sorted[i].feature}:${sorted[i].action}|${sorted[i + 1].feature}:${sorted[i + 1].action}|${sorted[i + 2].feature}:${sorted[i + 2].action}`;
      sequenceMap.set(seq, (sequenceMap.get(seq) ?? 0) + 1);
    }

    const result: Suggestion[] = [];
    for (const [seq, count] of sequenceMap) {
      if (count >= this.config.workflowThreshold) {
        const parts = seq.split('|').map(s => s.split(':')[1]);
        result.push(this.makeSuggestion(
          'workflow',
          `Create workflow for repeated sequence`,
          `You performed a 3-step sequence ${count} times: ${parts.join(' → ')}`,
          Math.min(count / (this.config.workflowThreshold * 1.5), 0.95),
          `Sequence repeated ${count} times`,
          parts[0] ?? 'unknown',
          `workflow:${parts.join('-')}`,
        ));
      }
    }
    return result;
  }

  private detectSlowCommands(records: UsageRecord[]): Suggestion[] {
    const withDuration = records.filter(r => r.durationMs !== undefined && r.durationMs > 5000);
    if (withDuration.length < 3) return [];

    const featureAvg = new Map<string, { total: number; count: number }>();
    for (const r of withDuration) {
      const existing = featureAvg.get(r.feature);
      if (existing) {
        existing.total += r.durationMs as number;
        existing.count++;
      } else {
        featureAvg.set(r.feature, { total: r.durationMs as number, count: 1 });
      }
    }

    const result: Suggestion[] = [];
    for (const [feature, stats] of featureAvg) {
      const avg = stats.total / stats.count;
      if (avg > 10000 && stats.count >= this.config.shortcutThreshold) {
        result.push(this.makeSuggestion(
          'shortcut',
          `Optimize slow operation "${feature}"`,
          `"${feature}" averages ${Math.round(avg)}ms — consider a cached shortcut`,
          Math.min(stats.count / (this.config.shortcutThreshold * 2), 0.9),
          `Average ${Math.round(avg)}ms over ${stats.count} uses`,
          feature,
          `shortcut:${feature}-cache`,
        ));
      }
    }
    return result;
  }

  private detectFeatureClusters(records: UsageRecord[]): Suggestion[] {
    const featureCounts = new Map<string, number>();
    for (const r of records) {
      featureCounts.set(r.feature, (featureCounts.get(r.feature) ?? 0) + 1);
    }

    const sorted = Array.from(featureCounts.entries()).sort((a, b) => b[1] - a[1]);
    const result: Suggestion[] = [];

    if (sorted.length >= 3) {
      const top3 = sorted.slice(0, 3);
      const totalTop = top3.reduce((sum, [, c]) => sum + c, 0);
      const totalAll = records.length;
      const dominanceRatio = totalTop / totalAll;

      if (dominanceRatio > 0.6 && totalAll >= this.config.profileThreshold) {
        const featureNames = top3.map(([f]) => f).join(', ');
        result.push(this.makeSuggestion(
          'profile',
          `Switch to "${top3[0][0]}-focused" profile`,
          `${(dominanceRatio * 100).toFixed(0)}% of usage is in: ${featureNames}`,
          Math.min(dominanceRatio, 0.95),
          `Top 3 features account for ${(dominanceRatio * 100).toFixed(0)}% of all usage`,
          top3[0][0],
          `profile:${top3[0][0]}-focus`,
        ));
      }
    }

    for (const [feature, count] of sorted) {
      if (count >= this.config.automationThreshold && count >= this.config.profileThreshold) {
        result.push(this.makeSuggestion(
          'automation',
          `Automate "${feature}" execution`,
          `You use "${feature}" ${count} times — schedule automated runs`,
          Math.min(count / (this.config.automationThreshold * 3), 0.85),
          `Used ${count} times — strong candidate for automation`,
          feature,
          `automate:${feature}`,
        ));
      }
    }

    return result;
  }

  private detectIdleOptimization(records: UsageRecord[]): Suggestion[] {
    const sessions = new Map<string, UsageRecord[]>();
    for (const r of records) {
      const existing = sessions.get(r.sessionId);
      if (existing) {
        existing.push(r);
      } else {
        sessions.set(r.sessionId, [r]);
      }
    }

    const result: Suggestion[] = [];
    for (const [, sessionRecords] of sessions) {
      if (sessionRecords.length >= this.config.shortcutThreshold) {
        const features = new Set(sessionRecords.map(r => r.feature));
        if (features.size >= 3) {
          const featureList = Array.from(features).slice(0, 3).join(', ');
          result.push(this.makeSuggestion(
            'config',
            'Batch similar operations',
            `You used ${features.size} different features in a single session`,
            Math.min(features.size / 10, 0.7),
            `Session had ${sessionRecords.length} operations across ${features.size} features`,
            featureList,
            `config:batch-mode`,
          ));
        }
        break;
      }
    }

    return result;
  }

  private makeSuggestion(
    type: SuggestionType,
    title: string,
    description: string,
    rawConfidence: number,
    reason: string,
    sourceFeature: string,
    suggestedAction: string,
  ): Suggestion {
    return {
      id: randomUUID(),
      type,
      title,
      description,
      confidence: Math.round(Math.min(Math.max(rawConfidence, 0), 1) * 100) / 100,
      reason,
      createdAt: new Date().toISOString(),
      applied: false,
      dismissed: false,
      sourceFeature,
      suggestedAction,
    };
  }

  private fmtDuration(ms: number): string {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    if (days > 0) return `${days}d`;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    return `${hours}h`;
  }
}

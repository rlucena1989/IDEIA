import type { Interaction } from './interaction-tracker';
import { createLogger } from '@ideia/logger';
import type { ProfileId, AutonomyLevel } from './types';
const logger = createLogger('adaptive-suggestions');

export interface AdaptiveSuggestion {
  id: string;
  type: 'profile' | 'profile_change' | 'autonomy' | 'config';
  title: string;
  description: string;
  currentValue: string;
  suggestedValue: string;
  confidence: number;
  reason: string;
  category: 'observation' | 'efficiency' | 'security' | 'experience';
  createdAt: string;
  timestamp?: string;
  applied: boolean;
  suggestedProfileId?: string;
}

export interface SuggestionResult {
  suggestions: AdaptiveSuggestion[];
  totalInteractions: number;
  analysisPeriod: string;
}

const OBSERVATION_THRESHOLD = 50;
const AUTONOMY_ORDER: AutonomyLevel[] = ['passive', 'assisted', 'autonomous'];

export type SuggestionType = 'profile' | 'profile_change' | 'autonomy' | 'config';

export class AdaptiveSuggestions {
  private interactions: Interaction[];
  private profileId: ProfileId;
  private autonomyLevel: AutonomyLevel;
  private suggestions: AdaptiveSuggestion[] = [];

  constructor(
    interactions: Interaction[],
    profileId: ProfileId,
    autonomyLevel: AutonomyLevel
  ) {
    this.interactions = interactions;
    this.profileId = profileId;
    this.autonomyLevel = autonomyLevel;
  }

  analyze(): SuggestionResult {
    this.suggestions = [];

    if (this.interactions.length < OBSERVATION_THRESHOLD) {
      return {
        suggestions: [],
        totalInteractions: this.interactions.length,
        analysisPeriod: this.getAnalysisPeriod(),
      };
    }

    const candidates = [
      ...this.checkAutonomyMismatch(),
      ...this.checkRiskTolerance(),
      ...this.checkScannerUsage(),
      ...this.checkNotificationPreference(),
      ...this.checkProfileMismatch(),
      ...this.checkEfficiencyPattern(),
    ];

    this.suggestions = candidates.filter(s => s.confidence >= 0.5);

    return {
      suggestions: this.suggestions,
      totalInteractions: this.interactions.length,
      analysisPeriod: this.getAnalysisPeriod(),
    };
  }

  getSuggestions(): AdaptiveSuggestion[] {
    return [...this.suggestions];
  }

  markApplied(id: string): boolean {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (suggestion) {
      suggestion.applied = true;
      return true;
    }
    return false;
  }

  dismiss(id: string): boolean {
    const index = this.suggestions.findIndex(s => s.id === id);
    if (index !== -1) {
      this.suggestions.splice(index, 1);
      return true;
    }
    return false;
  }

  private calculateConfidence(consistencyRatio: number, totalCount: number): number {
    let base: number;
    if (consistencyRatio >= 0.8) {
      base = 0.85;
    } else if (consistencyRatio >= 0.6) {
      base = 0.7;
    } else {
      base = 0.5;
    }

    const excessInteractions = Math.max(0, totalCount - OBSERVATION_THRESHOLD);
    const volumeBonus = Math.min(excessInteractions / OBSERVATION_THRESHOLD * 0.1, 0.1);
    const precisionBonus = consistencyRatio > 0.9 ? 0.05 : 0;

    return Math.round(Math.min(base + volumeBonus + precisionBonus, 0.95) * 100) / 100;
  }

  private getAnalysisPeriod(): string {
    if (this.interactions.length === 0) return '';
    const timestamps = this.interactions.map(i => new Date(i.timestamp).getTime());
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));
    return `${min.toISOString()}/${max.toISOString()}`;
  }

  private nextAutonomyLevel(): AutonomyLevel | null {
    const idx = AUTONOMY_ORDER.indexOf(this.autonomyLevel);
    if (idx < AUTONOMY_ORDER.length - 1) return AUTONOMY_ORDER[idx + 1];
    return null;
  }

  private prevAutonomyLevel(): AutonomyLevel | null {
    const idx = AUTONOMY_ORDER.indexOf(this.autonomyLevel);
    if (idx > 0) return AUTONOMY_ORDER[idx - 1];
    return null;
  }

  private checkAutonomyMismatch(): AdaptiveSuggestion[] {
    const approved = this.interactions.filter(i => i.type === 'ai_action_approved').length;
    const rejected = this.interactions.filter(i => i.type === 'ai_action_rejected').length;
    const total = approved + rejected;

    if (total === 0) return [];

    const suggestions: AdaptiveSuggestion[] = [];

    const approvalRate = approved / total;
    if (approvalRate > 0.8) {
      const suggested = this.nextAutonomyLevel();
      if (suggested) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'autonomy',
          title: `Upgrade autonomy to ${suggested}`,
          description: `You approve ${(approvalRate * 100).toFixed(0)}% of AI actions`,
          currentValue: this.autonomyLevel,
          suggestedValue: suggested,
          confidence: this.calculateConfidence(approvalRate, total),
          reason: 'High approval rate indicates readiness for more autonomy',
          category: 'efficiency',
          createdAt: new Date().toISOString(),
          applied: false,
        });
      }
    }

    const rejectionRate = rejected / total;
    if (rejectionRate > 0.4) {
      const suggested = this.prevAutonomyLevel();
      if (suggested) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'autonomy',
          title: `Downgrade autonomy to ${suggested}`,
          description: `You reject ${(rejectionRate * 100).toFixed(0)}% of AI actions`,
          currentValue: this.autonomyLevel,
          suggestedValue: suggested,
          confidence: this.calculateConfidence(rejectionRate, total),
          reason: 'High rejection rate suggests need for more supervision',
          category: 'observation',
          createdAt: new Date().toISOString(),
          applied: false,
        });
      }
    }

    return suggestions;
  }

  private checkRiskTolerance(): AdaptiveSuggestion[] {
    const accepted = this.interactions.filter(i => i.type === 'high_risk_action_accepted').length;
    const rejected = this.interactions.filter(i => i.type === 'high_risk_action_rejected').length;
    const total = accepted + rejected;

    if (total === 0) return [];

    const acceptanceRate = accepted / total;
    if (acceptanceRate > 0.9) {
      return [{
        id: crypto.randomUUID(),
        type: 'config',
        title: 'Increase risk threshold',
        description: `You accept ${(acceptanceRate * 100).toFixed(0)}% of high-risk operations`,
        currentValue: 'medium',
        suggestedValue: 'high',
        confidence: this.calculateConfidence(acceptanceRate, total),
        reason: 'High risk acceptance rate suggests you are comfortable with risk',
        category: 'security',
        createdAt: new Date().toISOString(),
        applied: false,
      }];
    }

    return [];
  }

  private checkScannerUsage(): AdaptiveSuggestion[] {
    const manualScans = this.interactions.filter(i => i.type === 'scanner_manual_run').length;

    if (manualScans >= 5) {
      return [{
        id: crypto.randomUUID(),
        type: 'config',
        title: 'Enable auto-scan',
        description: `You ran ${manualScans} manual scanner sessions`,
        currentValue: 'manual',
        suggestedValue: 'auto',
        confidence: this.calculateConfidence(
          Math.min(manualScans / 10, 1),
          manualScans
        ),
        reason: 'Frequent manual scans indicate you value safety checks',
        category: 'efficiency',
        createdAt: new Date().toISOString(),
        applied: false,
      }];
    }

    return [];
  }

  private checkNotificationPreference(): AdaptiveSuggestion[] {
    const dismissed = this.interactions.filter(i => i.type === 'notification_dismissed').length;
    const received = this.interactions.filter(i => i.type === 'notification_received').length;
    const total = dismissed + received;

    if (total === 0) return [];

    const dismissRate = dismissed / total;
    if (dismissRate > 0.6) {
      return [{
        id: crypto.randomUUID(),
        type: 'config',
        title: 'Reduce notification frequency',
        description: `You dismiss ${(dismissRate * 100).toFixed(0)}% of notifications`,
        currentValue: 'normal',
        suggestedValue: 'reduced',
        confidence: this.calculateConfidence(dismissRate, total),
        reason: 'High dismissal rate suggests notification overload',
        category: 'experience',
        createdAt: new Date().toISOString(),
        applied: false,
      }];
    }

    return [];
  }

  private checkProfileMismatch(): AdaptiveSuggestion[] {
    const featureUses = this.interactions.filter(i => i.type === 'feature_used');
    if (featureUses.length < 10) return [];

    const otherProfileFeatures = featureUses.filter(f => {
      const targetProfile = f.metadata?.profileId;
      return typeof targetProfile === 'string' && targetProfile !== this.profileId;
    });

    const mismatchRatio = otherProfileFeatures.length / featureUses.length;
    if (mismatchRatio > 0.4) {
      const profileCounts = new Map<string, number>();
      otherProfileFeatures.forEach(f => {
        const p = f.metadata?.profileId;
        if (typeof p === 'string') profileCounts.set(p, (profileCounts.get(p) || 0) + 1);
      });

      let suggestedProfile = '';
      let maxCount = 0;
      profileCounts.forEach((count, profile) => {
        if (count > maxCount) {
          maxCount = count;
          suggestedProfile = profile;
        }
      });

      return [{
        id: crypto.randomUUID(),
        type: 'profile',
        title: `Switch to ${suggestedProfile} profile`,
        description: `${(mismatchRatio * 100).toFixed(0)}% of features used belong to ${suggestedProfile}`,
        currentValue: this.profileId,
        suggestedValue: suggestedProfile,
        confidence: this.calculateConfidence(mismatchRatio, featureUses.length),
        reason: 'You consistently use features from the ' + suggestedProfile + ' profile',
        category: 'observation',
        createdAt: new Date().toISOString(),
        applied: false,
      }];
    }

    return [];
  }

  private checkEfficiencyPattern(): AdaptiveSuggestion[] {
    const commands = this.interactions.filter(i => i.type === 'command_run');
    if (commands.length < 15) return [];

    const commandCounts = new Map<string, number>();
    commands.forEach(c => {
      const raw = c.metadata?.command;
      const cmd = typeof raw === 'string' ? raw : 'unknown';
      commandCounts.set(cmd, (commandCounts.get(cmd) || 0) + 1);
    });

    const frequentCommands = Array.from(commandCounts.entries())
      .filter(([_, count]) => count >= 3)
      .map(([cmd]) => cmd);

    if (frequentCommands.length >= 3) {
      return [{
        id: crypto.randomUUID(),
        type: 'config',
        title: 'Create workflow macros',
        description: `You frequently run ${frequentCommands.length} commands: ${frequentCommands.slice(0, 3).join(', ')}`,
        currentValue: 'manual',
        suggestedValue: 'macro',
        confidence: this.calculateConfidence(
          Math.min(frequentCommands.length / 5, 0.95),
          commands.length
        ),
        reason: 'Repetitive command usage suggests automation opportunity',
        category: 'efficiency',
        createdAt: new Date().toISOString(),
        applied: false,
      }];
    }

    return [];
  }
}

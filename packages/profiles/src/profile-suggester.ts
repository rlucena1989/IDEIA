import { AutonomyLevel } from './types';
import { createLogger } from '@ideia/logger';
import { ExperienceLevel } from './usability-profile';
import { DetectionResult } from './profile-detector';
import { Interaction } from './interaction-tracker';
const logger = createLogger('profile-suggester');

export interface AutonomySuggestion {
  currentLevel: ExperienceLevel;
  suggestedLevel: ExperienceLevel;
  suggestedAutonomy: AutonomyLevel;
  reason: string;
  confidence: number;
  timestamp: string;
  confidenceLevel: 'low' | 'medium' | 'high';
}

export interface EnhancedSuggestionInput {
  detection: DetectionResult;
  interactions: Interaction[];
  recentErrors: number;
  timeSinceLastChange: number;
}

export class ProfileSuggester {
  suggest(detection: DetectionResult): AutonomySuggestion | null {
    const currentLevel = detection.profile;
    const suggestedLevel = this.getSuggestedLevel(detection);

    if (suggestedLevel === null || suggestedLevel === currentLevel) return null;

    const suggestedAutonomy = this.levelToAutonomy(suggestedLevel);

    return {
      currentLevel,
      suggestedLevel,
      suggestedAutonomy,
      reason: this.buildReason(currentLevel, suggestedLevel, detection),
      confidence: detection.confidence,
      timestamp: new Date().toISOString(),
      confidenceLevel: this.getConfidenceLevel(detection.confidence),
    };
  }

  enhancedSuggest(input: EnhancedSuggestionInput): AutonomySuggestion | null {
    const base = this.suggest(input.detection);
    if (!base) return null;

    let confidenceDelta = 0;
    const reasons: string[] = [base.reason];

    if (input.interactions.length > 100) { confidenceDelta += 0.05; reasons.push('ample interaction data'); }
    if (input.recentErrors > 5) { confidenceDelta -= 0.1; reasons.push('recent errors detected'); }
    if (input.timeSinceLastChange > 86400000) { confidenceDelta += 0.05; reasons.push('stable period observed'); }

    const adjustedConfidence = Math.min(0.99, Math.max(0.1, base.confidence + confidenceDelta));

    return {
      ...base,
      confidence: adjustedConfidence,
      confidenceLevel: this.getConfidenceLevel(adjustedConfidence),
      reason: reasons.join('; '),
    };
  }

  private getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  private getSuggestedLevel(detection: DetectionResult): ExperienceLevel | null {
    const { metrics } = detection;

    if (metrics.totalInteractions < 20) return null;

    if (metrics.errorRate < 0.05 && metrics.approvalRate > 0.85 && detection.profile === 'N2') return 'N3';
    if (metrics.errorRate < 0.08 && metrics.approvalRate > 0.75 && detection.profile === 'N1') return 'N2';
    if (metrics.errorRate < 0.1 && metrics.commandFrequency > 0.3 && detection.profile === 'N0') return 'N1';

    if (metrics.errorRate > 0.2 || metrics.approvalRate < 0.4) {
      if (detection.profile === 'N3') return 'N2';
      if (detection.profile === 'N2') return 'N1';
      if (detection.profile === 'N1') return 'N0';
    }

    return null;
  }

  private levelToAutonomy(level: ExperienceLevel): AutonomyLevel {
    switch (level) {
      case 'N0': return 'passive';
      case 'N1': return 'assisted';
      case 'N2': return 'assisted';
      case 'N3': return 'autonomous';
      case 'N4': return 'autonomous';
    }
  }

  private buildReason(current: ExperienceLevel, suggested: ExperienceLevel, detection: DetectionResult): string {
    const levelNames: Record<ExperienceLevel, string> = {
      N0: 'Beginner',
      N1: 'Basic',
      N2: 'Intermediate',
      N3: 'Advanced',
      N4: 'Expert',
    };

    const reason = suggested > current
      ? 'user shows proficiency'
      : 'user needs more assistance';

    return `Suggest ${levelNames[suggested]} (${suggested}) from ${levelNames[current]} (${current}): ${reason} (error=${(detection.metrics.errorRate * 100).toFixed(1)}%, approval=${(detection.metrics.approvalRate * 100).toFixed(1)}%)`;
  }
}

export function createProfileSuggester(): ProfileSuggester {
  return new ProfileSuggester();
}

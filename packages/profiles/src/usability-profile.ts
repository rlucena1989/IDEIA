import { AutonomyLevel } from './types';
import { createLogger } from '@ideia/logger';
import { Interaction } from './interaction-tracker';
const logger = createLogger('usability-profile');

export type ExperienceLevel = 'N0' | 'N1' | 'N2' | 'N3' | 'N4';

export interface UsabilityMetrics {
  commandFrequency: number;
  errorRate: number;
  averageTimeOnFeature: number;
  featureDiversity: number;
  approvalRate: number;
  totalInteractions: number;
}

export interface UsabilityProfileResult {
  level: ExperienceLevel;
  autonomyEquivalent: AutonomyLevel;
  metrics: UsabilityMetrics;
  confidence: number;
}

export class UsabilityProfile {
  detect(interactions: Interaction[]): UsabilityProfileResult {
    const metrics = this.computeMetrics(interactions);
    const level = this.determineLevel(metrics);
    const autonomyEquivalent = this.mapToAutonomy(level);
    const confidence = this.computeConfidence(metrics);

    return { level, autonomyEquivalent, metrics, confidence };
  }

  private computeMetrics(interactions: Interaction[]): UsabilityMetrics {
    const total = interactions.length;
    if (total === 0) {
      return { commandFrequency: 0, errorRate: 0, averageTimeOnFeature: 0, featureDiversity: 0, approvalRate: 0, totalInteractions: 0 };
    }

    const commands = interactions.filter(i => i.type === 'command_run' || i.type === 'command.executed');
    const errors = interactions.filter(i => i.type === 'error');
    const approvals = interactions.filter(i => i.type === 'ai_action_approved' || i.type === 'approval.granted');
    const rejections = interactions.filter(i => i.type === 'ai_action_rejected' || i.type === 'approval.denied');

    const commandFrequency = total > 0 ? commands.length / total : 0;
    const errorRate = total > 0 ? errors.length / total : 0;
    const approvalTotal = approvals.length + rejections.length;
    const approvalRate = approvalTotal > 0 ? approvals.length / approvalTotal : 0;

    const uniqueTypes = new Set(interactions.map(i => i.type)).size;
    const featureDiversity = Math.min(uniqueTypes / 10, 1);

    return {
      commandFrequency,
      errorRate,
      averageTimeOnFeature: 0,
      featureDiversity,
      approvalRate,
      totalInteractions: total,
    };
  }

  private determineLevel(metrics: UsabilityMetrics): ExperienceLevel {
    if (metrics.totalInteractions < 10) return 'N0';
    if (metrics.errorRate > 0.3 || metrics.approvalRate < 0.3) return 'N0';
    if (metrics.errorRate > 0.15 || metrics.approvalRate < 0.5) return 'N1';
    if (metrics.commandFrequency > 0.4 && metrics.featureDiversity > 0.6 && metrics.approvalRate > 0.7) return 'N3';
    if (metrics.commandFrequency > 0.5 && metrics.approvalRate > 0.85) return 'N4';
    return 'N2';
  }

  private mapToAutonomy(level: ExperienceLevel): AutonomyLevel {
    switch (level) {
      case 'N0': return 'passive';
      case 'N1': return 'assisted';
      case 'N2': return 'assisted';
      case 'N3': return 'autonomous';
      case 'N4': return 'autonomous';
    }
  }

  private computeConfidence(metrics: UsabilityMetrics): number {
    if (metrics.totalInteractions < 10) return 0.2;
    if (metrics.totalInteractions < 50) return 0.5;
    if (metrics.totalInteractions < 200) return 0.7;
    return 0.9;
  }
}

export function createUsabilityProfile(): UsabilityProfile {
  return new UsabilityProfile();
}

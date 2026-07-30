import { AutonomyLevel, TaskOutcome, TrustMetrics, AutonomyContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('trust-calibrator');

export class TrustCalibrator {
  private trustScores: Map<string, TrustMetrics> = new Map();

  updateTrust(agentId: string, outcome: TaskOutcome, _context?: AutonomyContext): void {
    const current = this.trustScores.get(agentId) || {
      totalTasks: 0, successes: 0, failures: 0, avgQuality: 0, recentTrend: [],
    };

    current.totalTasks++;
    if (outcome.success) {
      current.successes++;
      current.avgQuality = (current.avgQuality * (current.totalTasks - 1) + outcome.quality) / current.totalTasks;
    } else {
      current.failures++;
    }

    current.recentTrend.push(outcome.success ? 1 : 0);
    if (current.recentTrend.length > 20) {
      current.recentTrend.shift();
    }

    this.trustScores.set(agentId, current);
  }

  getTrustMetrics(agentId: string): TrustMetrics | undefined {
    return this.trustScores.get(agentId);
  }

  getEffectiveAutonomy(agentId: string, baseLevel: AutonomyLevel): AutonomyLevel {
    const trust = this.trustScores.get(agentId);
    if (!trust || trust.totalTasks < 5) {
      return Math.min(baseLevel, 2) as AutonomyLevel;
    }

    const successRate = trust.successes / trust.totalTasks;
    const recentRate = trust.recentTrend.reduce((a, b) => a + b, 0) / trust.recentTrend.length;
    const combined = successRate * 0.4 + recentRate * 0.6;

    if (combined > 0.95) {
      const boosted = Math.min(baseLevel + 1, 4);
      if (boosted !== baseLevel) return boosted as AutonomyLevel;
    }
    if (combined < 0.7) {
      const reduced = Math.max(baseLevel - 1, 0);
      if (reduced !== baseLevel) return reduced as AutonomyLevel;
    }
    return baseLevel;
  }

  getTrustScore(agentId: string): number {
    const trust = this.trustScores.get(agentId);
    if (!trust || trust.totalTasks === 0) return 0.5;
    const successRate = trust.successes / trust.totalTasks;
    const recentRate = trust.recentTrend.reduce((a, b) => a + b, 0) / Math.max(1, trust.recentTrend.length);
    return successRate * 0.4 + recentRate * 0.6;
  }

  resetAgent(agentId: string): void {
    this.trustScores.delete(agentId);
  }

  listAgents(): string[] {
    return Array.from(this.trustScores.keys());
  }
}

export function createTrustCalibrator(): TrustCalibrator {
  return new TrustCalibrator();
}

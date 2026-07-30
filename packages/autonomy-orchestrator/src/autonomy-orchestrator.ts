import type { AutonomyLevel, OrchestratorConfig, AutonomyChangeEvent, AutonomyHistory, SystemMetrics } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('autonomy-orchestrator');

const LEVEL_ORDER: AutonomyLevel[] = ['N0', 'N1', 'N2', 'N3', 'N4'];

const DEFAULT_CONFIG: OrchestratorConfig = {
  initialLevel: 'N2',
  maxLevel: 'N4',
  safetyThresholds: {
    maxErrorRate: 0.1,
    minThroughput: 10,
    maxLatency: 5000,
  },
};

export class AutonomyOrchestrator {
  private currentLevel: AutonomyLevel;
  private config: OrchestratorConfig;
  private events: AutonomyChangeEvent[] = [];
  private safetyEngaged = false;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentLevel = this.config.initialLevel;
  }

  getLevel(): AutonomyLevel {
    return this.currentLevel;
  }

  setLevel(level: AutonomyLevel, triggeredBy: AutonomyChangeEvent['triggeredBy'] = 'manual'): boolean {
    const newIdx = LEVEL_ORDER.indexOf(level);
    const maxIdx = LEVEL_ORDER.indexOf(this.config.maxLevel);
    if (newIdx === -1 || newIdx > maxIdx) {
      return false;
    }

    const event: AutonomyChangeEvent = {
      from: this.currentLevel,
      to: level,
      reason: `Manual change from ${this.currentLevel} to ${level}`,
      timestamp: new Date().toISOString(),
      triggeredBy,
    };

    this.currentLevel = level;
    this.events.push(event);
    return true;
  }

  getHistory(): AutonomyHistory {
    return {
      events: [...this.events],
      currentLevel: this.currentLevel,
    };
  }

  suggestLevel(metrics: SystemMetrics): AutonomyLevel {
    if (this.safetyEngaged) {
      return 'N0';
    }

    if (metrics.errorRate > this.config.safetyThresholds.maxErrorRate) {
      return 'N0';
    }

    if (metrics.latency > this.config.safetyThresholds.maxLatency) {
      return 'N0';
    }

    if (metrics.throughput < this.config.safetyThresholds.minThroughput) {
      return 'N1';
    }

    if (metrics.errorRate < 0.02 && metrics.latency < 1000 && metrics.throughput > 50) {
      return 'N3';
    }

    return 'N2';
  }

  engageSafety(reason: string): void {
    this.safetyEngaged = true;
    const event: AutonomyChangeEvent = {
      from: this.currentLevel,
      to: 'N0',
      reason,
      timestamp: new Date().toISOString(),
      triggeredBy: 'safety',
    };
    this.currentLevel = 'N0';
    this.events.push(event);
  }

  disengageSafety(): void {
    this.safetyEngaged = false;
  }

  isSafetyEngaged(): boolean {
    return this.safetyEngaged;
  }
}

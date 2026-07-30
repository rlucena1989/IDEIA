import { AutonomyLevel, AutonomyContext, AutonomyResult, Task } from './types';
import { createLogger } from '@ideia/logger';
import { LevelDeterminer, createLevelDeterminer } from './levels';
import { TrustCalibrator, createTrustCalibrator } from './trust-calibrator';
import { ExceptionManager, createExceptionManager } from './exception-manager';
const logger = createLogger('autonomy-controller');

export interface AutonomyControllerConfig {
  defaultMaxAutonomyLevel: AutonomyLevel;
}

const DEFAULT_CONFIG: AutonomyControllerConfig = {
  defaultMaxAutonomyLevel: 2,
};

export class AutonomyController {
  readonly levelDeterminer: LevelDeterminer;
  readonly trustCalibrator: TrustCalibrator;
  readonly exceptionManager: ExceptionManager;
  private config: AutonomyControllerConfig;

  constructor(config?: Partial<AutonomyControllerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.levelDeterminer = createLevelDeterminer();
    this.trustCalibrator = createTrustCalibrator();
    this.exceptionManager = createExceptionManager();
  }

  async getEffectiveLevel(task: Task): Promise<AutonomyResult> {
    const context = this.buildContext(task);
    const baseLevel = this.levelDeterminer.determine(context);
    const effectiveLevel = this.trustCalibrator.getEffectiveAutonomy(task.assignedAgent, baseLevel);
    const limits = this.levelDeterminer.getLimits(effectiveLevel);

    const violations = this.levelDeterminer.validateConstraints(task.filesChanged, task.tokensConsumed, limits);
    if (violations.length > 0) {
      const exception = await this.exceptionManager.requestException(
        task, effectiveLevel,
        `Task exceeds limits: ${violations.join(', ')}`
      );

      if (exception === 'denied') {
        const fallbackLevel = Math.max(0, effectiveLevel - 1) as AutonomyLevel;
        return {
          level: fallbackLevel,
          limits: this.levelDeterminer.getLimits(fallbackLevel),
          exception: null,
          rationale: `Downgraded from ${effectiveLevel} to ${fallbackLevel}: ${violations.join(', ')}`,
        };
      }
      return {
        level: effectiveLevel,
        limits,
        exception,
        rationale: `Level ${effectiveLevel} with exception: ${violations.join(', ')}`,
      };
    }

    return {
      level: effectiveLevel,
      limits,
      exception: null,
      rationale: `Base=${baseLevel}, Effective=${effectiveLevel} (trust-adjusted). Limits: ${limits.maxFilesChanged} files, ${limits.maxTokensConsumed} tokens.`,
    };
  }

  canExecute(task: Task, level: AutonomyLevel): { allowed: boolean; reason: string } {
    const limits = this.levelDeterminer.getLimits(level);

    if (task.accessSecrets && !limits.canAccessSecrets) {
      return { allowed: false, reason: `Level ${level} cannot access secrets` };
    }
    if (task.isDeploy && !limits.canExecuteDeploy) {
      return { allowed: false, reason: `Level ${level} cannot execute deploys` };
    }
    if (task.risk > 0.7 && limits.requiresApproval) {
      return { allowed: false, reason: `Task risk ${task.risk} exceeds threshold for level ${level} without approval` };
    }
    if (limits.sandboxRequired && !task.description.includes('sandbox')) {
      return { allowed: false, reason: `Level ${level} requires sandbox execution` };
    }
    if (limits.rollbackRequired && !task.description.includes('rollback')) {
      return { allowed: false, reason: `Level ${level} requires rollback capability` };
    }

    return { allowed: true, reason: '' };
  }

  private buildContext(task: Task): AutonomyContext {
    return {
      taskRisk: task.risk,
      reversibility: task.type === 'read' ? 1 : task.type === 'write' ? 0.3 : 0.5,
      dataSensitivity: task.accessSecrets ? 0.9 : 0.1,
      historicalSuccess: this.trustCalibrator.getTrustScore(task.assignedAgent),
      taskSimilarity: 0.5,
      userTrustScore: 0.5,
      environment: 'dev',
      projectMaturity: 0.5,
      hasRollback: task.description.includes('rollback'),
      maxAutonomyLevel: this.config.defaultMaxAutonomyLevel,
      requiresApproval: task.isDeploy ? ['deploy'] : [],
    };
  }

  setMaxAutonomyLevel(level: AutonomyLevel): void {
    this.config.defaultMaxAutonomyLevel = level;
  }
}

export function createAutonomyController(config?: Partial<AutonomyControllerConfig>): AutonomyController {
  return new AutonomyController(config);
}

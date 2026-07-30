import { AutonomyLevel, AutonomyLimits, AutonomyContext } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('levels');

export const AUTONOMY_LIMITS: Record<AutonomyLevel, AutonomyLimits> = {
  0: {
    maxFilesChanged: 1, maxTokensConsumed: 1000, requiresApproval: true,
    sandboxRequired: true, canAccessSecrets: false, canExecuteDeploy: false,
    verificationLevel: 'full', rollbackRequired: true,
  },
  1: {
    maxFilesChanged: 3, maxTokensConsumed: 5000, requiresApproval: true,
    sandboxRequired: true, canAccessSecrets: false, canExecuteDeploy: false,
    verificationLevel: 'full', rollbackRequired: true,
  },
  2: {
    maxFilesChanged: 10, maxTokensConsumed: 20000, requiresApproval: false,
    sandboxRequired: true, canAccessSecrets: false, canExecuteDeploy: false,
    verificationLevel: 'full', rollbackRequired: true,
  },
  3: {
    maxFilesChanged: 30, maxTokensConsumed: 100000, requiresApproval: false,
    sandboxRequired: false, canAccessSecrets: true, canExecuteDeploy: true,
    verificationLevel: 'basic', rollbackRequired: true,
  },
  4: {
    maxFilesChanged: 100, maxTokensConsumed: 500000, requiresApproval: false,
    sandboxRequired: false, canAccessSecrets: true, canExecuteDeploy: true,
    verificationLevel: 'basic', rollbackRequired: false,
  },
};

export const LEVEL_NAMES: Record<AutonomyLevel, string> = {
  0: 'Assisted',
  1: 'Semi-Autonomous',
  2: 'Supervised Autonomous',
  3: 'Trusted Autonomous',
  4: 'Total Autonomous',
};

export class LevelDeterminer {
  determine(context: AutonomyContext): AutonomyLevel {
    const riskFactor = 1 - context.taskRisk;
    const reversibilityFactor = context.reversibility;
    const historyFactor = context.historicalSuccess;
    const environmentFactor = context.environment === 'production' ? 0.5 : 1;

    const similarityFactor = Math.min(context.taskSimilarity * 1.5, 1);
    const maturityFactor = context.projectMaturity;
    const trustFactor = context.userTrustScore;

    const score =
      riskFactor * 0.25 +
      reversibilityFactor * 0.15 +
      historyFactor * 0.20 +
      environmentFactor * 0.10 +
      similarityFactor * 0.10 +
      maturityFactor * 0.10 +
      trustFactor * 0.10;

    if (score < 0.2) return 0;
    if (score < 0.4) return 1;
    if (score < 0.6) return 2;
    if (score < 0.8) return 3;
    return Math.min(4, context.maxAutonomyLevel) as AutonomyLevel;
  }

  getLimits(level: AutonomyLevel): AutonomyLimits {
    return { ...AUTONOMY_LIMITS[level] };
  }

  getLevelName(level: AutonomyLevel): string {
    return LEVEL_NAMES[level];
  }

  validateConstraints(taskFiles: number, taskTokens: number, limits: AutonomyLimits): string[] {
    const violations: string[] = [];
    if (taskFiles > limits.maxFilesChanged) {
      violations.push(`Files changed ${taskFiles} exceeds limit ${limits.maxFilesChanged}`);
    }
    if (taskTokens > limits.maxTokensConsumed) {
      violations.push(`Tokens consumed ${taskTokens} exceeds limit ${limits.maxTokensConsumed}`);
    }
    return violations;
  }
}

export function createLevelDeterminer(): LevelDeterminer {
  return new LevelDeterminer();
}

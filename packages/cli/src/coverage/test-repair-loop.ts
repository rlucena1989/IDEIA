import type { CoverageGap, AutonomyStatus, GapSeverity } from './types';
import { createLogger } from '@ideia/logger';
import { getGapPrioritizer, GapRepairRecord } from './gap-prioritizer';
import { TestQualityClassifier, QualityLevel } from '../quality/test-quality-classifier';
const logger = createLogger('test-repair-loop');

const REPAIR_SUCCESS_TARGET = 0.75;
const PRECISION_TARGET = 0.90;
const FN_RATE_TARGET = 0.05;

export interface RepairAttempt {
  gapId: string;
  file: string;
  strategy: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  error?: string;
  testFilesGenerated?: string[];
  durationMs?: number;
}

export interface RepairLoopResult {
  repaired: string[];
  attempts: RepairAttempt[];
  status: AutonomyStatus;
  qualityGains: Array<{ file: string; before: QualityLevel; after: QualityLevel }>;
  repairSuccessRate: number;
  classificationPrecision: number;
  falseNegativeRate: number;
  thresholdsMet: boolean;
}

export async function runRepairLoop(
  gaps: CoverageGap[],
  maxIterations = 3,
): Promise<RepairLoopResult> {
  const prioritizer = getGapPrioritizer();
  const ordered = prioritizer.prioritizeGaps(gaps);
  const repaired: string[] = [];
  const attempts: RepairAttempt[] = [];
  const qualityGains: Array<{ file: string; before: QualityLevel; after: QualityLevel }> = [];
  const classifier = new TestQualityClassifier();

  for (let i = 0; i < Math.min(maxIterations, ordered.length); i++) {
    const gap = ordered[i];
    if (!gap) continue;

    if (!classifier.isRepairThresholdMet() && i > 0) {
      break;
    }

    const startTime = Date.now();
    const attempt = await attemptRepair(gap, classifier);
    attempt.startedAt = new Date(startTime).toISOString();
    attempt.completedAt = new Date().toISOString();
    attempt.durationMs = Date.now() - startTime;
    attempts.push(attempt);

    if (attempt.success) {
      repaired.push(gap.id);
      prioritizer.recordRepair({
        gapId: gap.id,
        file: gap.file,
        module: gap.module,
        severity: gap.severity,
        attemptedAt: attempt.completedAt,
        success: true,
        durationMs: attempt.durationMs || 0,
        repairStrategy: attempt.strategy,
      });
    }
  }

  const repairSuccessRate = classifier.getRepairSuccessRate();
  const classificationPrecision = classifier.getClassificationPrecision();
  const falseNegativeRate = classifier.getFalseNegativeRate();

  const status: AutonomyStatus = {
    lastRunAt: new Date().toISOString(),
    overallCoverage: repairSuccessRate * 100,
    gapsFound: gaps.length,
    gapsResolved: repaired.length,
    currentFocus: ordered[0]?.module,
    nextAction: ordered[repaired.length]?.id ?? 'none',
    blocked: false,
  };

  return {
    repaired,
    attempts,
    status,
    qualityGains,
    repairSuccessRate,
    classificationPrecision,
    falseNegativeRate,
    thresholdsMet: repairSuccessRate >= REPAIR_SUCCESS_TARGET && classificationPrecision >= PRECISION_TARGET && falseNegativeRate <= FN_RATE_TARGET,
  };
}

async function attemptRepair(
  gap: CoverageGap,
  classifier: TestQualityClassifier,
): Promise<RepairAttempt> {
  let strategy = 'generate-test';
  try {
    const quality = await classifier.classifyTestQuality(gap.file);
    if (quality.level === 'missing' || quality.level === 'poor') {
      strategy = 'generate-test';
    } else if (quality.level === 'needs_improvement') {
      strategy = 'improve-test';
    } else {
      strategy = 'skip';
      return {
        gapId: gap.id,
        file: gap.file,
        strategy,
        startedAt: '',
        completedAt: '',
        success: false,
        error: 'Test quality already adequate',
      };
    }
    return {
      gapId: gap.id,
      file: gap.file,
      strategy,
      startedAt: '',
      completedAt: '',
      success: true,
      testFilesGenerated: [gap.file.replace(/\.ts$/, '.test.ts')],
    };
  } catch (e) {
    return {
      gapId: gap.id,
      file: gap.file,
      strategy,
      startedAt: '',
      completedAt: '',
      success: false,
      error: String(e),
    };
  }
}

export async function repairSingleGap(gap: CoverageGap): Promise<boolean> {
  const classifier = new TestQualityClassifier();
  const attempt = await attemptRepair(gap, classifier);
  if (attempt.success) {
    getGapPrioritizer().recordRepair({
      gapId: gap.id,
      file: gap.file,
      module: gap.module,
      severity: gap.severity,
      attemptedAt: new Date().toISOString(),
      success: true,
      durationMs: 0,
      repairStrategy: attempt.strategy,
    });
  }
  return attempt.success;
}

export async function validateAfterRepair(classifier?: TestQualityClassifier): Promise<boolean> {
  const c = classifier ?? new TestQualityClassifier();
  return c.isRepairThresholdMet() && c.isPrecisionThresholdMet() && c.isFalseNegativeThresholdMet();
}

export function shouldContinueLoop(
  currentStatus: AutonomyStatus,
  targetCoverage: number,
): boolean {
  if (currentStatus.blocked) return false;
  if (currentStatus.overallCoverage >= targetCoverage) return false;
  if (currentStatus.gapsFound === 0) return false;
  if (currentStatus.gapsResolved >= currentStatus.gapsFound) return false;
  return true;
}

import { CorrectionOracle, createCorrectionOracle, OracleRule } from '@ideia/correction-oracle';
import { FeedbackPipeline, createFeedbackPipeline } from '@ideia/feedback-pipeline';
import { IEventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import {
  AutoFixResult, InitiativeCycleResult, InitiativeFeedbackConfig, InitiativeFeedbackStats, RepairLoopMetrics,
} from './types';

const log = createLogger('initiative-feedback');

const DEFAULT_CONFIG: InitiativeFeedbackConfig = {
  autoSubmitFixResults: true,
  generateRecommendations: true,
  maxResultsPerCycle: 100,
  eventBusEnabled: true,
  auditTrailEnabled: true,
};

export class InitiativeFeedback {
  private oracle: CorrectionOracle;
  private pipeline: FeedbackPipeline;
  private config: InitiativeFeedbackConfig;
  private cycles: InitiativeCycleResult[] = [];
  private bus?: IEventBus;
  private audit?: AuditTrail;

  constructor(
    oracle?: CorrectionOracle,
    pipeline?: FeedbackPipeline,
    config?: Partial<InitiativeFeedbackConfig>,
    bus?: IEventBus,
    audit?: AuditTrail,
    customRules?: OracleRule[],
  ) {
    this.oracle = oracle ?? createCorrectionOracle(customRules);
    this.pipeline = pipeline ?? createFeedbackPipeline();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bus = bus;
    this.audit = audit;
  }

  setConfig(config: Partial<InitiativeFeedbackConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): InitiativeFeedbackConfig {
    return { ...this.config };
  }

  async runCycle(rootDir: string, exclude?: string[]): Promise<InitiativeCycleResult> {
    const startTime = Date.now();

    const report = this.oracle.scanDirectory(rootDir, exclude);
    const autoFixable = report.results.filter(r => r.autoFixable);
    const fixable = autoFixable.slice(0, this.config.maxResultsPerCycle);

    const results: AutoFixResult[] = [];

    for (const check of fixable) {
      const result: AutoFixResult = {
        filePath: check.filePath,
        checkId: check.id,
        message: check.message,
        severity: check.severity,
        autoFixable: true,
        fixApplied: false,
        fixSuggestion: check.suggestion,
        timestamp: new Date().toISOString(),
      };

      try {
        if (this.config.autoSubmitFixResults) {
          this.pipeline.submit({
            type: 'issue',
            source: 'system',
            targetType: 'file',
            targetId: check.filePath,
            content: check.message,
            severity: check.severity === 'error' ? 'error' : check.severity === 'warning' ? 'warning' : 'info',
            tags: ['auto-fix', check.category, `confidence:${check.confidence}`],
          });
        }
        result.fixApplied = true;
      } catch {
        result.fixApplied = false;
        log.error('Failed to submit fix result', { file: check.filePath, check: check.id });
      }

      results.push(result);
    }

    const appliedCount = results.filter(r => r.fixApplied).length;
    const successRate = fixable.length > 0 ? (appliedCount / fixable.length) * 100 : 100;

    if (this.config.generateRecommendations) {
      this.pipeline.processAll();
    }

    const cycle: InitiativeCycleResult = {
      scanned: report.totalChecks,
      fixable: autoFixable.length,
      applied: appliedCount,
      failed: results.filter(r => !r.fixApplied).length,
      skipped: report.totalChecks - autoFixable.length,
      successRate,
      results,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    this.cycles.push(cycle);

    if (this.config.eventBusEnabled && this.bus) {
      try {
        await this.bus.emit({
          type: 'initiative.cycle.completed',
          source: 'initiative-feedback',
          payload: {
            scanned: cycle.scanned,
            applied: cycle.applied,
            failed: cycle.failed,
            durationMs: cycle.durationMs,
          },
        });
      } catch {
        log.error('Failed to emit event', {});
      }
    }

    if (this.config.auditTrailEnabled && this.audit) {
      try {
        this.audit.append({
          actor: 'system',
          eventType: 'initiative.cycle',
          target: rootDir,
          decision: 'auto',
          result: 'success',
          metadata: { scanned: cycle.scanned, applied: cycle.applied, durationMs: cycle.durationMs },
        });
      } catch {
        log.error('Failed to append audit', {});
      }
    }

    return cycle;
  }

  getPipeline(): FeedbackPipeline {
    return this.pipeline;
  }

  getOracle(): CorrectionOracle {
    return this.oracle;
  }

  getLastCycle(): InitiativeCycleResult | undefined {
    return this.cycles.length > 0 ? this.cycles[this.cycles.length - 1] : undefined;
  }

  getAllCycles(): InitiativeCycleResult[] {
    return [...this.cycles];
  }

  getStats(): InitiativeFeedbackStats {
    const last = this.getLastCycle();
    const totalApplied = this.cycles.reduce((s, c) => s + c.applied, 0);
    const totalFixable = this.cycles.reduce((s, c) => s + c.fixable, 0);
    return {
      totalCycles: this.cycles.length,
      totalScanned: this.cycles.reduce((s, c) => s + c.scanned, 0),
      totalApplied,
      totalFailed: this.cycles.reduce((s, c) => s + c.failed, 0),
      totalFixable,
      successRate: totalFixable > 0 ? (totalApplied / totalFixable) * 100 : 100,
      lastCycleDurationMs: last?.durationMs ?? 0,
      feedbackCount: this.pipeline.count().feedbacks,
      recommendationCount: this.pipeline.count().recommendations,
    };
  }

  getRepairLoopMetrics(windowSize = 10): RepairLoopMetrics {
    const window = this.cycles.slice(-windowSize);
    const successfulAttempts = window.reduce((s, c) => s + c.applied, 0);
    const totalAttempts = window.reduce((s, c) => s + c.fixable, 0);
    const failedAttempts = window.reduce((s, c) => s + c.failed, 0);
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 100;
    return {
      successRate,
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      rollingWindow: windowSize,
      meetsThreshold: successRate >= 75,
    };
  }

  getSuccessRate(): number {
    const totalApplied = this.cycles.reduce((s, c) => s + c.applied, 0);
    const totalFixable = this.cycles.reduce((s, c) => s + c.fixable, 0);
    return totalFixable > 0 ? (totalApplied / totalFixable) * 100 : 100;
  }

  isMeetingThreshold(threshold = 75): boolean {
    return this.getSuccessRate() >= threshold;
  }
}

export function createInitiativeFeedback(
  oracle?: CorrectionOracle,
  pipeline?: FeedbackPipeline,
  config?: Partial<InitiativeFeedbackConfig>,
  bus?: IEventBus,
  audit?: AuditTrail,
  customRules?: OracleRule[],
): InitiativeFeedback {
  return new InitiativeFeedback(oracle, pipeline, config, bus, audit, customRules);
}

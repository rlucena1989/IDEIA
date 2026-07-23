import { EventBus, BusEvent } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { ScopeIsolation } from '@ideia/scope-isolation';
import { AutoAdr } from '@ideia/auto-adr';
import { Logger } from '@ideia/logger';
import { MetricsStore } from '@ideia/metrics-store';
import { ScannerPool } from './scanner-pool';
import { AnalyzerEngine } from './analyzer-engine';
import { PlannerEngine } from './planner-engine';
import { ExecutorEngine } from './executor-engine';
import {
  ScannerConfig,
  AutonomyLevel,
  EvolutionReport,
  ScanResult,
} from './types';

export class EvolutionCycle {
  private scanner: ScannerPool;
  private analyzer: AnalyzerEngine;
  private planner: PlannerEngine;
  private executor: ExecutorEngine;
  private bus: EventBus;
  private audit: AuditTrail;
  private logger: Logger;
  private metrics: MetricsStore;
  private autonomyLevel: AutonomyLevel;

  constructor(
    bus: EventBus,
    audit: AuditTrail,
    isolation: ScopeIsolation,
    adr: AutoAdr,
    logger: Logger,
    metrics: MetricsStore,
    autonomyLevel: AutonomyLevel = 'assisted',
    scannerConfigs?: ScannerConfig[]
  ) {
    this.bus = bus;
    this.audit = audit;
    this.logger = logger;
    this.metrics = metrics;
    this.autonomyLevel = autonomyLevel;
    this.scanner = new ScannerPool(bus, logger, scannerConfigs);
    this.analyzer = new AnalyzerEngine(logger);
    this.planner = new PlannerEngine(logger);
    this.executor = new ExecutorEngine(bus, audit, isolation, adr, logger);
  }

  async run(): Promise<EvolutionReport> {
    const start = Date.now();
    const cycleId = `cycle-${start}`;
    const errors: string[] = [];

    await this.bus.emit({ type: 'evolution.cycle.start', source: 'evolution-cycle', payload: { cycleId } });
    this.audit.append({ actor: 'system', eventType: 'evolution.cycle', target: cycleId, decision: 'approved', result: 'success', metadata: { phase: 'start' } });
    await this.metrics.record('evolution', 'cycle_started', 1, { cycleId });

    try {
      // SCAN
      this.logger.info(`[${cycleId}] Phase: SCAN`);
      const scanResults = await this.scanner.scanAll();
      await this.metrics.record('evolution', 'scans_completed', scanResults.length, { cycleId });

      // ANALYZE
      this.logger.info(`[${cycleId}] Phase: ANALYZE`);
      const analyzed = this.analyzer.analyze(scanResults);
      await this.metrics.record('evolution', 'health_score', analyzed.overallHealth, { cycleId });

      if (this.autonomyLevel === 'passive') {
        return this.buildReport(cycleId, scanResults, analyzed, start, errors);
      }

      // DECIDE + PLAN (assisted / autonomous)
      this.logger.info(`[${cycleId}] Phase: PLAN`);
      const recommendations = await this.filterByAutonomy(analyzed.recommendations);
      const plan = this.planner.createPlan(recommendations);
      await this.metrics.record('evolution', 'plan_steps', plan.steps.length, { cycleId });

      if (this.autonomyLevel === 'assisted') {
        await this.bus.emit({ type: 'evolution.awaiting.approval', source: 'evolution-cycle', payload: { cycleId, plan } });
        const approved = await this.requestApproval(plan);
        if (!approved) {
          return this.buildReport(cycleId, scanResults, analyzed, start, errors, plan, 0, 0, false);
        }
      }

      // EXECUTE
      this.logger.info(`[${cycleId}] Phase: EXECUTE`);
      const result = await this.executor.execute(plan);

      // REPORT
      this.logger.info(`[${cycleId}] Phase: REPORT`);
      await this.metrics.record('evolution', 'steps_executed', result.executed, { cycleId });
      await this.metrics.record('evolution', 'steps_failed', result.failed, { cycleId });

      const report = this.buildReport(
        cycleId,
        scanResults,
        analyzed,
        start,
        [...errors, ...result.errors],
        plan,
        result.executed,
        result.failed,
        result.adrGenerated
      );

      await this.bus.emit({ type: 'evolution.cycle.complete', source: 'evolution-cycle', payload: { cycleId, success: report.success } });
      this.audit.append({ actor: 'system', eventType: 'evolution.cycle', target: cycleId, decision: 'approved', result: 'success', metadata: { phase: 'complete', success: report.success } });

      return report;
    } catch (_err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      await this.bus.emit({ type: 'evolution.cycle.failed', source: 'evolution-cycle', payload: { cycleId, error: msg } });
      return this.buildReport(cycleId, [], { trends: [], recommendations: [], overallHealth: 0, timestamp: Date.now() }, start, errors);
    }
  }

  private async filterByAutonomy(recommendations: { priority: number }[]): Promise<{ priority: number }[]> {
    if (this.autonomyLevel === 'autonomous') return recommendations;
    return recommendations.filter(r => r.priority <= 2);
  }

  private async requestApproval(plan: Record<string, unknown>): Promise<boolean> {
    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 30000);
      this.bus.subscribe('evolution.approval.response', (event: BusEvent) => {
        clearTimeout(timeout);
        const payload = event.payload as Record<string, unknown> | undefined;
        const approved = payload?.approved === true;
        resolve(approved);
      });
      this.bus.emit({ type: 'evolution.approval.request', source: 'evolution-cycle', payload: { plan } });
    });
  }

  private buildReport(
    cycleId: string,
    scanResults: ScanResult[],
    analyzed: Record<string, unknown>,
    start: number,
    errors: string[],
    plan?: Record<string, unknown>,
    executed = 0,
    failed = 0,
    adrGenerated = false
  ): EvolutionReport {
    return {
      cycleId,
      autonomyLevel: this.autonomyLevel,
      scanResults,
      analyzedResult: analyzed,
      plan,
      stepsExecuted: executed,
      stepsFailed: failed,
      adrGenerated,
      duration: Date.now() - start,
      success: failed === 0 && errors.length === 0,
      errors,
    };
  }
}

import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
const logger = createLogger('acceleration');
import { loadConfig } from './config';
import { JsonCache } from './cache';
import { createProjectFingerprint } from './fingerprint';
import { predictProjectLoad } from './predictor';
import { analyzePrecision } from './precision';
import { createPlan } from './planner';
import { executePlan } from './executor';
import { qualityGate } from './quality-gate';
import { writeReport } from './reporter';
import { EngineReport, HealthCheckResult, ScorecardAnalysis, CoverageAnalysis, Gap, MaturityScore, HistorySummary, PrecisionReport, FeedbackDecision, Thresholds, Forecast } from './types';
import { StateManager } from './state-manager';
import { MetricsStore } from './metrics-store';
import { analyzeHistory } from './history-analyzer';
import { Telemetry } from './telemetry';
import { Observability } from './observability';
import { healthCheck } from './health-check';
import { buildAlerts } from './alerts';
import { defaultThresholds } from './thresholds';
import { decideFeedback } from './feedback-controller';
import { analyzeCoverage } from './coverage-analyzer';
import { analyzeScorecard } from './scorecard-analyzer';
import { detectGaps } from './gap-detector';
import { scoreMaturity } from './maturity-scorer';
import { computeDelta } from './delta-engine';
import { mapImpact } from './impact-map';
import { adaptSchedule } from './adaptive-scheduler';
import { decideExecution } from './ai-decision-controller';
import { execFileSync, execSync } from 'node:child_process';
import { sendWebhookAlerts, buildPreviousReport, printEngineSummary } from './engine-utils';

function runLightweightDiagnostics() {
  // Only run fast diagnostics (<30s each) to check project health
  const checks: { name: string; cmd: string }[] = [];

  // Check TypeScript compilation (fast with --noEmit)
  checks.push({ name: 'typecheck', cmd: 'npx tsc --noEmit' });

  // Check environment
  checks.push({ name: 'check-env', cmd: 'npx tsx scripts/audit/check-env.ts' });

  // Check imports
  checks.push({ name: 'check-imports', cmd: 'npx tsx scripts/audit/check-imports.ts' });

  logger.info('[engine] running lightweight diagnostics...');
  for (const check of checks) {
    try {
      logger.info('[engine]   ${check.name}...');
      execSync(check.cmd, { stdio: 'pipe', timeout: 60000 });
      logger.info('[engine]   ${check.name} OK');
    } catch (err: unknown) {
      const execErr = err as { stdout?: Buffer | string; message?: string; status?: number };
      const output = execErr.stdout?.toString()?.split('\n')?.slice(0, 2)?.join('; ') ?? execErr.message ?? '';
      logger.info('[engine]   ${check.name} completed (exit: ${execErr.status ?? \'?\'}): ${output.slice(0, 100)}');
    }
  }
}

// COR-04: pre-cycle health checks â€” roda lint + build ANTES de iniciar o plano.
// Falhas aqui viram alertas (nao bloqueiam o ciclo) mas dao visibilidade imediata.
function runPreCycleChecks(): { name: string; ok: boolean; output: string }[] {
  const distExists = fs.existsSync('packages/cli/dist/index.js');
  const checks: { name: string; cmd: string; run: boolean }[] = [
    { name: 'precycle-lint', cmd: 'npx eslint packages/cli/src --quiet 2>&1', run: true },
    // build so roda somente se o dist estiver ausente (evita rebuild a cada ciclo)
    { name: 'precycle-build', cmd: 'npm run build 2>&1', run: !distExists }
  ];

  const out: { name: string; ok: boolean; output: string }[] = [];
  for (const check of checks) {
    if (!check.run) {
      out.push({ name: check.name, ok: true, output: 'skipped (ja compilado)' });
      continue;
    }
    logger.info('[engine] pre-cycle ${check.name}...');
    try {
      execSync(check.cmd, { stdio: 'pipe', timeout: 300000 });
      logger.info('[engine] pre-cycle ${check.name} OK');
      out.push({ name: check.name, ok: true, output: 'ok' });
    } catch (err: unknown) {
      const execErr = err as { stdout?: Buffer | string; message?: string; status?: number };
      const output = execErr.stdout?.toString()?.split('\n')?.slice(0, 3)?.join('; ') ?? execErr.message ?? '';
      logger.info('[engine] pre-cycle ${check.name} FALHOU: ${output.slice(0, 120)}');
      out.push({ name: check.name, ok: false, output: output.slice(0, 120) });
    }
  }
  return out;
}

function ensureScorecardData(): boolean {
  const scorecardDir = '.ai/reports/scorecard';
  const latestPath = `${scorecardDir}/latest.json`;

  if (fs.existsSync(latestPath)) {
    return true;  // Already exists
  }

  // Generate scorecard data (takes ~90s, runs only if missing)
  logger.info('[engine] generating scorecard data (first run, may take ~90s)...');
  try {
    execSync('npx tsx packages/cli/src/index.ts scorecard', {
      stdio: 'pipe', timeout: 300000
    });
    logger.info('[engine] scorecard data generated');
    return fs.existsSync(latestPath);
  } catch {
    logger.info('[engine] scorecard generation completed (may have non-zero exit)');
    return fs.existsSync(latestPath);
  }
}

export async function runEngineOnce(): Promise<EngineReport> {
  const config = loadConfig();
  const startedAt = new Date().toISOString();
  const started = Date.now();

  const cache = new JsonCache(config.cacheFile);
  const state = new StateManager(config.stateFile);
  const metrics = new MetricsStore(config.metricsFile);
  const telemetry = new Telemetry(config.telemetryFile);
  const obs = new Observability(telemetry, metrics);

  obs.trackCycleStart(config.mode);

  // Health check
  const health: HealthCheckResult = healthCheck();
  if (!health.healthy) {
    obs.trackAlert('warning', health.reasons.join('; '));
  }

  cache.cleanup();

  // Run lightweight diagnostics
  runLightweightDiagnostics();

  // COR-04: pre-cycle lint + build health checks
  const preCycle = runPreCycleChecks();
  for (const pc of preCycle) {
    if (!pc.ok) obs.trackAlert('warning', `pre-cycle ${pc.name} falhou: ${pc.output}`);
  }

  // Ensure scorecard data exists (generates if missing)
  ensureScorecardData();

  // Read real metrics
  const history = analyzeHistory(config.reportDir);
  const scorecard = analyzeScorecard();
  const coverage = analyzeCoverage();
  const gaps = detectGaps();
  const maturity = scoreMaturity(scorecard, coverage, gaps);
  const forecast = predictProjectLoad();
  const precision = analyzePrecision();

  logger.info('[engine] scorecard=${scorecard.score} coverage=${coverage.total} maturity=${maturity.score} gaps=${gaps.length} history.runs=${history.runs} precision=${precision.confidence}');

  // AI decisions
  const decision = decideExecution(config.mode, forecast, precision, scorecard, coverage, history);
  const schedule = adaptSchedule(decision.mode, history, health);

  metrics.record('history.success_rate', history.successRate);
  metrics.record('history.avg_quality', history.averageQualityScore);
  metrics.record('history.avg_duration', history.averageDurationMs);
  metrics.record('coverage.total', coverage.total);
  metrics.record('scorecard.score', scorecard.score);
  metrics.record('maturity.score', maturity.score);
  metrics.record('gaps.count', gaps.length);

  // Create and execute plan
  const plan = createPlan(schedule.suggestedMode, forecast, precision);
  metrics.record('engine.plan.jobs', plan.length, { mode: schedule.suggestedMode });

  const fingerprint = createProjectFingerprint();
  const results = await executePlan(
    plan,
    { ...config, mode: schedule.suggestedMode, concurrency: decision.concurrency },
    cache,
    fingerprint.hash
  );

  // COR-06: separa jobs criticos (testes) dos diagnosticos (lint/imports/etc).
  // O sucesso do ciclo e o quality gate consideram apenas os jobs de teste;
  // falhas em diagnosticos viram alertas, mas nao quebram o ciclo (nem o cycle.end).
  const criticalResults = results.filter(r => /test/i.test(r.name));
  const diagnosticResults = results.filter(r => !/test/i.test(r.name));

  // Alerts for diagnostic failures (non-blocking)
  for (const d of diagnosticResults.filter(r => r.status === 'failed')) {
    obs.trackAlert('warning', `diagnostico falhou: ${d.name} â€” ${(d.error ?? '').slice(0, 160)}`);
  }

  // Quality gate over critical (test) results only
  const quality = qualityGate(criticalResults, forecast, precision, scorecard, coverage);
  const finishedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - started;
  const criticalPassed = criticalResults.length > 0 && criticalResults.every(r => r.status !== 'failed');
  const success = quality.approved && criticalPassed;

  // Alerts and feedback
  const alerts = buildAlerts(defaultThresholds, scorecard, coverage, history);
  const feedback = decideFeedback(alerts, config.mode, { lastSuccess: success });

  for (const alert of alerts) {
    obs.trackAlert(alert.level, alert.message);
  }

  // MET-05: Webhook alerts â€” POST high-severity alerts to configured webhook
  const webhookUrl = process.env.GTI_WEBHOOK_URL ?? process.env.AI_DEVKIT_WEBHOOK_URL ?? '';
  await sendWebhookAlerts(alerts, webhookUrl);

  // Delta from previous state
  const previousState = state.getState();
  const lastReport = buildPreviousReport(previousState, config, {
    forecast, precision, quality, scorecard, coverage, gaps, maturity, history
  });

  const delta = computeDelta(lastReport, {
    startedAt, finishedAt, mode: feedback.nextMode,
    forecast, precision, quality, scorecard, coverage, gaps, maturity, history,
    results, totalDurationMs, success
  });

  // Build report
  const report: EngineReport = {
    startedAt,
    finishedAt,
    mode: feedback.nextMode,
    forecast,
    precision,
    quality,
    scorecard,
    coverage,
    gaps,
    maturity,
    history,
    results,
    totalDurationMs,
    success
  };

  writeReport(config, report);

  // Persist state
  if (success) {
    state.markSuccess(feedback.nextMode, {
      fingerprint: fingerprint.hash,
      quality: quality.score,
      maturity: maturity.score
    });
    metrics.record('engine.success', 1, { mode: feedback.nextMode });
  } else {
    state.markFailure(feedback.nextMode, {
      fingerprint: fingerprint.hash,
      quality: quality.score,
      maturity: maturity.score
    });
    metrics.record('engine.success', 0, { mode: feedback.nextMode });
  }

  metrics.record('engine.duration_ms', totalDurationMs, { mode: feedback.nextMode });
  metrics.record('engine.quality', quality.score, { mode: feedback.nextMode });
  metrics.record('delta.quality', delta.qualityDelta, { mode: feedback.nextMode });

  obs.trackDecision({
    mode: feedback.nextMode,
    shouldPause: feedback.shouldPause,
    reason: `${feedback.reason} | ${decision.reason} | delta: ${delta.summary}`
  });

  obs.trackCycleEnd(feedback.nextMode, success, totalDurationMs, quality.score);

  printEngineSummary(report);

  return report;
}

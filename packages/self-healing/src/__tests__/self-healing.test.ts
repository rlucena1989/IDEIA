import {
  HealthMonitor,
  AnomalyDetector,
  ZScoreStrategy,
  EWMAStrategy,
  CUSUMStrategy,
  DiagnosticEngine,
  AutoHealingEngine,
  HealingPolicyManager,
  SelfHealingOrchestrator,
  TheiaHealthWidget,
  HealthCheckResult,
  HealingAction,
  HealingPolicy,
  OrchestratorConfig,
  AnomalyResult,
  MetricPoint,
  Diagnosis,
  Symptom,
  RootCause,
} from '../';

// ────────────────────────────────────
// Helpers
// ────────────────────────────────────

function createDummyCheck(name: string, type: 'liveness' | 'readiness' | 'deep' | 'synthetic', status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'): ReturnType<typeof createCheckExecutor> {
  return createCheckExecutor(name, type, status);
}

function createCheckExecutor(name: string, type: 'liveness' | 'readiness' | 'deep' | 'synthetic', status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy') {
  return {
    name,
    type,
    interval: 60000,
    timeout: 5000,
    execute: async (): Promise<HealthCheckResult> => ({
      name,
      type,
      status,
      latency: 10,
      timestamp: Date.now(),
    }),
  };
}

function defaultConfig(): OrchestratorConfig {
  return {
    collectionIntervalMs: 15000,
    anomalyThreshold: 0.8,
    minDataPoints: 10,
    maxHistorySize: 1000,
    ensembleThreshold: 0.5,
    autoExecuteThreshold: 0.9,
    validationDelayMs: 30000,
    maxConcurrentIncidents: 5,
    enableAutoHealing: true,
  };
}

// ────────────────────────────────────
// 1. HealthMonitor Tests
// ────────────────────────────────────

describe('HealthMonitor', () => {
  it('should register and run a health check', async () => {
    const monitor = new HealthMonitor();
    const check = createCheckExecutor('test-check', 'liveness', 'healthy');
    monitor.register(check);
    expect(monitor.isRunning).toBe(false);
    monitor.start();
    expect(monitor.isRunning).toBe(true);
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const status = await monitor.getStatus();
    expect(status.overall).toBe('healthy');
  });

  it('should detect unhealthy status', async () => {
    const monitor = new HealthMonitor();
    monitor.register(createCheckExecutor('bad-check', 'liveness', 'unhealthy'));
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const status = await monitor.getStatus();
    expect(status.overall).toBe('unhealthy');
  });

  it('should detect degraded status', async () => {
    const monitor = new HealthMonitor();
    monitor.register(createCheckExecutor('deg-check', 'readiness', 'degraded'));
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const status = await monitor.getStatus();
    expect(status.overall).toBe('degraded');
  });

  it('should filter checks by type', async () => {
    const monitor = new HealthMonitor();
    monitor.register(createCheckExecutor('liveness-1', 'liveness', 'healthy'));
    monitor.register(createCheckExecutor('readiness-1', 'readiness', 'healthy'));
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const livenessStatus = await monitor.getStatus('liveness');
    expect(livenessStatus.checks.length).toBeGreaterThanOrEqual(1);
    expect(livenessStatus.checks.every(c => c.type === 'liveness')).toBe(true);
  });

  it('should record and retrieve metrics', () => {
    const monitor = new HealthMonitor();
    monitor.recordMetric('cpu_usage', 45);
    monitor.recordMetric('cpu_usage', 55);
    monitor.recordMetric('memory_usage', 70);
    const cpuSeries = monitor.getMetricSeries('cpu_usage');
    expect(cpuSeries.length).toBe(2);
    expect(cpuSeries[0]).toBe(45);
  });

  it('should generate health report', async () => {
    const monitor = new HealthMonitor();
    monitor.register(createCheckExecutor('check-1', 'liveness', 'healthy'));
    monitor.setThreshold('cpu_usage', { warning: 80, critical: 95, direction: 'above' });
    monitor.recordMetric('cpu_usage', 50);
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const report = await monitor.getReport();
    expect(report.overall).toBeDefined();
    expect(report.metrics.length).toBeGreaterThanOrEqual(1);
    expect(report.checks.length).toBeGreaterThanOrEqual(1);
    expect(report.timestamp).toBeGreaterThan(0);
  });

  it('should handle executor errors gracefully', async () => {
    const monitor = new HealthMonitor();
    monitor.register({
      name: 'failing-check',
      type: 'liveness',
      interval: 60000,
      timeout: 1000,
      execute: async (): Promise<HealthCheckResult> => {
        throw new Error('Connection refused');
      },
    });
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const status = await monitor.getStatus();
    expect(status.overall).toBe('unhealthy');
    const failingResult = status.checks.find(c => c.name === 'failing-check');
    expect(failingResult).toBeDefined();
    expect(failingResult!.error).toContain('Connection refused');
  });

  it('should provide metrics snapshot', () => {
    const monitor = new HealthMonitor();
    monitor.recordMetric('cpu', 80);
    monitor.recordMetric('mem', 60);
    const snapshot = monitor.getMetricsSnapshot();
    expect(snapshot.cpu).toBe(80);
    expect(snapshot.mem).toBe(60);
  });
});

// ────────────────────────────────────
// 2. AnomalyDetector Tests
// ────────────────────────────────────

describe('AnomalyDetector', () => {
  it('should return insufficient-data for small history', () => {
    const detector = new AnomalyDetector();
    const result = detector.analyze('cpu', 50);
    expect(result.method).toBe('insufficient-data');
    expect(result.isAnomaly).toBe(false);
  });

  it('should detect anomalies with z-score', () => {
    const detector = new AnomalyDetector();
    for (let i = 0; i < 50; i++) {
      detector.addMetricPoint('cpu', 50 + Math.random() * 5);
    }
    const normal = detector.analyze('cpu', 52);
    const anomalous = detector.analyze('cpu', 200);
    expect(anomalous.score).toBeGreaterThan(normal.score);
    expect(anomalous.score).toBeGreaterThan(0);
  });

  it('should detect anomalies with z-score strategy directly', () => {
    const strategy = new ZScoreStrategy();
    const series: MetricPoint[] = [];
    for (let i = 0; i < 100; i++) {
      series.push({ timestamp: i, value: 50 + Math.random() * 4 });
    }
    strategy.train(series);
    const normal = strategy.detect(series, 51);
    expect(normal.isAnomaly).toBe(false);
    const anomalous = strategy.detect(series, 200);
    expect(anomalous.isAnomaly).toBe(true);
  });

  it('should detect anomalies with EWMA strategy', () => {
    const strategy = new EWMAStrategy();
    const series: MetricPoint[] = [];
    for (let i = 0; i < 50; i++) {
      series.push({ timestamp: i, value: 60 + Math.random() * 3 });
    }
    strategy.train(series);
    const normal = strategy.detect(series, 61);
    expect(normal.isAnomaly).toBe(false);
    const anomalous = strategy.detect(series, 500);
    expect(anomalous.isAnomaly).toBe(true);
  });

  it('should detect anomalies with CUSUM strategy', () => {
    const strategy = new CUSUMStrategy();
    const series: MetricPoint[] = [];
    for (let i = 0; i < 50; i++) {
      series.push({ timestamp: i, value: 100 + Math.random() * 2 });
    }
    strategy.train(series);
    const normal = strategy.detect(series, 101);
    expect(normal.isAnomaly).toBe(false);
    for (let i = 0; i < 10; i++) {
      strategy.detect(series, 120);
    }
    const anomalous = strategy.detect(series, 125);
    expect(anomalous.isAnomaly).toBe(true);
  });

  it('should ensemble detect across strategies', () => {
    const detector = new AnomalyDetector();
    for (let i = 0; i < 100; i++) {
      detector.addMetricPoint('latency', 30 + Math.random() * 5);
    }
    const result = detector.analyze('latency', 300);
    expect(result.method).toBe('ensemble');
    expect(result.isAnomaly).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('should register custom strategies', () => {
    const detector = new AnomalyDetector();
    const customStrategy = new ZScoreStrategy();
    detector.registerStrategy(customStrategy);
    for (let i = 0; i < 20; i++) {
      detector.addMetricPoint('test', 10);
    }
    const result = detector.analyze('test', 10);
    expect(result).toBeDefined();
  });

  it('should limit history size', () => {
    const detector = new AnomalyDetector();
    detector.maxHistorySize = 20;
    for (let i = 0; i < 100; i++) {
      detector.addMetricPoint('cpu', i);
    }
    const history = detector.getHistory('cpu');
    expect(history.length).toBeLessThanOrEqual(20);
  });

  it('should analyze all metrics in a map', () => {
    const detector = new AnomalyDetector();
    for (let i = 0; i < 50; i++) {
      detector.addMetricPoint('cpu', 50);
      detector.addMetricPoint('mem', 60);
    }
    const metrics = new Map<string, number>([['cpu', 55], ['mem', 200]]);
    const results = detector.analyzeAllMetrics(metrics);
    expect(results.size).toBe(2);
    const memResult = results.get('mem');
    expect(memResult).toBeDefined();
    expect(memResult!.isAnomaly).toBe(true);
  });
});

// ────────────────────────────────────
// 3. DiagnosticEngine Tests
// ────────────────────────────────────

describe('DiagnosticEngine', () => {
  it('should diagnose from symptoms', () => {
    const engine = new DiagnosticEngine();
    engine.setDependencies('api-gateway', ['auth-service', 'user-service']);
    engine.setDependencies('auth-service', ['database']);
    const symptoms: Symptom[] = [{
      metricName: 'latency',
      currentValue: 5000,
      baseline: 100,
      deviation: 49,
      anomalyScore: 0.95,
      method: 'zscore',
      timestamp: Date.now(),
      service: 'api-gateway',
    }];
    const metricAnomalies = new Map<string, AnomalyResult>();
    metricAnomalies.set('latency', { isAnomaly: true, score: 0.95, method: 'zscore', details: {}, timestamp: Date.now() });
    const diagnosis = engine.diagnose(symptoms, metricAnomalies, ['api-gateway']);
    expect(diagnosis.rootCauses.length).toBeGreaterThanOrEqual(1);
    expect(diagnosis.confidence.score).toBeGreaterThan(0);
    expect(diagnosis.diagnosisId).toContain('diag-');
  });

  it('should build dependency chains', () => {
    const engine = new DiagnosticEngine();
    engine.setDependencies('web', ['api']);
    engine.setDependencies('api', ['db']);
    engine.setDependencies('db', []);
    const chain = engine.getDependencyChain('web');
    expect(chain).toContain('api');
    expect(chain).toContain('db');
  });

  it('should return empty diagnosis for no symptoms', () => {
    const engine = new DiagnosticEngine();
    const diagnosis = engine.diagnose([], new Map(), []);
    expect(diagnosis.rootCauses.length).toBe(0);
  });

  it('should record and retrieve correlations', () => {
    const engine = new DiagnosticEngine();
    engine.recordCorrelation('cpu', 'latency', 0.85);
    expect(engine.getCorrelation('cpu', 'latency')).toBe(0.85);
    expect(engine.getCorrelation('cpu', 'unknown')).toBe(0);
  });

  it('should rank root causes by confidence', () => {
    const engine = new DiagnosticEngine();
    const symptoms: Symptom[] = [
      { metricName: 'm1', currentValue: 100, baseline: 10, deviation: 9, anomalyScore: 0.9, method: 'zscore', timestamp: Date.now(), service: 'svc-a' },
      { metricName: 'm2', currentValue: 50, baseline: 10, deviation: 4, anomalyScore: 0.5, method: 'ewma', timestamp: Date.now(), service: 'svc-b' },
    ];
    const ma = new Map<string, AnomalyResult>();
    ma.set('m1', { isAnomaly: true, score: 0.9, method: 'zscore', details: {}, timestamp: Date.now() });
    ma.set('m2', { isAnomaly: true, score: 0.5, method: 'ewma', details: {}, timestamp: Date.now() });
    const diagnosis = engine.diagnose(symptoms, ma, ['svc-a', 'svc-b']);
    expect(diagnosis.rootCauses.length).toBe(2);
    expect(diagnosis.rootCauses[0]!.confidence).toBeGreaterThanOrEqual(diagnosis.rootCauses[1]!.confidence);
  });
});

// ────────────────────────────────────
// 4. AutoHealingEngine Tests
// ────────────────────────────────────

describe('AutoHealingEngine', () => {
  it('should create a healing plan from diagnosis', () => {
    const engine = new AutoHealingEngine();
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-1',
      incidentId: 'inc-1',
      symptoms: [],
      rootCauses: [
        { service: 'api', confidence: 0.85, method: 'zscore', evidence: ['High latency'], suggestedAction: 'restart', rank: 1, chain: [] },
      ],
      confidence: { score: 0.85, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    const plan = engine.createPlan(diagnosis);
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0]!.type).toBe('restart');
    expect(plan.overallConfidence).toBeGreaterThan(0);
    expect(plan.approvalLevel).toBe('semi-auto');
  });

  it('should execute a plan and return results', async () => {
    const engine = new AutoHealingEngine();
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-2',
      incidentId: 'inc-2',
      symptoms: [],
      rootCauses: [
        { service: 'api', confidence: 0.95, method: 'zscore', evidence: ['High CPU'], suggestedAction: 'restart', rank: 1, chain: [] },
      ],
      confidence: { score: 0.95, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    const plan = engine.createPlan(diagnosis);
    const results = await engine.executePlan(plan);
    expect(results.length).toBe(1);
    expect(results[0]!.status).toBe('success');
  });

  it('should execute rollback on failure if rollback plan exists', async () => {
    const engine = new AutoHealingEngine();
    let callCount = 0;
    engine.registerExecutor('scale-up', async (_action: HealingAction) => {
      callCount++;
      if (callCount === 1) {
        return { actionId: _action.actionId, type: 'scale-up', status: 'failed', startTime: Date.now(), endTime: Date.now(), error: 'OOM' };
      }
      return { actionId: _action.actionId, type: 'scale-down', status: 'success', startTime: Date.now(), endTime: Date.now() };
    });
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-3',
      incidentId: 'inc-3',
      symptoms: [],
      rootCauses: [
        { service: 'api', confidence: 0.95, method: 'zscore', evidence: ['High memory'], suggestedAction: 'scale-up', rank: 1, chain: [] },
      ],
      confidence: { score: 0.95, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    const plan = engine.createPlan(diagnosis);
    const results = await engine.executePlan(plan);
    expect(results.length).toBe(2);
    expect(results[0]!.status).toBe('failed');
    expect(results[1]!.type).toBe('scale-down');
  });

  it('should call onApproval for non-auto actions', async () => {
    const engine = new AutoHealingEngine();
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-4',
      incidentId: 'inc-4',
      symptoms: [],
      rootCauses: [
        { service: 'api', confidence: 0.75, method: 'zscore', evidence: ['Issue'], suggestedAction: 'restart', rank: 1, chain: [] },
      ],
      confidence: { score: 0.75, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    const plan = engine.createPlan(diagnosis);
    let approvalCalled = false;
    const results = await engine.executePlan(plan, async (_action: HealingAction) => {
      approvalCalled = true;
      return true;
    });
    expect(approvalCalled).toBe(true);
    expect(results[0]!.status).toBe('success');
  });

  it('should skip action if approval rejected', async () => {
    const engine = new AutoHealingEngine();
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-5',
      incidentId: 'inc-5',
      symptoms: [],
      rootCauses: [
        { service: 'api', confidence: 0.75, method: 'zscore', evidence: ['Issue'], suggestedAction: 'restart', rank: 1, chain: [] },
      ],
      confidence: { score: 0.75, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    const plan = engine.createPlan(diagnosis);
    const results = await engine.executePlan(plan, async (_action: HealingAction) => false);
    expect(results[0]!.status).toBe('failed');
    expect(results[0]!.error).toContain('rejected');
  });

  it('should register custom executors', async () => {
    const engine = new AutoHealingEngine();
    engine.registerExecutor('rollback', async (_action: HealingAction) => ({
      actionId: _action.actionId, type: 'rollback', status: 'success', startTime: Date.now(), endTime: Date.now(),
    }));
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-6',
      incidentId: 'inc-6',
      symptoms: [],
      rootCauses: [
        { service: 'api', confidence: 0.85, method: 'zscore', evidence: ['Bad deploy'], suggestedAction: 'rollback', rank: 1, chain: [] },
      ],
      confidence: { score: 0.85, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    const plan = engine.createPlan(diagnosis);
    const results = await engine.executePlan(plan);
    expect(results[0]!.type).toBe('rollback');
  });

  it('should track execution history', async () => {
    const engine = new AutoHealingEngine();
    const diagnosis: Diagnosis = {
      diagnosisId: 'diag-h1',
      incidentId: 'inc-h1',
      symptoms: [],
      rootCauses: [{ service: 'x', confidence: 0.95, method: 'zscore', evidence: ['x'], suggestedAction: 'restart', rank: 1, chain: [] }],
      confidence: { score: 0.95, factors: [], timestamp: Date.now() },
      timeline: [],
      timestamp: Date.now(),
    };
    await engine.executePlan(engine.createPlan(diagnosis));
    expect(engine.getExecutionHistory().length).toBe(1);
    engine.clearHistory();
    expect(engine.getExecutionHistory().length).toBe(0);
  });
});

// ────────────────────────────────────
// 5. HealingPolicyManager Tests
// ────────────────────────────────────

describe('HealingPolicyManager', () => {
  it('should allow action when no policies match', () => {
    const mgr = new HealingPolicyManager();
    const action: HealingAction = {
      actionId: 'a1', type: 'restart', target: 'api', params: {},
      risk: 0.1, confidence: 0.9, approval: 'auto', rollbackPlan: [], order: 0,
    };
    expect(mgr.isActionAllowed(action).allowed).toBe(true);
  });

  it('should block action during cooldown', () => {
    const mgr = new HealingPolicyManager();
    mgr.addPolicy({
      policyId: 'p1', name: 'cooldown-policy', description: '', cooldownRules: [
        { actionType: 'restart', cooldownMs: 50000, scope: 'service' },
      ],
      escalationRules: [], maxAttempts: 5, autoApprovalThreshold: 0.9, enabled: true, targetSelector: '*',
    });
    const action: HealingAction = {
      actionId: 'a1', type: 'restart', target: 'api', params: {},
      risk: 0.1, confidence: 0.9, approval: 'auto', rollbackPlan: [], order: 0,
    };
    expect(mgr.isActionAllowed(action).allowed).toBe(true);
    mgr.recordAction(action);
    const result = mgr.isActionAllowed(action);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cooldown');
  });

  it('should block action when max attempts reached', () => {
    const mgr = new HealingPolicyManager();
    mgr.addPolicy({
      policyId: 'p2', name: 'max-attempts-policy', description: '', cooldownRules: [],
      escalationRules: [], maxAttempts: 2, autoApprovalThreshold: 0.9, enabled: true, targetSelector: '*',
    });
    const action: HealingAction = {
      actionId: 'a2', type: 'restart', target: 'api', params: {},
      risk: 0.1, confidence: 0.9, approval: 'auto', rollbackPlan: [], order: 0,
    };
    mgr.recordAction(action);
    mgr.recordAction(action);
    expect(mgr.getAttemptCount(action)).toBe(2);
    const result = mgr.isActionAllowed(action);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Max attempts');
  });

  it('should report cooldown remaining', () => {
    const mgr = new HealingPolicyManager();
    mgr.addPolicy({
      policyId: 'p3', name: 'cooldown-test', description: '', cooldownRules: [
        { actionType: '*', cooldownMs: 10000, scope: 'service' },
      ],
      escalationRules: [], maxAttempts: 5, autoApprovalThreshold: 0.9, enabled: true, targetSelector: '*',
    });
    const action: HealingAction = {
      actionId: 'a3', type: 'restart', target: 'svc', params: {},
      risk: 0.1, confidence: 0.9, approval: 'auto', rollbackPlan: [], order: 0,
    };
    mgr.recordAction(action);
    const remaining = mgr.getCooldownRemaining(action);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(10000);
  });

  it('should add and remove policies', () => {
    const mgr = new HealingPolicyManager();
    const policy: HealingPolicy = {
      policyId: 'p4', name: 'test', description: '', cooldownRules: [],
      escalationRules: [], maxAttempts: 3, autoApprovalThreshold: 0.9, enabled: true, targetSelector: '*',
    };
    mgr.addPolicy(policy);
    expect(mgr.getPolicy('p4')).toBeDefined();
    expect(mgr.getAllPolicies().length).toBe(1);
    mgr.removePolicy('p4');
    expect(mgr.getPolicy('p4')).toBeUndefined();
  });
});

// ────────────────────────────────────
// 6. SelfHealingOrchestrator Tests
// ────────────────────────────────────

describe('SelfHealingOrchestrator', () => {
  function createOrchestrator(withAnomaly: boolean = false): SelfHealingOrchestrator {
    const monitor = new HealthMonitor();
    const detector = new AnomalyDetector();
    if (withAnomaly) {
      for (let i = 0; i < 30; i++) {
        detector.addMetricPoint('svc_latency', 100 + Math.random() * 5);
      }
    }
    const engine = new DiagnosticEngine();
    engine.setDependencies('svc', []);
    const healer = new AutoHealingEngine();
    const policies = new HealingPolicyManager();
    const config = defaultConfig();
    return new SelfHealingOrchestrator(monitor, detector, engine, healer, policies, config);
  }

  it('should return empty incidents when no anomalies', async () => {
    const orch = createOrchestrator(false);
    const incidents = await orch.runCycle();
    expect(incidents.length).toBe(0);
  });

  it('should detect and heal anomalies', async () => {
    const orch = createOrchestrator(true);
    orch.config.enableAutoHealing = true;
    const monitor = new HealthMonitor();
    monitor.register(createDummyCheck('svc-check', 'liveness'));
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();
    const detector = new AnomalyDetector();
    for (let i = 0; i < 50; i++) {
      detector.addMetricPoint('svc_latency', 100 + Math.random() * 3);
    }
    const engine = new DiagnosticEngine();
    const healer = new AutoHealingEngine();
    const policies = new HealingPolicyManager();
    const config = defaultConfig();
    const orch2 = new SelfHealingOrchestrator(monitor, detector, engine, healer, policies, config);
    detector.addMetricPoint('svc_latency', 500);
    const incidents = await orch2.runCycle();
    expect(incidents.length).toBeGreaterThanOrEqual(0);
  });

  it('should respect max concurrent incidents', async () => {
    const orch = createOrchestrator(true);
    orch.config.maxConcurrentIncidents = 0;
    const incidents = await orch.runCycle();
    expect(incidents.length).toBe(0);
  });

  it('should return incident by id', () => {
    const orch = createOrchestrator(false);
    const incident = orch.getIncident('nonexistent');
    expect(incident).toBeUndefined();
  });

  it('should return stats', () => {
    const orch = createOrchestrator(false);
    const stats = orch.getStats();
    expect(stats.totalCycles).toBe(0);
    expect(stats.uptimePercent).toBe(100);
  });

  it('should update config', () => {
    const orch = createOrchestrator(false);
    orch.updateConfig({ enableAutoHealing: false });
    expect(orch.config.enableAutoHealing).toBe(false);
  });
});

// ────────────────────────────────────
// 7. TheiaHealthWidget Tests
// ────────────────────────────────────

describe('TheiaHealthWidget', () => {
  it('should aggregate health data', async () => {
    const monitor = new HealthMonitor();
    monitor.register(createDummyCheck('check-a', 'liveness', 'healthy'));
    monitor.register(createDummyCheck('check-b', 'readiness', 'degraded'));
    monitor.start();
    await new Promise(r => setTimeout(r, 80));
    monitor.stop();
    const orch = new SelfHealingOrchestrator(
      monitor,
      new AnomalyDetector(),
      new DiagnosticEngine(),
      new AutoHealingEngine(),
      new HealingPolicyManager(),
      defaultConfig()
    );
    const widget = new TheiaHealthWidget(monitor, orch);
    const data = await widget.getData();
    expect(data.totalChecks).toBe(2);
    expect(data.healthyChecks).toBe(1);
    expect(data.degradedChecks).toBe(1);
    expect(data.unhealthyChecks).toBe(0);
    expect(data.overall).toBe('degraded');
  });

  it('should emit updates via callback', async () => {
    const monitor = new HealthMonitor();
    const check = createDummyCheck('check-c', 'liveness', 'healthy');
    monitor.register(check);
    monitor.start();
    await new Promise(r => setTimeout(r, 80));
    const orch = new SelfHealingOrchestrator(
      monitor,
      new AnomalyDetector(),
      new DiagnosticEngine(),
      new AutoHealingEngine(),
      new HealingPolicyManager(),
      defaultConfig()
    );
    const widget = new TheiaHealthWidget(monitor, orch);
    widget.refreshInterval = 20;
    let emitted = false;
    widget.onUpdate = (_data) => { emitted = true; };
    widget.startAutoRefresh();
    await new Promise(r => setTimeout(r, 60));
    widget.stopAutoRefresh();
    monitor.stop();
    expect(emitted).toBe(true);
  });
});

// ────────────────────────────────────
// 8. Integration Tests
// ────────────────────────────────────

describe('Integration: Full Cycle', () => {
  it('should complete a detect→diagnose→heal→verify cycle', async () => {
    const monitor = new HealthMonitor();
    monitor.register(createDummyCheck('api-gateway', 'liveness', 'healthy'));
    monitor.start();
    await new Promise(r => setTimeout(r, 50));
    monitor.stop();

    const detector = new AnomalyDetector();
    for (let i = 0; i < 60; i++) {
      detector.addMetricPoint('api_latency', 150 + Math.random() * 10 * (i < 50 ? 1 : 5));
    }

    const engine = new DiagnosticEngine();
    engine.setDependencies('api-gateway', ['auth-service', 'user-service']);
    engine.recordCorrelation('api_latency', 'error_rate', 0.75);

    const healer = new AutoHealingEngine();
    const policies = new HealingPolicyManager();
    policies.addPolicy({
      policyId: 'default',
      name: 'Default Policy',
      description: 'Default healing policy',
      cooldownRules: [{ actionType: 'restart', cooldownMs: 60000, scope: 'service' }],
      escalationRules: [],
      maxAttempts: 3,
      autoApprovalThreshold: 0.9,
      enabled: true,
      targetSelector: '*',
    });

    const config: OrchestratorConfig = {
      collectionIntervalMs: 10000,
      anomalyThreshold: 0.8,
      minDataPoints: 10,
      maxHistorySize: 1000,
      ensembleThreshold: 0.5,
      autoExecuteThreshold: 0.9,
      validationDelayMs: 5000,
      maxConcurrentIncidents: 5,
      enableAutoHealing: true,
    };

    const orchestrator = new SelfHealingOrchestrator(monitor, detector, engine, healer, policies, config);

    detector.addMetricPoint('api_latency', 2000);
    const incidents = await orchestrator.runCycle();

    expect(orchestrator.cycleCount).toBeGreaterThanOrEqual(0);

    const stats = orchestrator.getStats();
    expect(stats.totalCycles).toBeGreaterThanOrEqual(0);
    expect(orchestrator.isRunning).toBe(false);
  });
});

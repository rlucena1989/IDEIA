import { ScopeIsolation } from '@ideia/scope-isolation';
import { QualityGateSystem } from '@ideia/quality-gates';
import { DeliveryOrchestrator } from '@ideia/delivery-orchestrator';
import { DashboardService } from '@ideia/self-optimization-panel';
import { AutoAdr } from '@ideia/auto-adr';
import { TechnologyRadar } from '@ideia/technology-radar';
import { SafetyCircuit } from '@ideia/safety-circuit';

describe('Macro Fluxo - Integration Test (M1)', () => {
  let scopeIsolation: ScopeIsolation;
  let qualityGates: QualityGateSystem;

  beforeAll(() => {
    scopeIsolation = ScopeIsolation.create({ selfPath: '/tmp/self', projectPath: '/tmp/project' });
    qualityGates = new QualityGateSystem();
  });

  test('1 - Scope isolation resolves paths correctly', () => {
    const result = scopeIsolation.resolvePath('/tmp/project/src/file.ts');
    expect(result.scope).toBe('project');
    expect(result.resolved).toBe('/tmp/project/src/file.ts');
  });

  test('2 - Scope isolation blocks self-space writes from project', () => {
    expect(() => scopeIsolation.resolvePath('/tmp/self/config.json')).toThrow();
  });

  test('3 - Quality gates run full pipeline', async () => {
    const result = await qualityGates.evaluate({
      lint: { errors: 0, warnings: 5 },
      typecheck: { errors: 0 },
      test: { passed: 100, failed: 0, coverage: 82 },
    } as unknown as Parameters<typeof qualityGates.evaluate>[0]);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  test('4 - Delivery orchestrator creates deploy plan', () => {
    const orchestrator = new DeliveryOrchestrator();
    const plan = orchestrator.createPlan({ version: '1.0.0', strategy: 'canary' });
    expect(plan).toBeDefined();
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  test('5 - Dashboard service returns health data', () => {
    const dashboard = new DashboardService();
    const health = dashboard.getHealth();
    expect(health.overall).toBeGreaterThanOrEqual(0);
    expect(health.overall).toBeLessThanOrEqual(100);
    expect(['improving', 'worsening', 'stable']).toContain(health.trend);
  });

  test('6 - Auto-ADR generates ADR from decision', () => {
    const autoAdr = new AutoAdr();
    const adr = autoAdr.generateAdr({
      title: 'Use PostgreSQL for persistence',
      context: 'Need reliable data storage',
      decision: 'Adopt PostgreSQL with pgvector',
      consequences: ['Better reliability', 'Increased operational complexity'],
    });
    expect(adr).toBeDefined();
    expect(adr.title).toContain('PostgreSQL');
    expect(adr.status).toBe('proposed');
  });

  test('7 - Technology Radar provides recommendations', async () => {
    const radar = new TechnologyRadar();
    const recommendations = await radar.getRecommendations('database');
    expect(Array.isArray(recommendations)).toBe(true);
  });

  test('8 - Safety circuit detects configuration issues', () => {
    const safety = new SafetyCircuit();
    const result = safety.evaluate({ sandbox: false, auditEnabled: false });
    expect(result.issues.length).toBeGreaterThan(0);
  });

  test('9 - End-to-end: scope → quality → deploy', async () => {
    const scopeResult = scopeIsolation.resolvePath('/tmp/project/src/main.ts');
    expect(scopeResult.scope).toBe('project');

    const qualityResult = await qualityGates.evaluate({
      lint: { errors: 0, warnings: 3 },
      typecheck: { errors: 0 },
      test: { passed: 50, failed: 0, coverage: 75 },
    } as unknown as Parameters<typeof qualityGates.evaluate>[0]);

    const orchestrator = new DeliveryOrchestrator();
    const plan = orchestrator.createPlan({ version: '2.0.0', strategy: 'rolling' });

    expect(scopeResult.resolved).toBeDefined();
    expect(qualityResult.passed).toBe(true);
    expect(plan.steps).toBeDefined();
  });

  test('10 - Full lifecycle: idea → deploy', () => {
    const dashboard = new DashboardService();
    const health = dashboard.getHealth();
    const metrics = dashboard.getMetrics();

    expect(health.overall).toBeGreaterThan(0);
    expect(metrics.gapCount).toBeDefined();
    expect(metrics.testCoverage).toBeGreaterThanOrEqual(0);
  });
});

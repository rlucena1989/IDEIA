import { CostBenefitAnalyzer } from '../cost-benefit-analyzer';
import { ROICalculator } from '../roi-calculator';
import { TokenCostEstimator } from '../token-cost-estimator';
import { TimeCostEstimator } from '../time-cost-estimator';
import { AdaptiveDepthSelector } from '../adaptive-depth-selector';
import { ColdStartHandler } from '../cold-start-handler';
import { RealOptionsValuator } from '../real-options-valuator';
import { BayesianCostEstimator } from '../bayesian-cost-estimator';
import { BanditPlanSelector } from '../bandit-plan-selector';
import { Goal, PlanningContext } from '../types';

describe('CostBenefitAnalyzer', () => {
  let analyzer: CostBenefitAnalyzer;

  beforeEach(() => {
    analyzer = new CostBenefitAnalyzer();
  });

  test('executes directly for very simple tasks', async () => {
    const decision = await analyzer.evaluate(
      { description: 'Fix typo in README', complexity: 0.1, stepCount: 1, domain: 'docs' },
      {
        fileCount: 1,
        agentSkillLevel: 8,
        similarProjects: 5,
        hasExistingCode: true,
        isBugfix: true,
        isRefactor: false,
        timeEstimate: 600,
        historyLength: 200,
      },
    );
    expect(decision.decision).toBe('execute_directly');
  }, 10000);

  test('plans for complex tasks', async () => {
    const decision = await analyzer.evaluate(
      { description: 'Implement distributed cache', complexity: 0.8, stepCount: 15, domain: 'infra' },
      {
        fileCount: 50,
        agentSkillLevel: 7,
        similarProjects: 2,
        hasExistingCode: true,
        isBugfix: false,
        isRefactor: false,
        timeEstimate: 14400,
        historyLength: 200,
      },
    );
    expect(decision.decision).toBe('plan');
    expect(['shallow', 'medium', 'deep']).toContain(decision.depth);
  }, 10000);

  test('does shallow plan on cold start', async () => {
    const decision = await analyzer.evaluate(
      { description: 'New feature', complexity: 0.5, stepCount: 5, domain: 'web' },
      {
        fileCount: 10,
        agentSkillLevel: 5,
        similarProjects: 0,
        hasExistingCode: false,
        isBugfix: false,
        isRefactor: false,
        timeEstimate: 3600,
        historyLength: 3,
      },
    );
    expect(decision.decision).toBe('plan');
    expect(decision.depth).toBe('shallow');
  }, 10000);

  test('analyzeCosts returns complete report', () => {
    const report = analyzer.analyzeCosts(
      { description: 'Build API', complexity: 0.6, stepCount: 8, domain: 'api' },
      {
        fileCount: 20,
        agentSkillLevel: 6,
        similarProjects: 3,
        hasExistingCode: true,
        isBugfix: false,
        isRefactor: false,
        timeEstimate: 7200,
        historyLength: 100,
      },
    );
    expect(report.combined.direct).toBeGreaterThan(0);
    expect(report.tokenEstimate).toBeGreaterThan(0);
  });

  test('optimize returns alternatives', async () => {
    const goal: Goal = { description: 'Refactor DB', complexity: 0.7, stepCount: 10, domain: 'data' };
    const context: PlanningContext = {
      fileCount: 30,
      agentSkillLevel: 8,
      similarProjects: 5,
      hasExistingCode: true,
      isBugfix: false,
      isRefactor: true,
      timeEstimate: 10800,
      historyLength: 150,
    };
    const roi = new ROICalculator().compute(goal, context);
    const opt = await analyzer.optimize(goal, context, roi);
    expect(opt.alternatives.length).toBeGreaterThanOrEqual(3);
    expect(opt.selectedAction).toBeDefined();
  }, 10000);

  test('calibrate adjusts metrics', () => {
    analyzer.calibrate({
      goalId: 'test',
      depth: 'medium',
      predictedQuality: 0.8,
      actualQuality: 0.75,
      tokenCost: 5000,
      timestamp: Date.now(),
    });
    const metrics = analyzer.getMetrics();
    expect(metrics.totalEvaluations).toBe(0);
    expect(metrics.calibrationAccuracy).toBeGreaterThanOrEqual(0);
  });

  test('getMetrics returns valid structure', () => {
    const metrics = analyzer.getMetrics();
    expect(metrics.adaptiveThreshold).toBe(0.2);
    expect(metrics.totalEvaluations).toBe(0);
  });
});

describe('ROICalculator', () => {
  test('computes ROI correctly', () => {
    const roiCalc = new ROICalculator();
    const result = roiCalc.compute(
      { description: 'Build API', complexity: 0.6, stepCount: 8, domain: 'api' },
      {
        fileCount: 20,
        agentSkillLevel: 6,
        similarProjects: 3,
        hasExistingCode: true,
        isBugfix: false,
        isRefactor: false,
        timeEstimate: 7200,
        historyLength: 100,
      },
    );
    expect(result.roi).toBeDefined();
    expect(result.breakEvenPlans).toBeGreaterThanOrEqual(1);
    expect(['high', 'medium', 'low']).toContain(result.confidence);
  });

  test('returns scenarios', () => {
    const roiCalc = new ROICalculator();
    const result = roiCalc.compute(
      { description: 'Test', complexity: 0.5, stepCount: 5, domain: 'test' },
      {
        fileCount: 10,
        agentSkillLevel: 5,
        similarProjects: 2,
        hasExistingCode: true,
        isBugfix: false,
        isRefactor: false,
        timeEstimate: 3600,
        historyLength: 50,
      },
    );
    expect(result.alternativeScenarios.length).toBe(3);
  });

  test('handles zero plan cost edge case', () => {
    const roiCalc = new ROICalculator();
    const result = roiCalc.compute(
      { description: 'Empty', complexity: 0, stepCount: 0, domain: 'test' },
      {
        fileCount: 0,
        agentSkillLevel: 0,
        similarProjects: 0,
        hasExistingCode: false,
        isBugfix: false,
        isRefactor: false,
        timeEstimate: 0,
        historyLength: 0,
      },
    );
    expect(result.roi).toBeDefined();
  });
});

describe('TokenCostEstimator', () => {
  test('estimates tokens for different depths', () => {
    const est = new TokenCostEstimator();
    const goal: Goal = { description: 'Build feature', complexity: 0.6, stepCount: 8, domain: 'web' };
    const shallow = est.estimate(goal, 'shallow');
    const deep = est.estimate(goal, 'deep');
    expect(shallow).toBeGreaterThan(2000);
    expect(deep).toBeGreaterThan(shallow);
  });

  test('estimates context size', () => {
    const est = new TokenCostEstimator();
    const goal: Goal = { description: 'A'.repeat(100), complexity: 0.5, fileCount: 10, stepCount: 5, domain: 'web' };
    const size = est.estimateContextSize(goal);
    expect(size).toBeGreaterThan(0);
  });
});

describe('TimeCostEstimator', () => {
  test('estimates time for goal', () => {
    const est = new TimeCostEstimator();
    const goal: Goal = { description: 'Test', complexity: 0.5, stepCount: 5, domain: 'test' };
    const time = est.estimate(goal, 'medium');
    expect(time).toBeGreaterThan(2);
  });

  test('estimates memory', () => {
    const est = new TimeCostEstimator();
    const goal: Goal = { description: 'Test', complexity: 0.7, fileCount: 20, domain: 'test' };
    const mem = est.estimateMemory(goal);
    expect(mem).toBeGreaterThan(50);
  });
});

describe('AdaptiveDepthSelector', () => {
  test('selects depth based on ROI', () => {
    const sel = new AdaptiveDepthSelector();
    expect(sel.select(0.1, 0.5)).toBe('none');
    expect(sel.select(0.3, 0.5)).toBe('shallow');
    expect(sel.select(0.6, 0.5)).toBe('medium');
    expect(sel.select(1.5, 0.8)).toBe('deep');
  });

  test('calibrates threshold', () => {
    const sel = new AdaptiveDepthSelector();
    sel.calibrate(0.6);
    expect(sel.getThreshold()).toBe(0.2);
    for (let i = 0; i < 10; i++) sel.calibrate(0.6);
    expect(sel.getThreshold()).toBeGreaterThan(0.2);
  });

  test('setThreshold changes value', () => {
    const sel = new AdaptiveDepthSelector();
    sel.setThreshold(0.5);
    expect(sel.getThreshold()).toBe(0.5);
  });
});

describe('ColdStartHandler', () => {
  test('detects cold start', () => {
    const handler = new ColdStartHandler();
    expect(handler.isColdStart({ historyLength: 3 } as PlanningContext)).toBe(true);
    expect(handler.isColdStart({ historyLength: 20 } as PlanningContext)).toBe(false);
  });

  test('handles cold start', () => {
    const handler = new ColdStartHandler();
    const goal: Goal = { description: 'Test', complexity: 0.5, domain: 'test' };
    const result = handler.handle(goal, { historyLength: 0 } as PlanningContext);
    expect(result.depth).toBe('shallow');
  });

  test('estimates required samples', () => {
    const handler = new ColdStartHandler();
    const goal: Goal = { description: 'Complex', complexity: 0.8, domain: 'test' };
    const samples = handler.estimateRequiredSamples(goal);
    expect(samples).toBeGreaterThan(10);
  });
});

describe('RealOptionsValuator', () => {
  test('evaluates deferral decision', () => {
    const valuator = new RealOptionsValuator();
    const result = valuator.evaluate({ description: 'Build feature', complexity: 0.6, stepCount: 8, domain: 'web' }, 12);
    expect(result.callValue).toBeGreaterThanOrEqual(0);
    expect(result.recommendation).toMatch(/defer|execute/);
  });

  test('confidence is bounded', () => {
    const valuator = new RealOptionsValuator();
    const result = valuator.evaluate({ description: 'Simple task', complexity: 0.2, stepCount: 2, domain: 'bug' }, 6);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe('BayesianCostEstimator', () => {
  test('estimates with historical data', () => {
    const estimator = new BayesianCostEstimator();
    const goal: Goal = { description: 'Test', complexity: 0.5, stepCount: 5, domain: 'test' };
    const result = estimator.estimate(goal, [4000, 4500, 5000, 4800, 5200]);
    expect(result.posterior.mean).toBeGreaterThan(0);
    expect(result.mcEstimate.mean).toBeGreaterThan(0);
    expect(result.samplesUsed).toBe(5);
  });

  test('handles empty historical data', () => {
    const estimator = new BayesianCostEstimator();
    const goal: Goal = { description: 'Test', complexity: 0.5, stepCount: 5, domain: 'test' };
    const result = estimator.estimate(goal, []);
    expect(result.samplesUsed).toBe(0);
  });
});

describe('BanditPlanSelector', () => {
  test('registers and selects strategies', () => {
    const bandit = new BanditPlanSelector();
    bandit.registerStrategy('top-down');
    bandit.registerStrategy('bottom-up');
    const goal: Goal = { description: 'Test', complexity: 0.5, domain: 'test' };
    const selected = bandit.select(goal);
    expect(['top-down', 'bottom-up']).toContain(selected);
  });

  test('observes rewards and updates stats', () => {
    const bandit = new BanditPlanSelector();
    bandit.registerStrategy('strategy-a');
    bandit.registerStrategy('strategy-b');
    bandit.observe('strategy-a', 0.8);
    bandit.observe('strategy-a', 0.9);
    bandit.observe('strategy-b', 0.5);
    const best = bandit.getBestStrategy();
    expect(best?.name).toBe('strategy-a');
  });

  test('tracks regret', () => {
    const bandit = new BanditPlanSelector();
    bandit.registerStrategy('a');
    bandit.registerStrategy('b');
    bandit.observe('a', 1.0);
    bandit.observe('b', 0.5);
    expect(bandit.getRegret()).toBeGreaterThanOrEqual(0);
  });

  test('returns arm stats', () => {
    const bandit = new BanditPlanSelector();
    bandit.registerStrategy('test');
    bandit.observe('test', 1.0);
    const stats = bandit.getArmStats();
    expect(stats.length).toBe(1);
    expect(stats[0].plays).toBe(1);
  });
});

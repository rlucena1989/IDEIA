import { ExperimentDesigner, SampleSizeCalculator, PowerAnalyzer } from '../designer';
import type { Subject, ExperimentConfig, ExperimentPlan } from '../types';

describe('SampleSizeCalculator', () => {
  test('should compute required sample size', () => {
    const c = new SampleSizeCalculator();
    const r = c.calculate(0.5, 0.05, 0.80);
    expect(r.nPerGroup).toBeGreaterThan(10);
    expect(r.totalN).toBe(r.nPerGroup * 2);
    expect(r.method).toBe('analytic');
  });

  test('should require larger n for smaller effect', () => {
    const c = new SampleSizeCalculator();
    const r1 = c.calculate(0.8, 0.05, 0.80);
    const r2 = c.calculate(0.2, 0.05, 0.80);
    expect(r2.nPerGroup).toBeGreaterThan(r1.nPerGroup);
  });

  test('should throw for invalid parameters', () => {
    const c = new SampleSizeCalculator();
    expect(() => c.calculate(0, 0.05, 0.80)).toThrow();
    expect(() => c.calculate(0.5, 0, 0.80)).toThrow();
  });
});

describe('PowerAnalyzer', () => {
  test('should compute power correctly', () => {
    const p = new PowerAnalyzer();
    const r = p.computePower(100, 0.5, 0.05);
    expect(r.achievedPower).toBeGreaterThan(0.5);
    expect(r.nPerGroup).toBe(100);
  });

  test('should find required N for target power', () => {
    const p = new PowerAnalyzer();
    const n = p.requiredN(0.3, 0.05, 0.80);
    expect(n).toBeGreaterThan(50);
  });
});

describe('ExperimentDesigner', () => {
  let designer: ExperimentDesigner;
  let subjects: Subject[];

  beforeEach(() => {
    designer = new ExperimentDesigner();
    subjects = Array.from({ length: 50 }, (_, i) => ({
      id: 's' + i, features: { x: Math.random(), age: 20 + Math.random() * 40 }, status: 'pending' as const,
    }));
  });

  test('should create experiment plan with simple strategy', () => {
    const plan = designer.design(subjects, {
      strategy: 'simple', alpha: 0.05, power: 0.80, effectSize: 0.5, twoTailed: true,
    });
    expect(plan.assignment.control.length).toBeGreaterThan(0);
    expect(plan.sampleSize.nPerGroup).toBeGreaterThan(0);
    expect(plan.power.achievedPower).toBeGreaterThan(0);
    expect(plan.assignment.strategy).toBe('simple');
  });

  test('should split subjects evenly with simple strategy', () => {
    const plan = designer.design(subjects, {
      strategy: 'simple', alpha: 0.05, power: 0.80, effectSize: 0.5, twoTailed: true,
    });
    expect(Math.abs(plan.assignment.control.length - plan.assignment.treatment.length)).toBeLessThanOrEqual(1);
  });

  test('should be deterministic with same seed', () => {
    const config: ExperimentConfig = {
      strategy: 'simple', alpha: 0.05, power: 0.80, effectSize: 0.5, twoTailed: true, seed: 42,
    };
    const plan1 = designer.design(subjects, config);
    const plan2 = designer.design([...subjects], config);
    expect(plan1.assignment.control.map(s => s.id)).toEqual(plan2.assignment.control.map(s => s.id));
  });

  test('should handle blocked strategy', () => {
    const blockedSubjects: Subject[] = [];
    for (let b = 0; b < 3; b++) {
      for (let i = 0; i < 10; i++) {
        const blockLetter = String.fromCharCode(65 + b);
        blockedSubjects.push({ id: b + '-' + i, features: { block: blockLetter }, block: blockLetter, status: 'pending' as const });
      }
    }
    const plan = designer.design(blockedSubjects, {
      strategy: 'blocked', alpha: 0.05, power: 0.80, effectSize: 0.5, twoTailed: true, blockSize: 4,
    });
    expect(plan.assignment.control.length + plan.assignment.treatment.length).toBe(30);
  });

  test('should handle stratified strategy', () => {
    const stratifiedSubjects: Subject[] = [];
    for (let i = 0; i < 60; i++) {
      stratifiedSubjects.push({ id: 's' + i, features: { type: i < 30 ? 'bug' : 'feature', complexity: 'medium' }, status: 'pending' as const });
    }
    const plan = designer.design(stratifiedSubjects, {
      strategy: 'stratified', alpha: 0.05, power: 0.80, effectSize: 0.5, twoTailed: true, strataKeys: ['type'],
    });
    expect(plan.assignment.strategy).toBe('stratified');
  });

  test('should handle adaptive strategy', () => {
    const plan = designer.design(subjects, {
      strategy: 'adaptive', alpha: 0.05, power: 0.80, effectSize: 0.5, twoTailed: true, adaptiveUpdateInterval: 10,
    });
    expect(plan.assignment.strategy).toBe('adaptive');
    expect(plan.trialHistory).toBeDefined();
  });

  test('should suggest appropriate strategy', () => {
    const small: Subject[] = Array.from({ length: 10 }, (_, i) => ({ id: 's' + i, features: { x: 1 }, status: 'pending' as const }));
    expect(designer.suggestStrategy(small)).toBe('simple');
    const large: Subject[] = Array.from({ length: 50 }, (_, i) => ({ id: 's' + i, features: { x: 1, y: 2, z: 3 }, status: 'pending' as const }));
    expect(designer.suggestStrategy(large)).toBe('stratified');
  });

  test('should list available strategies', () => {
    const strategies = designer.getStrategies();
    expect(strategies.length).toBe(4);
    expect(strategies.map((s: { name: string }) => s.name)).toContain('simple');
    expect(strategies.map((s: { name: string }) => s.name)).toContain('adaptive');
  });
});

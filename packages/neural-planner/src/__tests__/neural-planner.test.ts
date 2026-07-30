import { NeuralTaskDecomposer } from '../neural-task-decomposer';
import { TreeOfThoughtPlanner } from '../tree-of-thought-planner';
import { DeepRLDecomposer } from '../deep-rl-decomposer';
import { HierarchicalOptionDecomposer } from '../hierarchical-option-decomposer';
import { CausalRewardShaper } from '../causal-reward-shaper';
import { LoRAFineTuner } from '../lora-fine-tuner';
import { Goal, PlanningContext } from '../types';

describe('NeuralTaskDecomposer', () => {
  let decomposer: NeuralTaskDecomposer;

  beforeEach(() => { decomposer = new NeuralTaskDecomposer(); });

  test('decomposes goal into steps', async () => {
    const goal: Goal = { description: 'Build a REST API', complexity: 0.7, domain: 'web' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 20, agentSkillLevel: 7, similarProjects: 3, timeEstimate: 7200, historyLength: 50 };
    const steps = await decomposer.decompose(goal, context);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].id).toBeDefined();
    expect(steps[0].estimatedTokens).toBeGreaterThan(0);
  });

  test('fineTune adds examples', async () => {
    const goal: Goal = { description: 'Test', complexity: 0.5, domain: 'test' };
    const context: PlanningContext = { hasExistingCode: false, fileCount: 0, agentSkillLevel: 5, similarProjects: 0, timeEstimate: 3600, historyLength: 0 };
    await decomposer.fineTune([{ goal, context, steps: [{ id: 's1', description: 'step1', filesAffected: [], estimatedTokens: 100, dependencies: [], acceptanceCriteria: [] }] }]);
    expect(decomposer.getExampleCount()).toBe(1);
  });

  test('handles simple goals', async () => {
    const goal: Goal = { description: 'Fix typo', complexity: 0.1, domain: 'docs' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 1, agentSkillLevel: 8, similarProjects: 5, timeEstimate: 600, historyLength: 200 };
    const steps = await decomposer.decompose(goal, context);
    expect(steps.length).toBe(1);
  });

  test('handles complex goals', async () => {
    const goal: Goal = { description: 'Implement distributed cache system', complexity: 0.9, domain: 'infra' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 50, agentSkillLevel: 9, similarProjects: 2, timeEstimate: 14400, historyLength: 200 };
    const steps = await decomposer.decompose(goal, context);
    expect(steps.length).toBeGreaterThan(1);
  });

  test('empty example count starts at 0', () => {
    expect(decomposer.getExampleCount()).toBe(0);
  });
});

describe('TreeOfThoughtPlanner', () => {
  test('decomposes with multiple branches', async () => {
    const planner = new TreeOfThoughtPlanner();
    const goal: Goal = { description: 'Build microservice', complexity: 0.8, domain: 'backend' };
    const steps = await planner.decompose(goal, 3, 3);
    expect(steps.length).toBeGreaterThan(0);
  });

  test('merges paths with close scores', async () => {
    const planner = new TreeOfThoughtPlanner();
    const goal: Goal = { description: 'Simple task', complexity: 0.3, domain: 'test' };
    const steps = await planner.decompose(goal, 2, 2);
    expect(steps.length).toBeGreaterThan(0);
  });

  test('handles single branch', async () => {
    const planner = new TreeOfThoughtPlanner();
    const goal: Goal = { description: 'Test', complexity: 0.5, domain: 'test' };
    const steps = await planner.decompose(goal, 1, 2);
    expect(steps.length).toBeGreaterThan(0);
  });

  test('steps have acceptance criteria', async () => {
    const planner = new TreeOfThoughtPlanner();
    const goal: Goal = { description: 'Build feature', complexity: 0.6, domain: 'web' };
    const steps = await planner.decompose(goal, 2, 2);
    for (const step of steps) {
      expect(step.acceptanceCriteria.length).toBeGreaterThan(0);
    }
  });
});

describe('DeepRLDecomposer', () => {
  test('selects strategy', async () => {
    const rl = new DeepRLDecomposer();
    const goal: Goal = { description: 'Refactor database layer', complexity: 0.7, domain: 'data' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 30, agentSkillLevel: 8, similarProjects: 5, timeEstimate: 10800, historyLength: 150 };
    const action = await rl.selectStrategy(goal, context);
    expect(action.strategy).toBeDefined();
    expect(action.granularity).toBeDefined();
    expect(action.temperature).toBeGreaterThanOrEqual(0.1);
  });

  test('update does not throw with empty experiences', async () => {
    const rl = new DeepRLDecomposer();
    await rl.update([]);
  });

  test('handles various complexity levels', async () => {
    const rl = new DeepRLDecomposer();
    const goal: Goal = { description: 'Simple fix', complexity: 0.2, domain: 'bug' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 2, agentSkillLevel: 5, similarProjects: 0, timeEstimate: 1800, historyLength: 10 };
    const action = await rl.selectStrategy(goal, context);
    expect(['top-down', 'bottom-up', 'hybrid', 'example-based', 'agile', 'waterfall']).toContain(action.strategy);
  });
});

describe('HierarchicalOptionDecomposer', () => {
  test('decomposes into steps', async () => {
    const h = new HierarchicalOptionDecomposer();
    const goal: Goal = { description: 'Build feature', complexity: 0.7, domain: 'web' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 10, agentSkillLevel: 6, similarProjects: 2, timeEstimate: 7200, historyLength: 30 };
    const steps = await h.decompose(goal, context);
    expect(steps.length).toBeGreaterThan(0);
  });

  test('creates options', async () => {
    const h = new HierarchicalOptionDecomposer();
    const goal: Goal = { description: 'Test', complexity: 0.5, domain: 'test' };
    const context: PlanningContext = { hasExistingCode: false, fileCount: 0, agentSkillLevel: 5, similarProjects: 0, timeEstimate: 3600, historyLength: 0 };
    await h.decompose(goal, context);
    expect(h.getOptionCount()).toBeGreaterThan(0);
  });

  test('simple goal produces fewer options', async () => {
    const h = new HierarchicalOptionDecomposer();
    const goal: Goal = { description: 'Tiny fix', complexity: 0.1, domain: 'bug' };
    const context: PlanningContext = { hasExistingCode: true, fileCount: 1, agentSkillLevel: 5, similarProjects: 0, timeEstimate: 600, historyLength: 5 };
    await h.decompose(goal, context);
    expect(h.getOptionCount()).toBeGreaterThanOrEqual(1);
  });
});

describe('CausalRewardShaper', () => {
  test('computes reward correctly', () => {
    const shaper = new CausalRewardShaper();
    const reward = shaper.compute({
      completedSteps: 8, totalSteps: 10, estimatedTokens: 5000,
      actualTokens: 4500, replanCount: 1, qualityScore: 0.85,
      wallTimeMs: 60000, estimatedTimeMs: 55000,
    });
    expect(reward).toBeGreaterThan(0);
    expect(reward).toBeLessThanOrEqual(1);
  });

  test('shapes intermediate reward', () => {
    const shaper = new CausalRewardShaper();
    const shaped = shaper.shape(0.5, 0.8);
    expect(shaped).toBeGreaterThan(0.5);
  });

  test('applies completion bonus', () => {
    const shaper = new CausalRewardShaper();
    const shaped = shaper.shape(0.5, 1.0);
    expect(shaped).toBeGreaterThan(0.6);
  });

  test('handles zero total steps', () => {
    const shaper = new CausalRewardShaper();
    const reward = shaper.compute({
      completedSteps: 0, totalSteps: 0, estimatedTokens: 0,
      actualTokens: 0, replanCount: 0, qualityScore: 0,
      wallTimeMs: 0, estimatedTimeMs: 0,
    });
    expect(reward).toBeGreaterThanOrEqual(-1);
  });
});

describe('LoRAFineTuner', () => {
  test('requires training data', async () => {
    const tuner = new LoRAFineTuner({ baseModel: 'test', rank: 8, alpha: 16 });
    await expect(tuner.train([], { epochs: 1, batchSize: 4, learningRate: 1e-4, validationSplit: 0.1 })).rejects.toThrow();
  });

  test('trains with data', async () => {
    const tuner = new LoRAFineTuner({ baseModel: 'test', rank: 8, alpha: 16 });
    await tuner.train([{ input: 'test', output: 'result' }], { epochs: 1, batchSize: 4, learningRate: 1e-4, validationSplit: 0.1 });
    expect(tuner.isTrained()).toBe(true);
  });

  test('generates adapted output after training', async () => {
    const tuner = new LoRAFineTuner({ baseModel: 'test-model', rank: 8, alpha: 16 });
    await tuner.train([{ input: 'hello', output: 'world' }], { epochs: 1, batchSize: 4, learningRate: 1e-4, validationSplit: 0.1 });
    const result = await tuner.generate('hello');
    expect(result).toContain('test-model');
  });

  test('returns rank and alpha', () => {
    const tuner = new LoRAFineTuner({ baseModel: 'test', rank: 16, alpha: 32 });
    expect(tuner.getRank()).toBe(16);
    expect(tuner.getAlpha()).toBe(32);
  });
});

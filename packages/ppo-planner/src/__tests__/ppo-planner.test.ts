import { PPOTrainer } from '../ppo-trainer';
import { GAECalculator } from '../gae-calculator';
import { ClippedSurrogateObjective } from '../clipped-surrogate-objective';
import { StateEncoder } from '../state-encoder';
import { RewardShaper } from '../reward-shaper';
import { PolicyNetwork } from '../policy-network';
import { ValueNetwork } from '../value-network';
import { PlanExecution, PlanningAction, PlanningEnv } from '../types';

class MockPlanningEnv implements PlanningEnv {
  private _stepCount = 0;
  private _maxSteps: number;

  constructor(maxSteps = 10) { this._maxSteps = maxSteps; }

  reset(): Float32Array {
    this._stepCount = 0;
    return new Float32Array(138);
  }

  step(_action: PlanningAction): { nextState: Float32Array; reward: number; done: boolean } {
    this._stepCount++;
    const reward = 0.5 + Math.random() * 0.4;
    return { nextState: new Float32Array(138), reward, done: this._stepCount >= this._maxSteps };
  }

  getProgress(): number { return this._stepCount / this._maxSteps; }
  isDone(): boolean { return this._stepCount >= this._maxSteps; }
  getMetrics(): PlanExecution {
    return { completedSteps: this._stepCount, totalSteps: this._maxSteps, estimatedTokens: 5000, actualTokens: 4500, replanCount: 0, qualityScore: 0.8, wallTimeMs: 1000, estimatedTimeMs: 900 };
  }
}

describe('PPOTrainer', () => {
  test('creates instance', () => {
    const trainer = new PPOTrainer();
    expect(trainer).toBeDefined();
  });

  test('selects action', async () => {
    const trainer = new PPOTrainer();
    const result = await trainer.selectAction(new Float32Array(138));
    expect(result.action).toBeGreaterThanOrEqual(0);
    expect(result.logProb).toBeDefined();
  });

  test('trains on mock environment', async () => {
    const trainer = new PPOTrainer();
    const env = new MockPlanningEnv(5);
    const metrics = await trainer.train([env], 100, 10);
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('update returns losses', async () => {
    const trainer = new PPOTrainer();
    const env = new MockPlanningEnv(3);
    await trainer.train([env], 1, 10);
    const losses = await trainer['update']();
    expect(losses).toBeDefined();
    expect(typeof losses.policyLoss).toBe('number');
  });

  test('getPolicy returns policy network', () => {
    const trainer = new PPOTrainer();
    expect(trainer.getPolicy()).toBeInstanceOf(PolicyNetwork);
  });
});

describe('GAECalculator', () => {
  test('computes GAE advantages', () => {
    const gae = new GAECalculator();
    const rewards = [1, 1, 1, 1, 1];
    const values = new Float32Array([0.5, 0.6, 0.7, 0.8, 0.9]);
    const advantages = gae.computeGAE(rewards, values, 1.0);
    expect(advantages.length).toBe(5);
    expect(advantages[0]).toBeDefined();
  });

  test('computes returns', () => {
    const gae = new GAECalculator();
    const returns = gae.computeReturns([1, 1, 1]);
    expect(returns.length).toBe(3);
    expect(returns[0]).toBeGreaterThan(0);
  });
});

describe('ClippedSurrogateObjective', () => {
  test('computes loss values', async () => {
    const obj = new ClippedSurrogateObjective();
    const policy = new PolicyNetwork();
    const valueNet = new ValueNetwork();
    const state = new Float32Array(138);
    const action: PlanningAction = { strategy: 'hybrid', granularity: 'medium', temperature: 0.5 };
    const result = await obj.compute([state, state], [action, action], new Float32Array([0.5, 0.5]), [1, 1], policy, valueNet);
    expect(result.policyLoss).toBeDefined();
    expect(result.valueLoss).toBeGreaterThanOrEqual(0);
    expect(typeof result.entropy).toBe('number');
  });
});

describe('StateEncoder', () => {
  test('encodes state with correct dimensions', () => {
    const encoder = new StateEncoder();
    const state = encoder.encode('Build a REST API', { complexity: 0.7, fileCount: 20, agentSkillLevel: 7, similarProjects: 3, timeEstimate: 7200, hasExistingCode: 1, isBugfix: 0, isRefactor: 0, historyLength: 50, stepCount: 8 });
    expect(state.length).toBe(138);
  });

  test('normalizes all features to [0,1]', () => {
    const encoder = new StateEncoder();
    const state = encoder.encode('Test', { complexity: 0.5, fileCount: 500, agentSkillLevel: 5, similarProjects: 25, timeEstimate: 18000, hasExistingCode: 1, isBugfix: 0, isRefactor: 1, historyLength: 250, stepCount: 25 });
    for (let i = 128; i < 138; i++) {
      expect(state[i]).toBeGreaterThanOrEqual(0);
      expect(state[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('RewardShaper', () => {
  test('computes reward from execution', () => {
    const shaper = new RewardShaper();
    const reward = shaper.compute({
      completedSteps: 9, totalSteps: 10, estimatedTokens: 5000,
      actualTokens: 4800, replanCount: 1, qualityScore: 0.85,
      wallTimeMs: 60000, estimatedTimeMs: 55000,
    });
    expect(reward).toBeGreaterThanOrEqual(-1);
    expect(reward).toBeLessThanOrEqual(1);
  });

  test('shapes reward with progress bonus', () => {
    const shaper = new RewardShaper();
    const r1 = shaper.shape(0.5, 0.3);
    const r2 = shaper.shape(0.5, 0.8);
    expect(r2).toBeGreaterThan(r1);
  });

  test('applies completion bonus', () => {
    const shaper = new RewardShaper();
    const shaped = shaper.shape(0.5, 1.0);
    expect(shaped).toBeGreaterThan(0.5);
  });
});

describe('PolicyNetwork', () => {
  test('forward returns mean and logStd', () => {
    const policy = new PolicyNetwork();
    const output = policy.forward(new Float32Array(138));
    expect(output.mean.length).toBe(3);
    expect(output.logStd.length).toBe(3);
  });

  test('getAction returns valid action', () => {
    const policy = new PolicyNetwork();
    const result = policy.getAction(new Float32Array(138));
    expect(result.action).toBeGreaterThanOrEqual(0);
    expect(result.action).toBeLessThan(6);
  });

  test('decodeAction returns planning action', () => {
    const policy = new PolicyNetwork();
    const action = policy.decodeAction(0);
    expect(action.strategy).toBeDefined();
    expect(action.granularity).toMatch(/coarse|medium|fine/);
    expect(action.temperature).toBeGreaterThanOrEqual(0.1);
  });
});

describe('ValueNetwork', () => {
  test('forward returns scalar', () => {
    const vn = new ValueNetwork();
    const value = vn.forward(new Float32Array(138));
    expect(typeof value).toBe('number');
  });

  test('evaluate returns array', () => {
    const vn = new ValueNetwork();
    const values = vn.evaluate([new Float32Array(138), new Float32Array(138)]);
    expect(values.length).toBe(2);
    expect(values[0]).toBeDefined();
  });
});

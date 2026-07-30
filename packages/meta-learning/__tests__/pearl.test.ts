import { PEARL, LatentContextImpl } from '../src';
import { LatentContext, Transition, Trajectory } from '../src';

function makeTransition(stateDim: number): Transition {
  return {
    state: new Float32Array(stateDim).fill(0.1),
    action: Math.floor(Math.random() * 6),
    reward: Math.random(),
    nextState: new Float32Array(stateDim).fill(0.2),
    done: Math.random() > 0.8,
  };
}

function makeTrajectory(stateDim: number, length: number): Trajectory {
  return {
    states: Array.from({ length }, () => new Float32Array(stateDim).fill(0.1)),
    actions: Array.from({ length }, () => Math.floor(Math.random() * 6)),
    rewards: Array.from({ length }, () => Math.random()),
    nextStates: Array.from({ length }, () => new Float32Array(stateDim).fill(0.2)),
    dones: Array.from({ length }, () => Math.random() > 0.8),
  };
}

describe('LatentContextImpl', () => {
  it('should sample from latent distribution', () => {
    const mean = new Float32Array([0.5, -0.3]);
    const logVar = new Float32Array([-1, -2]);
    const ctx = new LatentContextImpl(mean, logVar);
    const sample = ctx.sample();
    expect(sample.length).toBe(2);
  });

  it('should return correct mean', () => {
    const mean = new Float32Array([0.5, -0.3]);
    const logVar = new Float32Array([-1, -2]);
    const ctx = new LatentContextImpl(mean, logVar);
    expect(ctx.mean[0]).toBeCloseTo(0.5, 5);
    expect(ctx.mean[1]).toBeCloseTo(-0.3, 5);
  });
});

describe('PEARL', () => {
  it('should infer context from trajectories', () => {
    const pearl = new PEARL({ stateDim: 16, latentDim: 4, hiddenDim: 8 });
    const traj = makeTrajectory(16, 3);
    const ctx = pearl.inferContext([traj]);
    expect(ctx.mean.length).toBe(4);
    expect(ctx.logVar.length).toBe(4);
  });

  it('should return zero context for empty trajectories', () => {
    const pearl = new PEARL({ stateDim: 16, latentDim: 4, hiddenDim: 8 });
    const ctx = pearl.inferContext([]);
    expect(Array.from(ctx.mean).every(v => v === 0)).toBe(true);
  });

  it('should select action given state and context', () => {
    const pearl = new PEARL({ stateDim: 16, latentDim: 4, hiddenDim: 8, actionDim: 3 });
    const state = new Float32Array(16).fill(0.1);
    const ctx = new LatentContextImpl(
      new Float32Array(4).fill(0),
      new Float32Array(4).fill(-1),
    );
    const action = pearl.act(state, ctx);
    expect(action).toBeGreaterThanOrEqual(0);
    expect(action).toBeLessThan(3);
  });

  it('should return zero losses when replay is below batch size', () => {
    const pearl = new PEARL({ stateDim: 8, latentDim: 2, hiddenDim: 4, batchSize: 64 });
    const transitions = [makeTransition(8)];
    const losses = pearl.update(transitions);
    expect(losses.actorLoss).toBe(0);
    expect(losses.criticLoss).toBe(0);
    expect(losses.encoderLoss).toBe(0);
  });

  it('should compute losses for a batch of transitions', () => {
    const pearl = new PEARL({ stateDim: 8, latentDim: 2, hiddenDim: 4, batchSize: 3 });
    const transitions = Array.from({ length: 3 }, () => makeTransition(8));
    const losses = pearl.update(transitions);
    expect(losses.actorLoss).toBeGreaterThanOrEqual(0);
    expect(losses.encoderLoss).toBeGreaterThanOrEqual(0);
  });

  it('should return a policy for inference', () => {
    const pearl = new PEARL({ stateDim: 8, latentDim: 2, hiddenDim: 4, actionDim: 3 });
    const policy = pearl.getPolicy();
    const state = new Float32Array(8).fill(0.1);
    const probs = policy.forward(state);
    const sum = Array.from(probs).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-5);
  });
});

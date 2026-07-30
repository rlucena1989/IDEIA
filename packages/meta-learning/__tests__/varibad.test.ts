import { VariBAD, BeliefStateImpl } from '../src';
import { BeliefState, Trajectory } from '../src';

function makeTrajectory(stateDim: number, length: number): Trajectory {
  return {
    states: Array.from({ length }, () => {
      const s = new Float32Array(stateDim);
      for (let i = 0; i < stateDim; i++) s[i] = Math.random();
      return s;
    }),
    actions: Array.from({ length }, () => Math.floor(Math.random() * 6)),
    rewards: Array.from({ length }, () => Math.random()),
    nextStates: Array.from({ length }, () => {
      const s = new Float32Array(stateDim);
      for (let i = 0; i < stateDim; i++) s[i] = Math.random();
      return s;
    }),
    dones: Array.from({ length }, () => Math.random() > 0.8),
  };
}

describe('BeliefStateImpl', () => {
  it('should encode and sample from belief distribution', () => {
    const mean = new Float32Array([0.2, -0.1, 0.5]);
    const logVar = new Float32Array([-2, -1.5, -0.5]);
    const belief = new BeliefStateImpl(mean, logVar);
    const sample = belief.sample();
    expect(sample.length).toBe(3);
  });

  it('should compute KL divergence', () => {
    const mean = new Float32Array([0.2, -0.1]);
    const logVar = new Float32Array([-2, -1.5]);
    const belief = new BeliefStateImpl(mean, logVar);
    const kl = belief.klDivergence();
    expect(kl).toBeGreaterThan(0);
  });

  it('should return zero KL for unit Gaussian', () => {
    const mean = new Float32Array([0, 0]);
    const logVar = new Float32Array([0, 0]);
    const belief = new BeliefStateImpl(mean, logVar);
    const kl = belief.klDivergence();
    expect(Math.abs(kl)).toBeLessThan(1e-5);
  });
});

describe('VariBAD', () => {
  it('should encode belief from a trajectory', () => {
    const varibad = new VariBAD({ stateDim: 8, latentDim: 4, hiddenDim: 8 });
    const traj = makeTrajectory(8, 3);
    const belief = varibad.encodeBelief(traj);
    expect(belief.mean.length).toBe(4);
    expect(belief.logVar.length).toBe(4);
  });

  it('should return zero belief for empty trajectory', () => {
    const varibad = new VariBAD({ stateDim: 8, latentDim: 4, hiddenDim: 8 });
    const traj = makeTrajectory(8, 0);
    const belief = varibad.encodeBelief(traj);
    expect(Array.from(belief.mean).every(v => v === 0)).toBe(true);
  });

  it('should plan action sequence given belief', () => {
    const varibad = new VariBAD({ stateDim: 8, latentDim: 4, hiddenDim: 8, actionDim: 3 });
    const traj = makeTrajectory(8, 2);
    const belief = varibad.encodeBelief(traj);
    const actions = varibad.plan(belief, 5);
    expect(actions.length).toBe(5);
    for (const actionProbs of actions) {
      const sum = Array.from(actionProbs).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-5);
    }
  });

  it('should update with trajectories and return losses', () => {
    const varibad = new VariBAD({
      stateDim: 8, latentDim: 4, hiddenDim: 8, actionDim: 3,
      encoderHidden: [16, 8], decoderHidden: [8, 8], plannerHidden: [8, 4],
    });
    const traj = makeTrajectory(8, 3);
    const losses = varibad.update([traj]);
    expect(losses.encoderLoss).toBeGreaterThanOrEqual(0);
    expect(losses.decoderLoss).toBeGreaterThanOrEqual(0);
    expect(losses.plannerLoss).toBeGreaterThanOrEqual(0);
  });

  it('should return VAE parameters', () => {
    const varibad = new VariBAD({ stateDim: 8, latentDim: 4, hiddenDim: 8 });
    const params = varibad.getVAEParams();
    expect(params.encoderWeights.length).toBeGreaterThan(0);
    expect(params.decoderWeights.length).toBeGreaterThan(0);
    expect(params.latentDim).toBe(4);
  });
});

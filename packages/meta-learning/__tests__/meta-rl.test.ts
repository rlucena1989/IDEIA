import { MetaRL, RNNPolicy } from '../src';
import { Episode } from '../src';

function makeEpisode(steps: number, totalReward: number): Episode {
  const states: Float32Array[] = [];
  const actions: number[] = [];
  const rewards: number[] = [];
  const dones: boolean[] = [];
  for (let i = 0; i < steps; i++) {
    states.push(new Float32Array(140).fill(0.1));
    actions.push(Math.floor(Math.random() * 6));
    rewards.push(totalReward / steps);
    dones.push(i === steps - 1);
  }
  return { states, actions, rewards, dones, totalReward };
}

describe('RNNPolicy', () => {
  it('should forward pass produce output of correct dimension', () => {
    const policy = new RNNPolicy(4, 8, 3);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const output = policy.forward(input);
    expect(output.length).toBe(3);
  });

  it('should produce probabilities that sum to 1', () => {
    const policy = new RNNPolicy(4, 8, 3);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const output = policy.forward(input);
    const sum = Array.from(output).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-5);
  });

  it('should save and load parameters', () => {
    const policy = new RNNPolicy(4, 8, 3);
    const snap = policy.save();
    const policy2 = new RNNPolicy(4, 8, 3);
    policy2.load(snap);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const out1 = policy.forward(input);
    const out2 = policy2.forward(input);
    expect(Array.from(out1)).toEqual(Array.from(out2));
  });

  it('should change parameters after backward', () => {
    const policy = new RNNPolicy(4, 8, 3);
    const paramsBefore = policy.parameters.map(w => new Float32Array(w));
    policy.backward(0.5, 0.01);
    const paramsAfter = policy.parameters;
    let changed = false;
    for (let i = 0; i < paramsBefore.length; i++) {
      for (let j = 0; j < paramsBefore[i].length; j++) {
        if (paramsBefore[i][j] !== paramsAfter[i][j]) changed = true;
      }
    }
    expect(changed).toBe(true);
  });
});

describe('MetaRL', () => {
  it('should adapt policy to a task using episodes', () => {
    const metaRL = new MetaRL({ inputDim: 140, hiddenDim: 16, actionDim: 6, epochs: 1 });
    const episode = makeEpisode(5, 10);
    const taskPolicy = metaRL.adapt([episode], 1);
    const input = new Float32Array(140).fill(0.1);
    const output = taskPolicy.forward(input);
    expect(output.length).toBe(6);
  });

  it('should evaluate a policy on episodes and return reward', () => {
    const metaRL = new MetaRL({ inputDim: 140, hiddenDim: 16, actionDim: 6, epochs: 1 });
    const episode = makeEpisode(3, 5);
    const policy = {
      parameters: [new Float32Array(10)],
      forward: () => new Float32Array([0.2, 0.2, 0.2, 0.2, 0.1, 0.1]),
    };
    const reward = metaRL.evaluate([episode], policy);
    expect(reward.value).toBeGreaterThanOrEqual(0);
    expect(reward.discount).toBe(0.99);
  });

  it('should train on task groups and return meta-policy', () => {
    const metaRL = new MetaRL({ inputDim: 16, hiddenDim: 8, actionDim: 3, epochs: 1 });
    const ep1 = makeEpisode(3, 5);
    const ep2 = makeEpisode(3, 8);
    const ep3 = makeEpisode(3, 3);
    const metaPolicy = metaRL.metaTrain([[ep1, ep2], [ep3]], 2);
    expect(metaPolicy.parameters.length).toBeGreaterThan(0);
  });

  it('should compute baseline correctly', () => {
    const metaRL = new MetaRL();
    const episode = makeEpisode(5, 10);
    const policy = {
      parameters: [new Float32Array(10)],
      forward: () => new Float32Array(6).fill(1 / 6),
    };
    const reward = metaRL.evaluate([episode], policy);
    expect(reward.value).toBeGreaterThan(0);
  });
});

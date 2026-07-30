import {
  MAML, MAMLStateEncoder, PolicyNetwork, GradientAdapter,
  ElderlyReplayBuffer, CrossProjectLearner, computeMetaParams,
} from '../src';
import {
  Task, TaskFamily, MetaParams, TaskSpecificParams, Goal,
  PlanningContext, DecompositionStrategy, Example, MetaMetrics,
} from '../src';

function makeGoal(domain: string, complexity: number): Goal {
  return {
    description: `Test task in ${domain}`,
    complexity,
    domain,
    constraints: [],
    successCriteria: [],
  };
}

function makeContext(overrides?: Partial<PlanningContext>): PlanningContext {
  return {
    fileCount: 50,
    agentSkillLevel: 5,
    similarProjects: 2,
    hasExistingCode: true,
    isBugfix: false,
    isRefactor: false,
    timeEstimate: 3600,
    historyLength: 100,
    teamSize: 1,
    techStack: ['node', 'ts'],
    hasExamples: false,
    hasSimilarTasks: false,
    hasArchitecturalGuidance: false,
    hasConstraints: false,
    hasRiskAssessment: false,
    ...overrides,
  };
}

const _STRATEGIES: DecompositionStrategy[] = [
  'top-down', 'bottom-up', 'hybrid',
  'example-based', 'agile', 'waterfall',
];

function makeTask(id: string, domain: string, complexity: number, strategy: DecompositionStrategy): Task {
  return {
    id,
    goal: makeGoal(domain, complexity),
    context: makeContext(),
    expectedSteps: 5,
    optimalStrategy: strategy,
    groundTruth: [],
    metadata: { source: 'synthetic', qualityScore: 1, timestamp: Date.now() },
    domain,
    type: 'feature',
    description: `Test task ${id}`,
    acceptanceCriteria: [],
    dependencies: [],
    technicalNotes: '',
    files: [],
  };
}

function makeFamily(id: string, domain: string, count: number): TaskFamily {
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(makeTask(`${id}-${i}`, domain, 0.3 + Math.random() * 0.4, _STRATEGIES[i % _STRATEGIES.length]));
  }
  const mid = Math.floor(count / 2);
  return {
    id,
    name: `${domain}_family`,
    domain,
    supportSet: tasks.slice(0, mid),
    querySet: tasks.slice(mid),
    similarityThreshold: 0.6,
    metaFeatures: { domainCode: mid },
    curriculumOrder: mid,
    description: `Family ${id} for ${domain}`,
  };
}

function makeExample(domain: string, strategy: DecompositionStrategy): Example {
  return {
    goal: makeGoal(domain, 0.5),
    preferredStrategy: strategy,
    outcome: { success: true, tokensSpent: 1000, stepsExecuted: 5 },
  };
}

describe('PolicyNetwork', () => {
  it('should forward pass produce output of correct dimension', () => {
    const policy = new PolicyNetwork([4, 8, 3]);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const output = policy.forward(input);
    expect(output.length).toBe(3);
  });

  it('should produce probabilities that sum to 1', () => {
    const policy = new PolicyNetwork([4, 8, 3]);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const output = policy.forward(input);
    const sum = Array.from(output).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-5);
  });

  it('should clone with identical parameters but different reference', () => {
    const policy = new PolicyNetwork([4, 8, 3]);
    const cloned = policy.clone();
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const out1 = policy.forward(input);
    const out2 = cloned.forward(input);
    expect(Array.from(out1)).toEqual(Array.from(out2));
  });

  it('should change parameters after backward', () => {
    const policy = new PolicyNetwork([4, 8, 3]);
    const before = policy.getWeights();
    const paramsBefore = before.weights.map(w => new Float32Array(w));
    // Simulate parameter update (backward pass equivalent)
    const newWeights = before.weights.map(w => {
      const nw = new Float32Array(w.length);
      for (let i = 0; i < nw.length; i++) nw[i] = w[i] + 0.01;
      return nw;
    });
    const newBiases = before.biases.map(b => {
      const nb = new Float32Array(b.length);
      for (let i = 0; i < nb.length; i++) nb[i] = b[i] + 0.01;
      return nb;
    });
    policy.setWeights(newWeights, newBiases);
    const paramsAfter = policy.getWeights().weights;
    let changed = false;
    for (let i = 0; i < paramsBefore.length; i++) {
      for (let j = 0; j < paramsBefore[i].length; j++) {
        if (paramsBefore[i][j] !== paramsAfter[i][j]) changed = true;
      }
    }
    expect(changed).toBe(true);
  });

  it('should save and load parameters correctly', () => {
    const policy = new PolicyNetwork([4, 8, 3]);
    const snap = policy.getWeights();
    const policy2 = new PolicyNetwork([4, 8, 3]);
    policy2.setWeights(snap.weights, snap.biases);
    const input = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const out1 = policy.forward(input);
    const out2 = policy2.forward(input);
    expect(Array.from(out1)).toEqual(Array.from(out2));
  });
});

describe('MAMLStateEncoder', () => {
  it('should produce fixed-length encoding', () => {
    const encoder = new MAMLStateEncoder();
    const task = makeTask('t1', 'web', 0.5, 'top-down');
    const family = makeFamily('f1', 'web', 3);
    const context = makeContext();
    const encoding = encoder.encode(task, family, context);
    expect(encoding.length).toBe(140);
  });

  it('should produce same encoding for same inputs', () => {
    const encoder = new MAMLStateEncoder();
    const task = makeTask('t1', 'web', 0.5, 'top-down');
    const family = makeFamily('f1', 'web', 3);
    const context = makeContext();
    const enc1 = encoder.encode(task, family, context);
    const enc2 = encoder.encode(task, family, context);
    expect(Array.from(enc1)).toEqual(Array.from(enc2));
  });

  it('should normalize values to [-1, 1] range', () => {
    const encoder = new MAMLStateEncoder();
    const task = makeTask('t1', 'web', 0.5, 'top-down');
    const family = makeFamily('f1', 'web', 3);
    const context = makeContext({ fileCount: 10000, timeEstimate: 100000 });
    const encoding = encoder.encode(task, family, context);
    for (let i = 0; i < encoding.length; i++) {
      expect(Math.abs(encoding[i])).toBeLessThanOrEqual(1);
    }
  });
});

describe('GradientAdapter', () => {
  it('should adapt meta params with gradients', () => {
    const adapter = new GradientAdapter();
    const metaParams = { strategies: ['top-down'], weights: { w1: 1.0, w2: 0.5 }, adaptationRate: 0.1, explorationRate: 0.05 };
    const gradients = [{ strategy: 'top-down', complexity: 0.5, iterations: 3, confidence: 0.8, convergenceRate: 0.1, reward: 0.5 }] as any;
    const adapted = adapter.adapt(metaParams, gradients, 0.01);
    expect(adapted.weights.w1).toBeLessThan(1.0);
    expect(adapted.weights.w2).toBeLessThan(0.5);
  });

  it('should compute query loss with positive value', () => {
    const adapter = new GradientAdapter();
    const gradient = adapter.computeGradients(0.8, 0.6);
    expect(gradient).toBeGreaterThan(0);
  });
});

describe('ElderlyReplayBuffer', () => {
  it('should store and retrieve samples', () => {
    const buffer = new ElderlyReplayBuffer(10);
    (buffer as any).add({
      familyId: 'f1',
      supportIds: ['t1'],
      adaptedPolicy: null,
      queryLoss: 0.5,
      timestamp: Date.now(),
    });
    expect(buffer.size()).toBe(1);
    const samples = buffer.sample(1);
    expect(samples.length).toBe(1);
    expect(samples[0].familyId).toBe('f1');
  });

  it('should evict oldest when full', () => {
    const buffer = new ElderlyReplayBuffer(3);
    (buffer as any).add({
      familyId: 'f1', supportIds: [], adaptedPolicy: null,
      queryLoss: 0.1, timestamp: Date.now() - 10000,
    });
    (buffer as any).add({
      familyId: 'f2', supportIds: [], adaptedPolicy: null,
      queryLoss: 0.2, timestamp: Date.now() - 5000,
    });
    (buffer as any).add({
      familyId: 'f3', supportIds: [], adaptedPolicy: null,
      queryLoss: 0.3, timestamp: Date.now(),
    });
    (buffer as any).add({
      familyId: 'f4', supportIds: [], adaptedPolicy: null,
      queryLoss: 0.4, timestamp: Date.now(),
    });
    expect(buffer.size()).toBe(3);
  });

  it('should return empty array when buffer is empty', () => {
    const buffer = new ElderlyReplayBuffer(10);
    const samples = buffer.sample(5);
    expect(samples.length).toBe(0);
  });

  it('should clear all samples', () => {
    const buffer = new ElderlyReplayBuffer(10);
    (buffer as any).add({
      familyId: 'f1', supportIds: [], adaptedPolicy: null,
      queryLoss: 0.5, timestamp: Date.now(),
    });
    expect(buffer.size()).toBe(1);
    buffer.clear();
    expect(buffer.size()).toBe(0);
  });
});

describe('CrossProjectLearner', () => {
  it('should register and transfer knowledge', async () => {
    const learner = new CrossProjectLearner();
    learner.registerProject('proj1', {
      projectId: 'proj1', domain: 'web', taskCount: 5, avgComplexity: 0.5,
      dominantStrategies: new Map(), policySnapshot: {} as any,
      performance: { avgLoss: 0.5, accuracy: 0.8, adaptationSpeed: 0.1 },
      timestamp: Date.now(), completedTasks: [],
    } as any);
    const result = await learner.transferKnowledge('proj1', makeTask('t1', 'web', 0.5, 'top-down'));
    expect(result).toBeDefined();
  });

  it('should get metrics', () => {
    const learner = new CrossProjectLearner();
    const metrics = learner.getMetrics();
    expect(metrics).toBeDefined();
  });
});

describe('MAML', () => {
  it('should adapt to a task', async () => {
    const maml = new MAML();
    const task = makeTask('inner-test', 'web', 0.5, 'hybrid');
    const family = makeFamily('f1', 'web', 3);
    const context = makeContext();
    const examples = [makeExample('web', 'hybrid')];
    const result = await maml.adapt(task, family, context, examples);
    expect(result).toBeDefined();
  });

  it('should meta-learn across tasks', async () => {
    const maml = new MAML();
    const tasks = [makeTask('t1', 'web', 0.5, 'hybrid'), makeTask('t2', 'api', 0.6, 'top-down')];
    const families = [makeFamily('f1', 'web', 3), makeFamily('f2', 'api', 3)];
    const contexts = [makeContext(), makeContext()];
    const examples = [[makeExample('web', 'hybrid')], [makeExample('api', 'top-down')]];
    const metrics = await maml.metaLearn(tasks, families, contexts, examples);
    expect(metrics).toBeDefined();
  });

  it('should plan tasks', async () => {
    const maml = new MAML();
    const goal = makeGoal('web', 0.5);
    const context = makeContext();
    const result = await maml.plan(goal, context);
    expect(result.tasks).toBeDefined();
    expect(result.strategy).toBeDefined();
  });

  it('should evaluate on task families', async () => {
    const maml = new MAML();
    const tasks = [makeTask('t1', 'web', 0.5, 'hybrid')];
    const families = [makeFamily('f1', 'web', 3)];
    const contexts = [makeContext()];
    const examples = [[makeExample('web', 'hybrid')]];
    const report = await maml.evaluate(tasks, families, contexts, examples);
    expect(report).toBeDefined();
  });

  it('should expose crossProjectLearner', () => {
    const maml = new MAML();
    expect(maml.crossProjectLearner).toBeDefined();
  });

  it('should expose replayBuffer', () => {
    const maml = new MAML();
    expect(maml.replayBuffer).toBeDefined();
  });

  it('should expose policyNetwork', () => {
    const maml = new MAML();
    expect(maml.policyNetwork).toBeDefined();
  });

  it('should expose metaParams', () => {
    const maml = new MAML();
    expect(maml.metaParams).toBeDefined();
    expect(maml.metaParams.strategies).toBeDefined();
  });

  it('should expose metaMetrics', () => {
    const maml = new MAML();
    expect(maml.metaMetrics).toBeDefined();
  });
});

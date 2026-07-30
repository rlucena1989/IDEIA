import {
  MAML, TaskSampler, MetaRL, PEARL, VariBAD,
  PolicyNetwork, GradientAdapter, MAMLStateEncoder,
} from '../src';
import {
  Task, TaskFamily, Goal, PlanningContext, DecompositionStrategy,
  Episode, Transition, Trajectory,
} from '../src';

function makeGoal(domain: string, complexity: number): Goal {
  return {
    description: `Integration test task in ${domain}`,
    complexity,
    domain,
    constraints: [],
    successCriteria: [],
  };
}

function makeContext(overrides?: Partial<PlanningContext>): PlanningContext {
  return {
    fileCount: 30, agentSkillLevel: 5, similarProjects: 2,
    hasExistingCode: true, isBugfix: false, isRefactor: false,
    timeEstimate: 3600, historyLength: 100, teamSize: 1, techStack: ['ts'],
    ...overrides,
  };
}

const STRATEGIES: DecompositionStrategy[] = [
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
  };
}

function makeFamily(id: string, domain: string, count: number): TaskFamily {
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(makeTask(`${id}-${i}`, domain, 0.3 + Math.random() * 0.4, STRATEGIES[i % STRATEGIES.length]));
  }
  const mid = Math.floor(count / 2);
  return {
    id, name: `${domain}_family`, domain,
    supportSet: tasks.slice(0, mid),
    querySet: tasks.slice(mid),
    similarityThreshold: 0.6,
    metaFeatures: { domainCode: count },
    curriculumOrder: count,
  };
}

describe('Full Integration', () => {
  it('should run MAML + TaskSampler end-to-end', () => {
    const maml = new MAML({ inputDim: 140, hiddenDims: [32, 16], outputDim: 6 });
    const sampler = new TaskSampler();
    const families = [
      makeFamily('int-f1', 'web', 8),
      makeFamily('int-f2', 'api', 8),
    ];

    const batch = sampler.sampleBatch(families, 3, 3);
    expect(batch.length).toBe(2);

    const metrics = maml.metaTrain(families);
    expect(metrics.initialLoss).toBeGreaterThan(0);
    expect(metrics.finalLoss).toBeGreaterThanOrEqual(0);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(metrics.convergenceEpoch).toBe(2);
  });

  it('should cross-validate MAML on held-out family', () => {
    const maml = new MAML({ inputDim: 140, hiddenDims: [32, 16], outputDim: 6 });
    const trainFamilies = [
      makeFamily('cv-t1', 'web', 6),
      makeFamily('cv-t2', 'api', 6),
    ];
    const testFamily = makeFamily('cv-test', 'cli', 6);

    maml.metaTrain(trainFamilies);
    const evalMetrics = maml.metaEvaluate([testFamily]);
    expect(evalMetrics.accuracy).toBeGreaterThanOrEqual(0);
    expect(evalMetrics.accuracy).toBeLessThanOrEqual(1);
  });

  it('should chain MAML inner loop + outer loop correctly', () => {
    const maml = new MAML({ innerLR: 0.01, outerLR: 0.001 });
    const family = makeFamily('chain', 'web', 6);

    const adapted = new GradientAdapter().innerLoop(
      maml.activePolicy, family.supportSet, 3, 0.01,
    );
    const queryLoss = new GradientAdapter().computeQueryLoss(adapted, family.querySet);
    expect(queryLoss).toBeGreaterThan(0);

    const task = makeTask('chain-task', 'web', 0.5, 'hybrid');
    const metaParams = {
      weights: maml.activePolicy.parameters,
      biases: [] as Float32Array[],
      adamSteps: 0,
      learningRate: 0.001,
    };
    const innerResult = maml.innerLoop(task, metaParams, 3, 0.01);
    expect(innerResult.finalLoss).toBeGreaterThan(0);

    const updated = maml.outerLoop([innerResult], 0.001);
    expect(updated.weights.length).toBeGreaterThan(0);
  });

  it('should use MAMLStateEncoder with MAML for consistent encoding', () => {
    const encoder = new MAMLStateEncoder();
    const maml = new MAML();
    const task = makeTask('enc-test', 'web', 0.5, 'hybrid');

    const state = encoder.encode(task.goal, task.context);
    const probs = maml.activePolicy.forward(state);
    expect(probs.length).toBe(6);
    const sum = Array.from(probs).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-5);
  });

  it('should recover from cold start with zero examples', async () => {
    const maml = new MAML();
    const context = makeContext({ similarProjects: 0, historyLength: 0 });
    const result = await maml.adaptToNewProject([], context);
    expect(result.success).toBe(true);
  });
});

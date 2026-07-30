import { TaskSampler } from '../src';
import { Task, TaskFamily, Goal, PlanningContext, DecompositionStrategy } from '../src';

function makeTask(id: string, domain: string, complexity: number, strategy: DecompositionStrategy): Task {
  return {
    id,
    goal: {
      description: `Task ${id}`,
      complexity,
      domain,
      constraints: [],
      successCriteria: [],
    },
    context: {
      fileCount: 10, agentSkillLevel: 5, similarProjects: 0,
      hasExistingCode: false, isBugfix: false, isRefactor: false,
      timeEstimate: 3600, historyLength: 0, teamSize: 1, techStack: [],
    },
    expectedSteps: 5,
    optimalStrategy: strategy,
    groundTruth: [],
    metadata: { source: 'synthetic', qualityScore: 1, timestamp: Date.now() },
  };
}

function makeFamily(id: string, domain: string, count: number): TaskFamily {
  const strategies: DecompositionStrategy[] = ['top-down', 'bottom-up', 'hybrid', 'example-based'];
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(makeTask(`${id}-${i}`, domain, 0.3 + i * 0.1, strategies[i % strategies.length]));
  }
  const mid = Math.floor(count / 2);
  return {
    id,
    name: `${domain}_family`,
    domain,
    supportSet: tasks.slice(0, mid),
    querySet: tasks.slice(mid),
    similarityThreshold: 0.6,
    metaFeatures: { domainCode: count },
    curriculumOrder: count,
  };
}

describe('TaskSampler', () => {
  it('should sample a single task from families', () => {
    const sampler = new TaskSampler();
    const families = [makeFamily('f1', 'web', 6), makeFamily('f2', 'api', 6)];
    const task = sampler.sampleTask(families);
    expect(task.id).toBeTruthy();
    expect(task.goal.domain).toBeTruthy();
  });

  it('should sample a batch of tasks', () => {
    const sampler = new TaskSampler();
    const families = [makeFamily('f1', 'web', 10), makeFamily('f2', 'api', 10)];
    const batches = sampler.sampleBatch(families, 3, 5);
    expect(batches.length).toBe(2);
    expect(batches[0].support.length).toBe(3);
    expect(batches[0].query.length).toBe(5);
  });

  it('should sample batch from a single family', () => {
    const sampler = new TaskSampler();
    const family = makeFamily('f1', 'web', 10);
    const result = sampler.sampleBatchFromFamily(family, 2, 4);
    expect(result.support.length).toBe(2);
    expect(result.query.length).toBe(4);
  });

  it('should select tasks by curriculum phase (easy)', () => {
    const sampler = new TaskSampler();
    const families = [
      makeFamily('f1', 'web', 6),
      makeFamily('f2', 'api', 6),
      makeFamily('f3', 'cli', 6),
      makeFamily('f4', 'data', 6),
    ];
    const selected = sampler.curriculumBatch(families, 0.1);
    expect(selected.id).toBeTruthy();
  });

  it('should select tasks by curriculum phase (medium)', () => {
    const sampler = new TaskSampler();
    const families = [
      makeFamily('f1', 'web', 6),
      makeFamily('f2', 'api', 6),
      makeFamily('f3', 'cli', 6),
      makeFamily('f4', 'data', 6),
    ];
    const selected = sampler.curriculumBatch(families, 0.5);
    expect(selected.id).toBeTruthy();
  });

  it('should select tasks by curriculum phase (hard)', () => {
    const sampler = new TaskSampler();
    const families = [
      makeFamily('f1', 'web', 6),
      makeFamily('f2', 'api', 6),
      makeFamily('f3', 'cli', 6),
      makeFamily('f4', 'data', 6),
    ];
    const selected = sampler.curriculumBatch(families, 0.8);
    expect(selected.id).toBeTruthy();
  });

  it('should stratify tasks by domain', () => {
    const sampler = new TaskSampler();
    const tasks = [
      makeTask('t1', 'web', 0.5, 'hybrid'),
      makeTask('t2', 'web', 0.6, 'top-down'),
      makeTask('t3', 'api', 0.4, 'bottom-up'),
    ];
    const stratified = sampler.stratifyByDomain(tasks);
    expect(stratified.size).toBe(2);
    expect(stratified.get('web')?.length).toBe(2);
    expect(stratified.get('api')?.length).toBe(1);
  });

  it('should order families by complexity', () => {
    const sampler = new TaskSampler();
    const families = [
      makeFamily('f1', 'web', 4),
      makeFamily('f2', 'api', 6),
    ];
    const ordered = sampler.curriculumOrder(families);
    expect(ordered.length).toBe(2);
  });

  it('should sort families by similarity to target', () => {
    const sampler = new TaskSampler();
    const families = [
      makeFamily('f1', 'web', 4),
      makeFamily('f2', 'api', 4),
    ];
    const target = makeFamily('target', 'web', 4);
    const sorted = sampler.similaritySort(families, target);
    expect(sorted.length).toBe(2);
  });

  it('should throw on empty curriculum batch', () => {
    const sampler = new TaskSampler();
    expect(() => sampler.curriculumBatch([], 0.5)).toThrow('No task families available');
  });
});

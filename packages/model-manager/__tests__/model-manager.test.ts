import { ModelManager } from '../src/model-manager';
import { BenchmarkRunner } from '../src/benchmark-runner';

describe('ModelManager', () => {
  let manager: ModelManager;

  beforeEach(() => {
    manager = new ModelManager();
  });

  it('registerModel stores a model', () => {
    manager.registerModel('gpt4', {
      provider: 'openai',
      modelName: 'gpt-4',
      capabilities: ['chat', 'code'],
    });
    const model = manager.getModel('gpt4');
    expect(model).toBeDefined();
    expect(model!.name).toBe('gpt4');
    expect(model!.config.provider).toBe('openai');
  });

  it('registerModel overwrites existing with warning', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat'] });
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4-turbo', capabilities: ['chat', 'code'] });
    const model = manager.getModel('gpt4');
    expect(model!.config.modelName).toBe('gpt-4-turbo');
  });

  it('getModel returns undefined for unknown model', () => {
    expect(manager.getModel('unknown')).toBeUndefined();
  });

  it('listModels returns all models without filter', () => {
    manager.registerModel('a', { provider: 'ollama', modelName: 'llama2', capabilities: ['chat'] });
    manager.registerModel('b', { provider: 'openai', modelName: 'gpt-4', capabilities: ['code'] });
    expect(manager.listModels()).toHaveLength(2);
  });

  it('listModels filters by provider', () => {
    manager.registerModel('a', { provider: 'ollama', modelName: 'llama2', capabilities: ['chat'] });
    manager.registerModel('b', { provider: 'openai', modelName: 'gpt-4', capabilities: ['code'] });
    const models = manager.listModels({ provider: 'ollama' });
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('a');
  });

  it('listModels filters by category', () => {
    manager.registerModel('a', { provider: 'ollama', modelName: 'llama2', capabilities: ['chat'] });
    manager.registerModel('b', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat', 'code'] });
    const models = manager.listModels({ category: 'code' });
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('b');
  });

  it('evaluateModel adds evaluation entry', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat'] });
    const evalResult = manager.evaluateModel('gpt4', 'mmlu', 85, { accuracy: 0.85 });
    expect(evalResult).toBeDefined();
    expect(evalResult!.score).toBe(85);
    expect(evalResult!.benchmark).toBe('mmlu');

    const model = manager.getModel('gpt4');
    expect(model!.evaluations).toHaveLength(1);
  });

  it('evaluateModel returns undefined for unknown model', () => {
    const result = manager.evaluateModel('unknown', 'test', 50, {});
    expect(result).toBeUndefined();
  });

  it('compareModels returns sorted comparison array', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat'] });
    manager.registerModel('claude', { provider: 'deepseek', modelName: 'claude-3', capabilities: ['chat'] });
    manager.evaluateModel('gpt4', 'mmlu', 85, {});
    manager.evaluateModel('claude', 'mmlu', 90, {});

    const comparison = manager.compareModels(['gpt4', 'claude'], 'mmlu');
    expect(comparison).toHaveLength(2);
    expect(comparison[0].name).toBe('claude');
    expect(comparison[0].score).toBe(90);
  });

  it('compareModels skips models without benchmark', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat'] });
    manager.registerModel('new', { provider: 'deepseek', modelName: 'new', capabilities: ['chat'] });
    manager.evaluateModel('gpt4', 'mmlu', 85, {});
    const comparison = manager.compareModels(['gpt4', 'new'], 'mmlu');
    expect(comparison).toHaveLength(1);
  });

  it('getBestModel returns most suitable model', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat', 'code'] });
    manager.registerModel('claude', { provider: 'deepseek', modelName: 'claude-3', capabilities: ['chat', 'code'] });
    manager.evaluateModel('gpt4', 'mmlu', 85, {});
    manager.evaluateModel('gpt4', 'humaneval', 88, {});
    manager.evaluateModel('claude', 'mmlu', 92, {});
    manager.evaluateModel('claude', 'humaneval', 90, {});

    const best = manager.getBestModel('chat');
    expect(best).toBeDefined();
    expect(best!.name).toBe('claude');
  });

  it('getBestModel returns undefined if no models match task', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat'] });
    const best = manager.getBestModel('code');
    expect(best).toBeUndefined();
  });

  it('getBestModel returns undefined if no evaluations exist', () => {
    manager.registerModel('gpt4', { provider: 'openai', modelName: 'gpt-4', capabilities: ['chat'] });
    const best = manager.getBestModel('chat');
    expect(best).toBeUndefined();
  });
});

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;

  beforeEach(() => {
    runner = new BenchmarkRunner();
  });

  it('registerBenchmark stores a benchmark', () => {
    runner.registerBenchmark({
      name: 'test-bench',
      description: 'A test',
      category: 'custom',
      tasks: [{ id: 't1', prompt: 'test', expected: 'ok', metric: 'exact_match' }],
    });
    expect(runner.getRegisteredBenchmarks()).toContain('test-bench');
  });

  it('loadBenchmark returns registered benchmark', () => {
    runner.registerBenchmark({
      name: 'mmlu',
      description: 'MMLU test',
      category: 'mmlu',
      tasks: [],
    });
    const bm = runner.loadBenchmark('mmlu');
    expect(bm).toBeDefined();
    expect(bm!.name).toBe('mmlu');
  });

  it('loadBenchmark returns undefined for unknown', () => {
    expect(runner.loadBenchmark('unknown')).toBeUndefined();
  });

  it('run executes benchmark and returns results', () => {
    runner.registerBenchmark({
      name: 'test',
      description: 'Test bench',
      category: 'custom',
      tasks: [
        { id: 't1', prompt: 'q1', expected: 'a1', metric: 'exact_match' },
        { id: 't2', prompt: 'q2', expected: 'a2', metric: 'exact_match' },
      ],
    });

    const result = runner.run('model-x', 'test');
    expect(result.benchmark).toBe('test');
    expect(result.model).toBe('model-x');
    expect(result.totalTasks).toBe(2);
    expect(result.results).toHaveLength(2);
    expect(typeof result.totalScore).toBe('number');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('startedAt');
    expect(result).toHaveProperty('completedAt');
  });

  it('run handles unknown benchmark gracefully', () => {
    const result = runner.run('model-x', 'unknown-bench');
    expect(result.totalScore).toBe(0);
    expect(result.totalTasks).toBe(0);
  });

  it('getResult returns run by id', () => {
    runner.registerBenchmark({
      name: 'test',
      description: '',
      category: 'custom',
      tasks: [],
    });
    const run = runner.run('m', 'test');
    const retrieved = runner.getResult(run.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(run.id);
  });

  it('getResult returns undefined for unknown id', () => {
    expect(runner.getResult('nonexistent')).toBeUndefined();
  });
});

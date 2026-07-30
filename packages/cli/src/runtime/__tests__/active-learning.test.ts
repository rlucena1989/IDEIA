import { describe, it, expect } from '@jest/globals';
import { ActiveLearner, InContextLearner, FineTuningPipeline } from '../active-learning';

describe('ActiveLearner', () => {
  it('should require confirmation when confidence below threshold', () => {
    const learner = new ActiveLearner(0.8);
    const result = learner.evaluate('deploy', 0.5, ['normal']);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.reason).toContain('Low confidence');
  });

  it('should auto-approve when confidence above threshold', () => {
    const learner = new ActiveLearner(0.8);
    const result = learner.evaluate('deploy', 0.95, ['normal']);
    expect(result.requiresConfirmation).toBe(false);
    expect(result.reason).toBe('Sufficient confidence');
  });

  it('should flag destructive actions', () => {
    const learner = new ActiveLearner(0.8);
    const result = learner.evaluate('rm -rf', 0.9, ['normal']);
    expect(result.reason).toContain('Destructive action');
  });

  it('should flag uncertain context', () => {
    const learner = new ActiveLearner(0.8);
    const result = learner.evaluate('update', 0.9, ['unknown environment']);
    expect(result.reason).toContain('Uncertain context');
  });

  it('should handle exact threshold boundary', () => {
    const learner = new ActiveLearner(0.8);
    const result = learner.evaluate('test', 0.8, ['normal']);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('should use custom threshold', () => {
    const learner = new ActiveLearner(0.5);
    const result = learner.evaluate('deploy', 0.6, ['normal']);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('should combine multiple reasons', () => {
    const learner = new ActiveLearner(0.9);
    const result = learner.evaluate('drop table', 0.5, ['uncertain']);
    const reasons = result.reason.split('; ');
    expect(reasons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('InContextLearner', () => {
  it('should select examples by query relevance', () => {
    const learner = new InContextLearner();
    learner.addExample('deploy to production', 'run deploy.sh', ['deploy'], 1);
    learner.addExample('test the api', 'run test.sh', ['test'], 1);
    learner.addExample('build the app', 'run build.sh', ['build'], 1);
    const selected = learner.selectExamples('deploy production', 2);
    expect(selected.length).toBe(2);
    expect(selected[0].input).toContain('deploy');
  });

  it('should respect maxExamples limit', () => {
    const learner = new InContextLearner();
    for (let i = 0; i < 10; i++) {
      learner.addExample(`input ${i}`, `output ${i}`, ['test'], 1);
    }
    expect(learner.selectExamples('test', 3).length).toBe(3);
    expect(learner.selectExamples('test', 10).length).toBe(10);
  });

  it('should prefer higher quality examples', () => {
    const learner = new InContextLearner();
    learner.addExample('deploy', 'script1', ['deploy'], 0.5);
    learner.addExample('deploy', 'script2', ['deploy'], 1.0);
    const selected = learner.selectExamples('deploy', 2);
    expect(selected[0].quality).toBe(1.0);
  });

  it('should return empty array for no examples', () => {
    const learner = new InContextLearner();
    expect(learner.selectExamples('anything', 3)).toEqual([]);
  });
});

describe('FineTuningPipeline', () => {
  it('should export OpenAI format', () => {
    const pipeline = new FineTuningPipeline();
    pipeline.addExample('Hello', 'World');
    const output = pipeline.exportForFineTuning('openai');
    const parsed = JSON.parse(output.split('\n')[0]);
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0].role).toBe('user');
    expect(parsed.messages[1].role).toBe('assistant');
  });

  it('should export Llama format', () => {
    const pipeline = new FineTuningPipeline();
    pipeline.addExample('Hello', 'World');
    const output = pipeline.exportForFineTuning('llama');
    expect(output).toContain('[INST]');
    expect(output).toContain('[/INST]');
  });

  it('should return empty stats when no examples', () => {
    const pipeline = new FineTuningPipeline();
    const stats = pipeline.getStats();
    expect(stats.total).toBe(0);
    expect(stats.avgPromptLength).toBe(0);
    expect(stats.avgCompletionLength).toBe(0);
  });

  it('should calculate stats correctly', () => {
    const pipeline = new FineTuningPipeline();
    pipeline.addExample('short', 'longer response');
    const stats = pipeline.getStats();
    expect(stats.total).toBe(1);
    expect(stats.avgPromptLength).toBe('short'.length);
    expect(stats.avgCompletionLength).toBe('longer response'.length);
  });

  it('should respect maxExamples limit and evict oldest', () => {
    const pipeline = new FineTuningPipeline();
    for (let i = 0; i < 1005; i++) {
      pipeline.addExample(`prompt ${i}`, `completion ${i}`);
    }
    expect(pipeline.getStats().total).toBe(1000);
  });

  it('should handle metadata', () => {
    const pipeline = new FineTuningPipeline();
    pipeline.addExample('test', 'output', { source: 'test', difficulty: 1 });
    const output = pipeline.exportForFineTuning('openai');
    expect(output).toBeTruthy();
  });
});

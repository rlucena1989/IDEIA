import { FinetuningJobManager, JobSubmission } from './finetuning-job';

describe('FinetuningJobManager', () => {
  const baseSubmission: JobSubmission = {
    model: 'codellama-7b',
    method: 'lora',
    dataset: [{ input: 'test', output: 'test', metadata: { source: 'test', timestamp: '2024-01-01', taskType: 'general' } }],
    hyperparameters: { learningRate: 2e-4, epochs: 3, batchSize: 8, rank: 8, alpha: 16, targetModules: ['q_proj', 'v_proj'] },
  };

  let manager: FinetuningJobManager;

  beforeEach(() => {
    manager = new FinetuningJobManager();
  });

  it('submitJob creates job with pending status', () => {
    const job = manager.submitJob('job-1', baseSubmission);
    expect(job.id).toBe('job-1');
    expect(job.status).toBe('pending');
    expect(job.model).toBe('codellama-7b');
    expect(job.method).toBe('lora');
  });

  it('getJobStatus returns correct status', () => {
    manager.submitJob('job-2', baseSubmission);
    expect(manager.getJobStatus('job-2')).toBe('pending');
    manager.startJob('job-2');
    expect(manager.getJobStatus('job-2')).toBe('running');
    manager.completeJob('job-2', { loss: 0.12, accuracy: 0.95, perplexity: 4.2, evalScore: 0.88, tokensProcessed: 100000, duration: 3600 });
    expect(manager.getJobStatus('job-2')).toBe('completed');
  });

  it('cancelJob transitions to cancelled (failed)', () => {
    manager.submitJob('job-3', baseSubmission);
    manager.startJob('job-3');
    const result = manager.cancelJob('job-3');
    expect(result).toBe(true);
    expect(manager.getJobStatus('job-3')).toBe('failed');
  });

  it('listJobs returns all jobs', () => {
    manager.submitJob('job-4', baseSubmission);
    manager.submitJob('job-5', { ...baseSubmission, model: 'deepseek-coder-6.7b', method: 'qlora' });
    const all = manager.listJobs();
    expect(all).toHaveLength(2);
    const filtered = manager.listJobs({ method: 'qlora' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('job-5');
  });

  it('getJobMetrics returns metrics for completed job', () => {
    const metrics = { loss: 0.08, accuracy: 0.97, perplexity: 3.1, evalScore: 0.92, tokensProcessed: 200000, duration: 7200 };
    manager.submitJob('job-6', baseSubmission);
    manager.startJob('job-6');
    manager.completeJob('job-6', metrics);
    expect(manager.getJobMetrics('job-6')).toEqual(metrics);
    expect(manager.getJobMetrics('nonexistent')).toBeUndefined();
  });

  it('duplicate job ID is rejected', () => {
    manager.submitJob('job-7', baseSubmission);
    expect(() => manager.submitJob('job-7', baseSubmission)).toThrow('already exists');
  });

  it('cancelJob returns false for completed job', () => {
    manager.submitJob('job-8', baseSubmission);
    manager.startJob('job-8');
    manager.completeJob('job-8', { loss: 0.1, accuracy: 0.96, perplexity: 3.5, evalScore: 0.9, tokensProcessed: 150000, duration: 5400 });
    expect(manager.cancelJob('job-8')).toBe(false);
  });

  it('emits lifecycle events', () => {
    const submitted = jest.fn();
    const started = jest.fn();
    const completed = jest.fn();
    manager.on('job.submitted', submitted);
    manager.on('job.started', started);
    manager.on('job.completed', completed);

    manager.submitJob('job-9', baseSubmission);
    manager.startJob('job-9');
    manager.completeJob('job-9', { loss: 0.09, accuracy: 0.98, perplexity: 2.9, evalScore: 0.94, tokensProcessed: 250000, duration: 9000 });

    expect(submitted).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledTimes(1);
    expect(completed).toHaveBeenCalledTimes(1);
  });
});

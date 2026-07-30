import { EventEmitter } from 'events';
import { createLogger } from '@ideia/logger';
import { FinetuningJob, FinetuningMethod, FinetuningStatus, DatasetEntry, Hyperparameters, TrainingMetrics } from './types';
const logger = createLogger('finetuning-job');

export interface JobSubmission {
  model: string;
  method: FinetuningMethod;
  dataset: DatasetEntry[];
  hyperparameters: Hyperparameters;
}

export interface JobFilter {
  status?: FinetuningStatus;
  method?: FinetuningMethod;
  model?: string;
}

export class FinetuningJobManager extends EventEmitter {
  private jobs: Map<string, FinetuningJob> = new Map();
  private runningJobs: Set<string> = new Set();

  submitJob(id: string, submission: JobSubmission): FinetuningJob {
    if (this.jobs.has(id)) {
      throw new Error(`Job with id '${id}' already exists`);
    }
    const job: FinetuningJob = {
      id,
      model: submission.model,
      method: submission.method,
      dataset: submission.dataset,
      hyperparameters: submission.hyperparameters,
      status: 'pending',
    };
    this.jobs.set(id, job);
    this.emit('job.submitted', job);
    return job;
  }

  getJobStatus(id: string): FinetuningStatus | undefined {
    return this.jobs.get(id)?.status;
  }

  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }
    job.status = 'failed';
    this.runningJobs.delete(id);
    this.emit('job.failed', { id, reason: 'cancelled' });
    return true;
  }

  listJobs(filter?: JobFilter): FinetuningJob[] {
    const all = Array.from(this.jobs.values());
    if (!filter) return all;
    return all.filter(j => {
      if (filter.status && j.status !== filter.status) return false;
      if (filter.method && j.method !== filter.method) return false;
      if (filter.model && j.model !== filter.model) return false;
      return true;
    });
  }

  getJobMetrics(id: string): TrainingMetrics | undefined {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'completed') return undefined;
    return job.metrics;
  }

  startJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'pending') return false;
    job.status = 'running';
    this.runningJobs.add(id);
    this.emit('job.started', job);
    return true;
  }

  completeJob(id: string, metrics: TrainingMetrics): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'running') return false;
    job.status = 'completed';
    job.metrics = metrics;
    this.runningJobs.delete(id);
    this.emit('job.completed', job);
    return true;
  }

  failJob(id: string, error: string): boolean {
    const job = this.jobs.get(id);
    if (!job || (job.status !== 'running' && job.status !== 'pending')) return false;
    job.status = 'failed';
    this.runningJobs.delete(id);
    this.emit('job.failed', { id, reason: error });
    return true;
  }

  updateProgress(id: string, progress: number): void {
    this.emit('job.progress', { id, progress });
  }
}

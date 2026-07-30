import { SecretsManager } from './secrets-manager';
import { createLogger } from '@ideia/logger';
const logger = createLogger('rotation-scheduler');

interface CronJob {
  name: string;
  cronExpression: string;
  lastRun?: number;
}

export function cronMatches(expression: string, now?: Date): boolean {
  const date = now ?? new Date();
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    matchesCronField(minute!, date.getMinutes()) &&
    matchesCronField(hour!, date.getHours()) &&
    matchesCronField(dayOfMonth!, date.getDate()) &&
    matchesCronField(month!, date.getMonth() + 1) &&
    matchesCronField(dayOfWeek!, date.getDay())
  );
}

function matchesCronField(pattern: string, value: number): boolean {
  if (pattern === '*') return true;

  if (pattern.startsWith('*/')) {
    const step = parseInt(pattern.substring(2), 10);
    if (isNaN(step)) return false;
    return value % step === 0;
  }

  if (pattern.includes(',')) {
    return pattern.split(',').some(p => {
      const n = parseInt(p.trim(), 10);
      return !isNaN(n) && n === value;
    });
  }

  if (pattern.includes('-')) {
    const [rawStart, rawEnd] = pattern.split('-');
    const start = parseInt(rawStart!, 10);
    const end = parseInt(rawEnd!, 10);
    if (isNaN(start) || isNaN(end)) return false;
    return value >= start && value <= end;
  }

  const exact = parseInt(pattern, 10);
  return !isNaN(exact) && exact === value;
}

export class RotationScheduler {
  private secretsManager: SecretsManager;
  private jobs: CronJob[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 60_000;

  constructor(secretsManager: SecretsManager) {
    this.secretsManager = secretsManager;
  }

  addJob(name: string, cronExpression: string): void {
    const existing = this.jobs.findIndex(j => j.name === name);
    if (existing >= 0) {
      this.jobs[existing] = { name, cronExpression };
    } else {
      this.jobs.push({ name, cronExpression });
    }
    this.secretsManager.scheduleRotation(name, cronExpression);
  }

  removeJob(name: string): void {
    this.jobs = this.jobs.filter(j => j.name !== name);
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.executeDue();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getPendingRotations(): CronJob[] {
    const now = Date.now();
    return this.jobs.filter(job => {
      if (!cronMatches(job.cronExpression)) return false;
      if (job.lastRun && now - job.lastRun < 60_000) return false;
      return true;
    });
  }

  async executeDue(): Promise<void> {
    const pending = this.getPendingRotations();
    for (const job of pending) {
      job.lastRun = Date.now();
      await this.secretsManager.rotateSecret(job.name);
    }
  }

  getJobs(): CronJob[] {
    return [...this.jobs];
  }

  setCheckInterval(ms: number): void {
    this.checkIntervalMs = ms;
  }
}

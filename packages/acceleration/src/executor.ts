import { execFile } from 'node:child_process';
import { runInParallel } from './worker-pool';
import { JsonCache } from './cache';
import { EngineConfig, JobResult } from './types';
import { PlannedJob } from './planner';
import { getRetryDecision } from './retry-policy';
import { createLogger } from '@ideia/logger';

const log = createLogger('executor');
const DEFAULT_JOB_TIMEOUT_MS = Number(process.env.AI_JOB_TIMEOUT_MS ?? 120000);
const MAX_ATTEMPTS = Number(process.env.AI_JOB_MAX_ATTEMPTS ?? 3);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sortByDependencies(plan: PlannedJob[]): PlannedJob[] {
  const map = new Map(plan.map(job => [job.id, job]));
  const result: PlannedJob[] = [];
  const visited = new Set<string>();

  function visit(job: PlannedJob) {
    if (visited.has(job.id)) return;
    visited.add(job.id);
    for (const depId of job.dependsOn) {
      const dep = map.get(depId);
      if (dep) visit(dep);
    }
    result.push(job);
  }

  for (const job of plan) visit(job);
  return result;
}

export async function executePlan(
  plan: PlannedJob[],
  config: EngineConfig,
  cache: JsonCache,
  fingerprint: string
): Promise<JobResult[]> {
  const cacheKey = `plan:${fingerprint}:${config.mode}`;
  const cached = cache.get<JobResult[]>(cacheKey);
  if (cached) return cached;

  const ordered = sortByDependencies(plan);

  const results = await runInParallel(ordered, config.concurrency, (job) => runJobWithRetry(job));

  cache.set(cacheKey, results);
  return results;
}

async function runJobWithRetry(job: PlannedJob): Promise<JobResult> {
  const isTestJob = job.tags.includes('tests') || job.tags.includes('smoke');
  let lastError: unknown;
  let attempt = 0;
  const startedTotal = Date.now();

  while (attempt < MAX_ATTEMPTS) {
    const _started = Date.now();
    try {
      const [cmd, ...args] = parseCommand(job.command);
      const output = await new Promise<string>((resolve, reject) => {
        execFile(cmd, args, {
          encoding: 'utf8',
          timeout: DEFAULT_JOB_TIMEOUT_MS,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
        }, (err, stdout) => {
          if (err) reject(err); else resolve(stdout);
        });
      });
      return {
        id: job.id,
        name: job.name,
        status: 'success',
        durationMs: Date.now() - startedTotal,
        exitCode: 0,
        attempts: attempt + 1,
        output: output.trim().split('\n').slice(0, 20).join('\n')
      } as JobResult;
    } catch (error: unknown) {
      lastError = error;
      attempt += 1;
      const execErr = error as { stdout?: { toString(): string }; message?: string; status?: number };
      const errMsg = `${execErr.message ?? ''} ${execErr.stdout?.toString?.()?.trim() ?? ''}`.trim();
      const decision = getRetryDecision(attempt, MAX_ATTEMPTS, errMsg);
      if (!isTestJob || !decision.shouldRetry) break;
      log.warn(`job ${job.name} failed (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in ${decision.delayMs}ms (${decision.failureType})`);
      await sleep(decision.delayMs);
    }
  }

  const execErr = lastError as { stdout?: { toString(): string }; message?: string; status?: number } | null | undefined;
  const partialOutput = execErr?.stdout?.toString?.()?.trim()?.split('\n')?.slice(0, 5)?.join('; ') ?? '';
  return {
    id: job.id,
    name: job.name,
    status: 'failed',
    durationMs: Date.now() - startedTotal,
    exitCode: Number(execErr?.status ?? 1),
    attempts: attempt,
    error: `${execErr?.message ?? ''} ${partialOutput}`.trim()
  } as JobResult;
}

function parseCommand(command: string): [string, ...string[]] {
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [command];
  const cmd = parts[0]!.replace(/"/g, '');
  const args = parts.slice(1).map(a => a.replace(/"/g, ''));
  return [cmd, ...args];
}

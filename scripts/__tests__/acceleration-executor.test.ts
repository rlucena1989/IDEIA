import { executePlan } from '../acceleration/executor';
import { JsonCache } from '../acceleration/cache';
import { PlannedJob } from '../acceleration/planner';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

describe('acceleration - executor', () => {
  let tmpDir: string;
  let cache: JsonCache;
  const config = { mode: 'fast' as const, concurrency: 4, loop: false, stopOnFailure: true, reportDir: '/tmp', cacheFile: '', stateFile: '', metricsFile: '', telemetryFile: '' };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-'));
    config.cacheFile = path.join(tmpDir, 'cache.json');
    cache = new JsonCache(config.cacheFile);
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('deve executar plan com jobs echo', async () => {
    const plan: PlannedJob[] = [
      { id: 'j1', name: 'job1', command: 'echo hello', priority: 1, dependsOn: [], tags: [] },
    ];
    const results = await executePlan(plan, config, cache, 'test-fp');
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('success');
    expect(results[0].exitCode).toBe(0);
  });

  it('deve ordenar por dependencias', async () => {
    const plan: PlannedJob[] = [
      { id: 'j2', name: 'job2', command: 'echo second', priority: 2, dependsOn: ['j1'], tags: [] },
      { id: 'j1', name: 'job1', command: 'echo first', priority: 1, dependsOn: [], tags: [] },
    ];
    const results = await executePlan(plan, config, cache, 'test-fp-2');
    expect(results).toHaveLength(2);
  });

  it('deve retornar cached se disponivel', async () => {
    const plan: PlannedJob[] = [
      { id: 'j1', name: 'job1', command: 'echo run', priority: 1, dependsOn: [], tags: [] },
    ];
    const results1 = await executePlan(plan, config, cache, 'cache-fp');
    const results2 = await executePlan(plan, config, cache, 'cache-fp');
    expect(results2).toEqual(results1);
  });

  it('deve falhar para comando invalido', async () => {
    const plan: PlannedJob[] = [
      { id: 'j1', name: 'bad', command: 'nonexistent_cmd_xyz', priority: 1, dependsOn: [], tags: [] },
    ];
    const results = await executePlan(plan, config, cache, 'fail-fp');
    expect(results[0].status).toBe('failed');
    expect(results[0].exitCode).not.toBe(0);
  });
});
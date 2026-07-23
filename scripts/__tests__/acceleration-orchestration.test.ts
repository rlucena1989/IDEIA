import { runEngineOnce } from '../acceleration/engine';
import { runEngineLoop } from '../acceleration/loop';
import { runSelfHealingLoop } from '../acceleration/self-healing-loop';
import { runOrchestrator } from '../acceleration/orchestrator';

const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';
const itOrSkip = () => runIntegration ? it : it.skip; // Use: itOrSkip()('test name', ...)

describe('acceleration - engine', () => {
  (runIntegration ? it : it.skip)('deve executar ciclo completo e retornar EngineReport', async () => {
    const report = await runEngineOnce();
    expect(report).toBeDefined();
    expect(report.startedAt).toBeTruthy();
    expect(report.finishedAt).toBeTruthy();
    expect(['fast', 'balanced', 'deep']).toContain(report.mode);
    expect(report.forecast).toBeDefined();
    expect(report.forecast.estimatedJobs).toBeGreaterThanOrEqual(1);
    expect(report.precision).toBeDefined();
    expect(report.quality).toBeDefined();
    expect(report.quality.score).toBeGreaterThanOrEqual(0);
    expect(report.scorecard).toBeDefined();
    expect(report.coverage).toBeDefined();
    expect(report.gaps).toBeDefined();
    expect(report.maturity).toBeDefined();
    expect(report.history).toBeDefined();
    expect(report.results).toBeDefined();
    expect(report.totalDurationMs).toBeGreaterThan(0);
  });

  (runIntegration ? it : it.skip)('deve incluir resultados de execucao no report', async () => {
    const report = await runEngineOnce();
    expect(report.results.length).toBeGreaterThanOrEqual(0);
    for (const result of report.results) {
      expect(result.id).toBeTruthy();
      expect(result.status).toBeTruthy();
    }
  });
});

describe('acceleration - loop', () => {
  (runIntegration ? it : it.skip)('deve executar loop e parar apos 1 ciclo se loop=false', async () => {
    const OLD_LOOP = process.env.AI_LOOP;
    process.env.AI_LOOP = 'false';
    try {
      await runEngineLoop();
    } finally {
      if (OLD_LOOP) process.env.AI_LOOP = OLD_LOOP;
      else delete process.env.AI_LOOP;
    }
  });
});

describe('acceleration - self-healing-loop', () => {
  (runIntegration ? it : it.skip)('deve executar self-healing sem erro', async () => {
    const promise = runSelfHealingLoop();
    // It will loop forever, so give it a brief moment then cancel
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 2000)
    );
    await expect(Promise.race([promise, timeout])).rejects.toThrow('timeout');
  }, 5000);
});

describe('acceleration - orchestrator', () => {
  (runIntegration ? it : it.skip)('deve executar single run quando AI_LOOP nao for true', async () => {
    const OLD_LOOP = process.env.AI_LOOP;
    delete process.env.AI_LOOP;
    try {
      const result = await runOrchestrator();
      expect(result).toHaveProperty('success');
    } finally {
      if (OLD_LOOP) process.env.AI_LOOP = OLD_LOOP;
    }
  });
});
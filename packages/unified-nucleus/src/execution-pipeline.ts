import type { NucleusComponent } from './nucleus-orchestrator';
import { createLogger } from '@ideia/logger';
const logger = createLogger('execution-pipeline');

export interface PipelineStep {
  component: NucleusComponent;
  action: string;
  params: Record<string, unknown>;
  timeoutMs: number;
  retries: number;
}

export interface StepRecord {
  component: NucleusComponent;
  result: unknown;
  latencyMs: number;
}

export interface PipelineResult {
  success: boolean;
  steps: StepRecord[];
  output: unknown;
  error: string | null;
  totalLatencyMs: number;
}

export class ExecutionPipeline {
  async execute(steps: PipelineStep[], context: Record<string, unknown>): Promise<PipelineResult> {
    const records: StepRecord[] = [];
    const startTotal = performance.now();
    let lastOutput: unknown = undefined;

    for (const step of steps) {
      const stepContext = { ...context, previousOutput: lastOutput };
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt <= step.retries) {
        try {
          const { result, latencyMs } = await this._executeStep(step, stepContext);
          records.push({ component: step.component, result, latencyMs });
          lastOutput = result;
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (!this._shouldRetry(lastError, attempt, step.retries)) {
            const totalLatencyMs = performance.now() - startTotal;
            return {
              success: false,
              steps: records,
              output: null,
              error: lastError.message,
              totalLatencyMs,
            };
          }
          attempt++;
        }
      }
    }

    return {
      success: true,
      steps: records,
      output: lastOutput,
      error: null,
      totalLatencyMs: performance.now() - startTotal,
    };
  }

  private async _executeStep(
    step: PipelineStep,
    context: Record<string, unknown>
  ): Promise<{ result: unknown; latencyMs: number }> {
    const start = performance.now();
    const controller = new AbortController();

    const result = await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Step timeout after ${step.timeoutMs}ms: ${step.action}`));
      }, step.timeoutMs);

      Promise.resolve(this._runStepAction(step, context, controller.signal))
        .then(val => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });

    return { result, latencyMs: performance.now() - start };
  }

  private async _runStepAction(
    step: PipelineStep,
    _context: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<unknown> {
    if (step.action === 'slow') {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 10000);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Aborted'));
          }, { once: true });
        }
      });
    }
    if (step.action === 'fail') {
      throw new Error(`Step failed: ${step.action}`);
    }
    return { action: step.action, params: step.params };
  }

  private _shouldRetry(_error: Error, attempt: number, maxRetries: number): boolean {
    return attempt < maxRetries;
  }
}

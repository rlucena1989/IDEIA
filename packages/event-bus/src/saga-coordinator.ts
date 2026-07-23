export interface SagaContext {
  projectId: string;
  version: string;
  spec: unknown;
  artifacts?: string[];
}

export interface StepResult {
  step: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface SagaStep {
  name: string;
  handler: (ctx: SagaContext) => Promise<unknown>;
  compensator?: (ctx: SagaContext, output: unknown) => Promise<void>;
  dependencies: string[];
  timeoutMs: number;
}

export interface SagaResult {
  id: string;
  success: boolean;
  context: SagaContext;
  steps: StepResult[];
  failedAt: string | null;
  compensated: string[];
  durationMs: number;
}

export class SagaCoordinator {
  private steps: SagaStep[] = [];

  constructor(steps?: SagaStep[]) {
    if (steps) this.steps = steps;
  }

  async execute(projectId: string, context?: Partial<SagaContext>): Promise<SagaResult> {
    const sagaId = `saga-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ctx: SagaContext = {
      projectId,
      version: context?.version || '1.0.0',
      spec: context?.spec || {},
      artifacts: context?.artifacts || [],
    };

    const result: SagaResult = {
      id: sagaId,
      success: true,
      context: ctx,
      steps: [],
      failedAt: null,
      compensated: [],
      durationMs: 0,
    };

    const overallStart = Date.now();
    const completed = new Set<string>();

    for (const step of this.steps) {
      for (const dep of step.dependencies) {
        if (!completed.has(dep)) {
          throw new Error(`Dependency ${dep} not completed for step ${step.name}`);
        }
      }

      const stepResult = await this.executeWithTimeout(step, ctx);
      result.steps.push(stepResult);

      if (stepResult.success) {
        completed.add(step.name);
      } else {
        result.success = false;
        result.failedAt = step.name;

        const compensated = new Set<string>();
        for (let i = result.steps.length - 2; i >= 0; i--) {
          const completedStep = this.steps[i];
          if (completedStep.compensator) {
            try {
              await completedStep.compensator(ctx, result.steps[i].output);
              compensated.add(completedStep.name);
            } catch (_err) {
              // Log silenciado propositalmente — falha nao bloqueia fluxo
            }
          }
        }
        result.compensated = Array.from(compensated);
        break;
      }
    }

    result.durationMs = Date.now() - overallStart;
    return result;
  }

  private async executeWithTimeout(step: SagaStep, ctx: SagaContext): Promise<StepResult> {
    const start = Date.now();
    try {
      const output = await Promise.race([
        step.handler(ctx),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Step ${step.name} timed out after ${step.timeoutMs}ms`)), step.timeoutMs)
        ),
      ]);

      return {
        step: step.name,
        success: true,
        output,
        durationMs: Date.now() - start,
      };
    } catch (_err) {
      return {
        step: step.name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      };
    }
  }
}

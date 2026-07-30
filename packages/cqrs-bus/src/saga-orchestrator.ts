import { SagaStep, SagaState, SagaContext } from './types';
import { createLogger } from '@ideia/logger';
import { CommandBus } from './command-bus';
const logger = createLogger('saga-orchestrator');

export class SagaStepError extends Error {
  stepName: string;
  constructor(stepName: string, cause: unknown) {
    super('Saga step "' + stepName + '" failed: ' + String(cause));
    this.name = 'SagaStepError';
    this.stepName = stepName;
  }
}

export class SagaFailedError extends Error {
  sagaId: string;
  executed: string[];
  compensated: string[];
  constructor(sagaId: string, executed: string[], compensated: string[], cause: unknown) {
    super('Saga ' + sagaId + ' failed after ' + executed.length + ' steps, ' + compensated.length + ' compensated: ' + String(cause));
    this.name = 'SagaFailedError';
    this.sagaId = sagaId;
    this.executed = executed;
    this.compensated = compensated;
  }
}

export class SagaOrchestrator {
  private _checkpoints: Map<string, SagaState> = new Map();

  constructor(private _commandBus: CommandBus) {}

  async execute(steps: SagaStep[], context: SagaContext): Promise<SagaState> {
    const executed: string[] = [];
    const compensated: string[] = [];

    try {
      for (const step of steps) {
        try {
          const maxRetries = step.retries ?? 1;
          let stepSuccess = false;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const result = await this._commandBus.dispatch(step.command);
              if (!result.success) throw new Error(result.error ?? 'Command failed');
              stepSuccess = true;
              break;
            } catch (err) {
              if (attempt === maxRetries) {
                if (step.onError === 'skip') {
                  stepSuccess = true;
                  break;
                }
                throw err;
              }
              await this._delay(1000 * Math.pow(2, attempt - 1));
            }
          }

          if (stepSuccess) executed.push(step.name);
        } catch (error) {
          if (step.onError === 'skip') {
            executed.push(step.name);
            continue;
          }
          throw new SagaStepError(step.name, error);
        }

        await this._checkpoint(context.id, executed, compensated);
      }

      const state: SagaState = { executed, compensated, status: 'completed', timestamp: Date.now() };
      await this._checkpoint(context.id, executed, compensated, 'completed');
      return state;
    } catch (error) {
      await this._compensate(steps, executed, context);
      compensated.push(
        ...executed.reverse().filter((name) => {
          const step = steps.find((s) => s.name === name);
          return step?.compensate != null;
        }),
      );
      throw new SagaFailedError(context.id, executed, compensated, error);
    }
  }

  async getSagaState(sagaId: string): Promise<SagaState | null> {
    return this._checkpoints.get(sagaId) ?? null;
  }

  async recoverSaga(sagaId: string, steps: SagaStep[]): Promise<SagaState> {
    const state = await this.getSagaState(sagaId);
    if (!state) throw new Error('Saga ' + sagaId + ' not found');
    if (state.status === 'completed') return state;
    const remaining = steps.filter((s) => !state.executed.includes(s.name));
    return this.execute(remaining, { id: sagaId, initiator: 'recovery', createdAt: Date.now() });
  }

  private async _compensate(steps: SagaStep[], executed: string[], _context: SagaContext): Promise<void> {
    for (const name of executed.reverse()) {
      const step = steps.find((s) => s.name === name);
      if (step?.compensate) {
        try {
          await this._commandBus.dispatch(step.compensate);
        } catch (compError) {
          logger.error('Compensation failed for step "' + name + '"', { compError });
        }
      }
    }
  }

  private async _checkpoint(sagaId: string, executed: string[], compensated: string[], status?: string): Promise<void> {
    this._checkpoints.set(sagaId, {
      executed,
      compensated: compensated,
      status: (status as SagaState['status']) ?? 'in_progress',
      timestamp: Date.now(),
    });
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

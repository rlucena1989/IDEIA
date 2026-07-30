import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import type {
  SagaDefinition,
  SagaInstance,
  SagaStatus,
  SagaStepResult,
} from './types-event-sourcing';

const log = createLogger('saga-coordinator');

export class SagaCoordinator {
  private instances: Map<string, SagaInstance> = new Map();

  begin(definition: SagaDefinition): SagaInstance {
    const instance: SagaInstance = {
      id: `saga-${randomUUID()}`,
      definitionId: definition.id,
      status: 'running',
      currentStep: 0,
      context: {},
      completedSteps: [],
      failedStep: null,
      startedAt: Date.now(),
      completedAt: null,
      error: null,
    };
    this.instances.set(instance.id, instance);
    log.info(`Saga ${instance.id} started for definition ${definition.id}`);
    return instance;
  }

  async executeStep(
    instanceId: string,
    definition: SagaDefinition,
  ): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance === undefined) {
      throw new Error(`Saga instance ${instanceId} not found`);
    }
    if (instance.status !== 'running') {
      throw new Error(`Saga instance ${instanceId} is not running (status: ${instance.status})`);
    }

    const actionSteps = definition.steps.filter((s) => s.type === 'action');

    while (instance.currentStep < actionSteps.length && instance.status === 'running') {
      const step = actionSteps[instance.currentStep];

      try {
        const stepResult = await this.executeWithTimeout(step, instance);
        if (stepResult.success) {
          instance.completedSteps.push(step.name);
          instance.currentStep += 1;
        } else {
          instance.status = 'failed';
          instance.failedStep = step.name;
          instance.error = stepResult.error;
          instance.completedAt = Date.now();
          log.error(`Saga ${instanceId} failed at step ${step.name}: ${stepResult.error}`);
          return;
        }
      } catch (error) {
        instance.status = 'failed';
        instance.failedStep = step.name;
        instance.error = error instanceof Error ? error.message : String(error);
        instance.completedAt = Date.now();
        log.error(`Saga ${instanceId} failed at step ${step.name}: ${instance.error}`);
        return;
      }
    }

    if (instance.status === 'running') {
      instance.status = 'completed';
      instance.completedAt = Date.now();
      log.info(`Saga ${instanceId} completed successfully`);
    }
  }

  async compensate(instanceId: string, definition: SagaDefinition): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance === undefined) {
      throw new Error(`Saga instance ${instanceId} not found`);
    }

    instance.status = 'compensating';
    const completedSteps = new Set(instance.completedSteps);
    const compensationSteps = definition.steps
      .filter((s) => s.type === 'compensation' && completedSteps.has(s.name))
      .reverse();

    for (const step of compensationSteps) {
      try {
        const result = await this.executeWithTimeout(step, instance);
        if (!result.success) {
          log.error(`Compensation step ${step.name} failed: ${result.error}`);
        }
      } catch (error) {
        log.error(`Compensation step ${step.name} threw: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    instance.status = 'compensated';
    instance.completedAt = Date.now();
    log.info(`Saga ${instanceId} compensated`);
  }

  getStatus(instanceId: string): SagaInstance | undefined {
    return this.instances.get(instanceId);
  }

  listActive(): SagaInstance[] {
    const activeStatuses: SagaStatus[] = ['running', 'compensating'];
    return Array.from(this.instances.values()).filter((i) =>
      activeStatuses.includes(i.status),
    );
  }

  private async executeWithTimeout(
    step: { handler: (context: Record<string, unknown>) => Promise<SagaStepResult>; timeout?: number },
    instance: SagaInstance,
  ): Promise<SagaStepResult> {
    const start = Date.now();
    const timeout = step.timeout ?? 30000;

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        (async () => {
          const res = await step.handler(instance.context);
          return res;
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Step timed out after ${timeout}ms`)), timeout);
        }),
      ]);
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      return {
        ...result,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      return {
        stepName: 'unknown',
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }
}

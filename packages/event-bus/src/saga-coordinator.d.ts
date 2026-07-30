import type { SagaDefinition, SagaInstance } from './types-event-sourcing';
export declare class SagaCoordinator {
    private instances;
    begin(definition: SagaDefinition): SagaInstance;
    executeStep(instanceId: string, definition: SagaDefinition): Promise<void>;
    compensate(instanceId: string, definition: SagaDefinition): Promise<void>;
    getStatus(instanceId: string): SagaInstance | undefined;
    listActive(): SagaInstance[];
    private executeWithTimeout;
}
//# sourceMappingURL=saga-coordinator.d.ts.map
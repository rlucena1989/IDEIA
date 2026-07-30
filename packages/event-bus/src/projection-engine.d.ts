import type { DomainEvent, IProjection, ProjectionResult } from './types-event-sourcing';
export declare class ProjectionEngine {
    private projections;
    register(projection: IProjection): void;
    process(events: DomainEvent[]): void;
    getState<TState>(name: string): TState | undefined;
    reset(name: string): void;
    getProjectionResult<TState>(name: string, eventsProcessed: number): ProjectionResult<TState> | undefined;
}
export interface AgentSessionState {
    sessionCount: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    agentSessions: Map<string, {
        started: number;
        completed?: number;
        status: string;
    }>;
}
export declare class AgentSessionProjection implements IProjection<AgentSessionState> {
    readonly name = "agent-sessions";
    private state;
    project(event: DomainEvent): void;
    getState(): AgentSessionState;
    reset(): void;
}
//# sourceMappingURL=projection-engine.d.ts.map
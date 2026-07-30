import type { DomainEvent, IProjection, ProjectionResult } from './types-event-sourcing';
import { createLogger } from '@ideia/logger';
const logger = createLogger('projection-engine');

export class ProjectionEngine {
  private projections: Map<string, IProjection> = new Map();

  register(projection: IProjection): void {
    this.projections.set(projection.name, projection);
  }

  process(events: DomainEvent[]): void {
    for (const event of events) {
      for (const projection of this.projections.values()) {
        projection.project(event);
      }
    }
  }

  getState<TState>(name: string): TState | undefined {
    const projection = this.projections.get(name);
    if (projection === undefined) {
      return undefined;
    }
    return projection.getState() as TState;
  }

  reset(name: string): void {
    const projection = this.projections.get(name);
    if (projection !== undefined) {
      projection.reset();
    }
  }

  getProjectionResult<TState>(name: string, eventsProcessed: number): ProjectionResult<TState> | undefined {
    const projection = this.projections.get(name);
    if (projection === undefined) {
      return undefined;
    }
    return {
      name: projection.name,
      state: projection.getState() as TState,
      eventsProcessed,
      duration: 0,
    };
  }
}

export interface AgentSessionState {
  sessionCount: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  agentSessions: Map<string, { started: number; completed?: number; status: string }>;
}

export class AgentSessionProjection implements IProjection<AgentSessionState> {
  readonly name = 'agent-sessions';
  private state: AgentSessionState = {
    sessionCount: 0,
    activeSessions: 0,
    completedSessions: 0,
    failedSessions: 0,
    agentSessions: new Map(),
  };

  project(event: DomainEvent): void {
    switch (event.type) {
      case 'decision_made': {
        const agentId = event.metadata.agentId;
        this.state.sessionCount += 1;
        this.state.activeSessions += 1;
        this.state.agentSessions.set(agentId, {
          started: event.metadata.timestamp,
          status: 'active',
        });
        break;
      }
      case 'decision_completed': {
        this.state.activeSessions = Math.max(0, this.state.activeSessions - 1);
        this.state.completedSessions += 1;
        const agentId = event.metadata.agentId;
        const existing = this.state.agentSessions.get(agentId);
        if (existing !== undefined) {
          this.state.agentSessions.set(agentId, {
            ...existing,
            completed: event.metadata.timestamp,
            status: 'completed',
          });
        }
        break;
      }
      case 'session_started': {
        const agentId = event.metadata.agentId;
        this.state.sessionCount += 1;
        this.state.activeSessions += 1;
        this.state.agentSessions.set(agentId, {
          started: event.metadata.timestamp,
          status: 'active',
        });
        break;
      }
      case 'session_ended': {
        this.state.activeSessions = Math.max(0, this.state.activeSessions - 1);
        const endedAgentId = event.metadata.agentId;
        const endedSession = this.state.agentSessions.get(endedAgentId);
        if (endedSession !== undefined) {
          const status = (event.data.status as string) ?? 'completed';
          if (status === 'failed') {
            this.state.failedSessions += 1;
          } else {
            this.state.completedSessions += 1;
          }
          this.state.agentSessions.set(endedAgentId, {
            ...endedSession,
            completed: event.metadata.timestamp,
            status,
          });
        }
        break;
      }
    }
  }

  getState(): AgentSessionState {
    return {
      sessionCount: this.state.sessionCount,
      activeSessions: this.state.activeSessions,
      completedSessions: this.state.completedSessions,
      failedSessions: this.state.failedSessions,
      agentSessions: new Map(this.state.agentSessions),
    };
  }

  reset(): void {
    this.state = {
      sessionCount: 0,
      activeSessions: 0,
      completedSessions: 0,
      failedSessions: 0,
      agentSessions: new Map(),
    };
  }
}

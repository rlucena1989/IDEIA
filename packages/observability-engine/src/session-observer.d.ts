import { Logger } from '@ideia/logger';
import { ObservabilityEngine } from './observability-engine';
export interface SessionInfo {
    sessionId: string;
    startedAt: string;
    endedAt?: string;
    durationMs?: number;
    commandCount: number;
    errorCount: number;
    commands: string[];
    errors: string[];
    metadata: Record<string, unknown>;
}
export declare class SessionObserver {
    private sessions;
    private engine;
    private logger;
    constructor(engine: ObservabilityEngine, logger?: Logger);
    onSessionCreated(sessionId: string, metadata?: Record<string, unknown>): void;
    onSessionCommand(sessionId: string, command: string): void;
    onSessionError(sessionId: string, error: string): void;
    onSessionEnd(sessionId: string): SessionInfo | undefined;
    getSession(sessionId: string): SessionInfo | undefined;
    getActiveSessions(): SessionInfo[];
    getSessionSummary(): {
        total: number;
        active: number;
        completed: number;
        totalCommands: number;
        totalErrors: number;
    };
    clear(): void;
}
export declare function createSessionObserver(engine: ObservabilityEngine): SessionObserver;
//# sourceMappingURL=session-observer.d.ts.map
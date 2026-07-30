import { createLogger, Logger } from '@ideia/logger';
import { DebugSession, TraceRecord } from './types-debugger';

export class AgentExecutionTracer {
  private traces = new Map<string, TraceRecord[]>();
  private sessions = new Map<string, DebugSession>();
  private logger: Logger;

  constructor() {
    this.logger = createLogger('AgentExecutionTracer');
  }

  registerSession(session: DebugSession): void {
    this.sessions.set(session.id, session);
  }

  record(sessionId: string, record: TraceRecord): void {
    const existing = this.traces.get(sessionId) ?? [];
    existing.push(record);
    this.traces.set(sessionId, existing);
  }

  getTrace(sessionId: string): TraceRecord[] {
    return this.traces.get(sessionId) ?? [];
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(): string[] {
    return Array.from(this.traces.keys());
  }

  clearSession(sessionId: string): void {
    this.traces.delete(sessionId);
    this.sessions.delete(sessionId);
  }
}

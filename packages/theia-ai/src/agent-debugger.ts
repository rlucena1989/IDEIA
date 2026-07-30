import { createLogger, Logger } from '@ideia/logger';
import { AgentExecutionTracer } from './agent-execution-tracer';
import { DebugSessionManager } from './debug-session-manager';
import { BreakpointManager } from './breakpoint-manager';
import {
  Breakpoint,
  BreakpointCondition,
  DebugEvent,
  DebugSession,
  DebugSessionConfig,
  ExecutionState,
  SessionSearchQuery,
  TraceRecord,
} from './types-debugger';

function generateId(): string {
  return 'dbg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

export class AgentDebugger {
  private currentStepIndex = new Map<string, number>();
  private events: DebugEvent[] = [];
  private logger: Logger;

  constructor(
    private tracer: AgentExecutionTracer,
    private sessionManager: DebugSessionManager,
    private breakpointManager: BreakpointManager,
  ) {
    this.logger = createLogger('AgentDebugger');
  }

  startSession(config: DebugSessionConfig): DebugSession {
    const session = this.sessionManager.createSession(config);
    this.tracer.registerSession(session);
    this.currentStepIndex.set(session.id, 0);
    return session;
  }

  stopSession(sessionId: string): DebugSession | undefined {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return undefined;
    this.sessionManager.updateSessionStatus(sessionId, 'completed');
    this.currentStepIndex.delete(sessionId);
    return session;
  }

  pauseSession(sessionId: string): boolean {
    return this.sessionManager.pauseSession(sessionId);
  }

  resumeSession(sessionId: string): boolean {
    return this.sessionManager.resumeSession(sessionId);
  }

  stepOver(sessionId: string): TraceRecord | undefined {
    const traces = this.tracer.getTrace(sessionId);
    const idx = this.currentStepIndex.get(sessionId) ?? 0;
    if (idx >= traces.length) return undefined;
    const record = traces[idx];
    this.currentStepIndex.set(sessionId, idx + 1);
    return record;
  }

  stepInto(sessionId: string): TraceRecord | undefined {
    return this.stepOver(sessionId);
  }

  addBreakpoint(sessionId: string, condition: BreakpointCondition): Breakpoint {
    return this.breakpointManager.addBreakpoint(sessionId, condition);
  }

  removeBreakpoint(breakpointId: string): boolean {
    return this.breakpointManager.removeBreakpoint(breakpointId);
  }

  getState(sessionId: string): ExecutionState | undefined {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return undefined;
    const traces = this.tracer.getTrace(sessionId);
    const idx = this.currentStepIndex.get(sessionId) ?? 0;
    const currentTrace = idx > 0 ? traces[idx - 1] : undefined;
    return {
      stepId: currentTrace?.stepId ?? '',
      agentId: session.agentId,
      status: session.status,
      variables: currentTrace?.state ?? {},
      context: {},
      history: traces,
    };
  }

  getTraces(sessionId: string, filters?: SessionSearchQuery): TraceRecord[] {
    let traces = this.tracer.getTrace(sessionId);
    if (!filters) return traces;
    if (filters.stepType) traces = traces.filter(t => t.type === filters.stepType);
    if (filters.status) traces = traces.filter(t => t.status === filters.status);
    if (filters.toolName) {
      traces = traces.filter(t => t.toolCalls.some(tc => tc.tool === filters.toolName));
    }
    if (filters.fromTime !== undefined) traces = traces.filter(t => t.timestamp >= filters.fromTime!);
    if (filters.toTime !== undefined) traces = traces.filter(t => t.timestamp <= filters.toTime!);
    if (filters.text) {
      const q = filters.text.toLowerCase();
      traces = traces.filter(t =>
        (t.thought && t.thought.toLowerCase().includes(q)) ||
        t.action.toLowerCase().includes(q) ||
        t.toolCalls.some(tc => tc.tool.toLowerCase().includes(q))
      );
    }
    if (filters.offset !== undefined) traces = traces.slice(filters.offset);
    if (filters.limit !== undefined) traces = traces.slice(0, filters.limit);
    return traces;
  }

  searchTraces(sessionId: string, query: string): TraceRecord[] {
    const q = query.toLowerCase();
    return this.tracer.getTrace(sessionId).filter(t =>
      (t.thought && t.thought.toLowerCase().includes(q)) ||
      t.action.toLowerCase().includes(q) ||
      t.toolCalls.some(tc => tc.tool.toLowerCase().includes(q)) ||
      t.llmCalls.some(lc => lc.model.toLowerCase().includes(q))
    );
  }

  replayTo(sessionId: string, targetStep: number): TraceRecord | undefined {
    const traces = this.tracer.getTrace(sessionId);
    const found = traces.find(t => t.stepNumber === targetStep);
    if (found) {
      this.currentStepIndex.set(sessionId, found.stepNumber);
    }
    return found;
  }

  exportTrace(sessionId: string, format: 'json' | 'html' | 'flamegraph'): string {
    const session = this.sessionManager.getSession(sessionId);
    const traces = this.tracer.getTrace(sessionId);

    if (format === 'json') {
      return JSON.stringify({ session: session ?? null, traces }, null, 2);
    }

    if (format === 'html') {
      const rows = traces.map(t =>
        `<tr><td>${t.stepNumber}</td><td>${t.type}</td><td>${t.action}</td><td>${t.status}</td><td>${t.duration}ms</td></tr>`
      ).join('\n');
      return `<!DOCTYPE html><html><head><title>Trace Export</title><style>body{font-family:monospace;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Session: ${sessionId}</h1><table><thead><tr><th>#</th><th>Type</th><th>Action</th><th>Status</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    }

    if (format === 'flamegraph') {
      const nodes = traces.map(t => ({
        name: `${t.type} #${t.stepNumber}`,
        value: t.duration,
        children: t.toolCalls.map(tc => ({
          name: tc.tool,
          value: tc.duration,
          children: [],
        })),
      }));
      return JSON.stringify({
        name: 'agent-execution',
        value: traces.reduce((sum, t) => sum + t.duration, 0),
        children: nodes,
      }, null, 2);
    }

    return '';
  }

  recordEvent(sessionId: string, event: DebugEvent): void {
    this.events.push(event);
  }

  getEvents(): DebugEvent[] {
    return this.events;
  }
}

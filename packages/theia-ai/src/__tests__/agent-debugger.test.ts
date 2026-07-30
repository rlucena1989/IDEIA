import { AgentDebugger } from '../agent-debugger';
import { AgentExecutionTracer } from '../agent-execution-tracer';
import { DebugSessionManager } from '../debug-session-manager';
import { BreakpointManager } from '../breakpoint-manager';
import {
  BreakpointCondition,
  DebugSessionConfig,
  TraceRecord,
} from '../types-debugger';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn().mockReturnThis(),
  }),
}));

function makeTrace(overrides: Partial<TraceRecord> & { sessionId: string; stepNumber: number }): TraceRecord {
  return {
    id: overrides.id ?? `tr-${overrides.stepNumber}`,
    sessionId: overrides.sessionId,
    stepId: overrides.stepId ?? `step-${overrides.stepNumber}`,
    stepNumber: overrides.stepNumber,
    type: overrides.type ?? 'execute',
    action: overrides.action ?? `action-${overrides.stepNumber}`,
    timestamp: overrides.timestamp ?? Date.now(),
    duration: overrides.duration ?? 100,
    status: overrides.status ?? 'completed',
    toolCalls: overrides.toolCalls ?? [],
    llmCalls: overrides.llmCalls ?? [],
    thought: overrides.thought,
    state: overrides.state,
    perfMetrics: overrides.perfMetrics,
  };
}

function makeConfig(overrides?: Partial<DebugSessionConfig>): DebugSessionConfig {
  return {
    captureThoughts: true,
    captureState: true,
    captureToolCalls: true,
    captureLLM: true,
    maxTraceRecords: 10000,
    breakOnError: false,
    maskSensitiveData: true,
    ...overrides,
  };
}

describe('AgentDebugger', () => {
  let tracer: AgentExecutionTracer;
  let sessionManager: DebugSessionManager;
  let breakpointManager: BreakpointManager;
  let debugger_: AgentDebugger;

  beforeEach(() => {
    tracer = new AgentExecutionTracer();
    sessionManager = new DebugSessionManager(10);
    breakpointManager = new BreakpointManager();
    debugger_ = new AgentDebugger(tracer, sessionManager, breakpointManager);
  });

  describe('session creation and lifecycle', () => {
    it('should create a session', () => {
      const session = debugger_.startSession(makeConfig());
      expect(session.id).toBeDefined();
      expect(session.status).toBe('running');
      expect(session.metrics.totalSteps).toBe(0);
    });

    it('should pause a session', () => {
      const session = debugger_.startSession(makeConfig());
      const paused = debugger_.pauseSession(session.id);
      expect(paused).toBe(true);
      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved?.status).toBe('paused');
    });

    it('should resume a paused session', () => {
      const session = debugger_.startSession(makeConfig());
      debugger_.pauseSession(session.id);
      const resumed = debugger_.resumeSession(session.id);
      expect(resumed).toBe(true);
      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved?.status).toBe('running');
    });

    it('should stop a session', () => {
      const session = debugger_.startSession(makeConfig());
      const stopped = debugger_.stopSession(session.id);
      expect(stopped).toBeDefined();
      expect(stopped?.status).toBe('completed');
    });

    it('should return false when pausing a non-existent session', () => {
      expect(debugger_.pauseSession('nonexistent')).toBe(false);
    });

    it('should return undefined when stopping a non-existent session', () => {
      expect(debugger_.stopSession('nonexistent')).toBeUndefined();
    });
  });

  describe('trace recording and retrieval', () => {
    it('should record and retrieve traces', () => {
      const session = debugger_.startSession(makeConfig());
      const trace = makeTrace({ sessionId: session.id, stepNumber: 1 });
      tracer.record(session.id, trace);
      const traces = debugger_.getTraces(session.id);
      expect(traces).toHaveLength(1);
      expect(traces[0].stepNumber).toBe(1);
    });

    it('should return empty array for session with no traces', () => {
      const traces = debugger_.getTraces('nosession');
      expect(traces).toEqual([]);
    });

    it('should filter traces by type', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, type: 'think' }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2, type: 'execute' }));
      const filtered = debugger_.getTraces(session.id, { stepType: 'execute' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('execute');
    });

    it('should filter traces by status', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, status: 'completed' }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2, status: 'failed' }));
      const filtered = debugger_.getTraces(session.id, { status: 'failed' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('failed');
    });

    it('should filter traces by text', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, action: 'readFile', thought: 'reading config' }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2, action: 'writeFile', thought: 'writing output' }));
      const filtered = debugger_.getTraces(session.id, { text: 'reading' });
      expect(filtered).toHaveLength(1);
    });

    it('should support offset and limit filters', () => {
      const session = debugger_.startSession(makeConfig());
      for (let i = 1; i <= 5; i++) {
        tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: i }));
      }
      const sliced = debugger_.getTraces(session.id, { offset: 2, limit: 2 });
      expect(sliced).toHaveLength(2);
      expect(sliced[0].stepNumber).toBe(3);
      expect(sliced[1].stepNumber).toBe(4);
    });
  });

  describe('breakpoint add/remove/evaluate', () => {
    it('should add a breakpoint', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'type', operator: 'eq', value: 'execute' };
      const bp = debugger_.addBreakpoint(session.id, condition);
      expect(bp.id).toBeDefined();
      expect(bp.enabled).toBe(true);
      expect(bp.condition.field).toBe('type');
    });

    it('should remove a breakpoint', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'type', operator: 'eq', value: 'execute' };
      const bp = debugger_.addBreakpoint(session.id, condition);
      const removed = debugger_.removeBreakpoint(bp.id);
      expect(removed).toBe(true);
      const list = breakpointManager.listBreakpoints(session.id);
      expect(list).toHaveLength(0);
    });

    it('should return false when removing non-existent breakpoint', () => {
      expect(debugger_.removeBreakpoint('nonexistent')).toBe(false);
    });

    it('should evaluate breakpoint condition step_type eq', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'type', operator: 'eq', value: 'think' };
      debugger_.addBreakpoint(session.id, condition);
      const matchingStep = makeTrace({ sessionId: session.id, stepNumber: 1, type: 'think' });
      const result = breakpointManager.evaluate(matchingStep, session.id);
      expect(result.matched).toBe(true);
    });

    it('should evaluate breakpoint condition step_number eq', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'stepNumber', operator: 'eq', value: 3 };
      debugger_.addBreakpoint(session.id, condition);
      const matchingStep = makeTrace({ sessionId: session.id, stepNumber: 3 });
      const result = breakpointManager.evaluate(matchingStep, session.id);
      expect(result.matched).toBe(true);
    });

    it('should evaluate breakpoint condition step_number gt', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'stepNumber', operator: 'gt', value: 2 };
      debugger_.addBreakpoint(session.id, condition);
      const matchingStep = makeTrace({ sessionId: session.id, stepNumber: 3 });
      const result = breakpointManager.evaluate(matchingStep, session.id);
      expect(result.matched).toBe(true);
    });

    it('should evaluate breakpoint condition with contains operator', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'action', operator: 'contains', value: 'read' };
      debugger_.addBreakpoint(session.id, condition);
      const matchingStep = makeTrace({ sessionId: session.id, stepNumber: 1, action: 'readFile' });
      const result = breakpointManager.evaluate(matchingStep, session.id);
      expect(result.matched).toBe(true);
    });

    it('should evaluate breakpoint condition with status eq failed', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'status', operator: 'eq', value: 'failed' };
      debugger_.addBreakpoint(session.id, condition);
      const matchingStep = makeTrace({ sessionId: session.id, stepNumber: 1, status: 'failed' });
      const result = breakpointManager.evaluate(matchingStep, session.id);
      expect(result.matched).toBe(true);
    });

    it('should not match when field does not match condition', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'type', operator: 'eq', value: 'think' };
      debugger_.addBreakpoint(session.id, condition);
      const step = makeTrace({ sessionId: session.id, stepNumber: 1, type: 'execute' });
      const result = breakpointManager.evaluate(step, session.id);
      expect(result.matched).toBe(false);
    });

    it('should disable breakpoint after maxHits reached', () => {
      const session = debugger_.startSession(makeConfig());
      const condition: BreakpointCondition = { field: 'type', operator: 'eq', value: 'execute' };
      const bp = debugger_.addBreakpoint(session.id, condition);
      bp.maxHits = 1;
      const step = makeTrace({ sessionId: session.id, stepNumber: 1 });
      breakpointManager.evaluate(step, session.id);
      const result = breakpointManager.evaluate(step, session.id);
      expect(result.matched).toBe(false);
    });
  });

  describe('step over and step into', () => {
    it('should step over traces in order', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1 }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2 }));
      const step1 = debugger_.stepOver(session.id);
      expect(step1?.stepNumber).toBe(1);
      const step2 = debugger_.stepOver(session.id);
      expect(step2?.stepNumber).toBe(2);
    });

    it('should return undefined when stepping over past the end', () => {
      const session = debugger_.startSession(makeConfig());
      expect(debugger_.stepOver(session.id)).toBeUndefined();
    });

    it('stepInto should behave like stepOver', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1 }));
      const step = debugger_.stepInto(session.id);
      expect(step?.stepNumber).toBe(1);
    });
  });

  describe('replay to target step', () => {
    it('should replay to a specific step number', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1 }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2 }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 3 }));
      const found = debugger_.replayTo(session.id, 2);
      expect(found).toBeDefined();
      expect(found?.stepNumber).toBe(2);
    });

    it('should return undefined when target step does not exist', () => {
      const session = debugger_.startSession(makeConfig());
      expect(debugger_.replayTo(session.id, 999)).toBeUndefined();
    });
  });

  describe('search traces by query', () => {
    it('should find traces matching text in thought', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, thought: 'analyzing requirements', action: 'analyze' }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2, thought: 'writing code', action: 'writeFile' }));
      const results = debugger_.searchTraces(session.id, 'analyzing');
      expect(results).toHaveLength(1);
    });

    it('should find traces matching text in action', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, action: 'readFile' }));
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 2, action: 'writeFile' }));
      const results = debugger_.searchTraces(session.id, 'readFile');
      expect(results).toHaveLength(1);
    });

    it('should find traces matching text in tool calls', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({
        sessionId: session.id,
        stepNumber: 1,
        toolCalls: [{ tool: 'readFile', input: {}, startTime: 0, endTime: 0, duration: 10, success: true }],
      }));
      const results = debugger_.searchTraces(session.id, 'readFile');
      expect(results).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, action: 'readFile' }));
      const results = debugger_.searchTraces(session.id, 'nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('export traces', () => {
    it('should export traces as JSON', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1 }));
      const exported = debugger_.exportTrace(session.id, 'json');
      const parsed = JSON.parse(exported);
      expect(parsed.session).toBeDefined();
      expect(parsed.traces).toHaveLength(1);
    });

    it('should export traces as HTML', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1 }));
      const exported = debugger_.exportTrace(session.id, 'html');
      expect(exported).toContain('<!DOCTYPE html>');
      expect(exported).toContain('<table>');
    });

    it('should export traces as flamegraph', () => {
      const session = debugger_.startSession(makeConfig());
      tracer.record(session.id, makeTrace({ sessionId: session.id, stepNumber: 1, duration: 150 }));
      const exported = debugger_.exportTrace(session.id, 'flamegraph');
      const parsed = JSON.parse(exported);
      expect(parsed.name).toBe('agent-execution');
      expect(parsed.children).toHaveLength(1);
    });

    it('should return empty string for nonexistent session', () => {
      const exported = debugger_.exportTrace('nosession', 'json');
      const parsed = JSON.parse(exported);
      expect(parsed.session).toBeNull();
      expect(parsed.traces).toEqual([]);
    });
  });

  describe('max sessions enforcement', () => {
    it('should throw when max sessions reached', () => {
      const manager = new DebugSessionManager(1);
      manager.createSession(makeConfig());
      expect(() => manager.createSession(makeConfig())).toThrow('Max active sessions');
    });

    it('should enforce max sessions by removing oldest', () => {
      const manager = new DebugSessionManager(3);
      manager.createSession(makeConfig());
      manager.createSession(makeConfig());
      const s3 = manager.createSession(makeConfig());
      manager.enforceMaxSessions(2);
      const active = manager.getActiveSessions();
      expect(active.length).toBeLessThanOrEqual(2);
      expect(manager.getSession(s3.id)).toBeDefined();
    });
  });

  describe('event recording', () => {
    it('should record debug events', () => {
      const session = debugger_.startSession(makeConfig());
      debugger_.recordEvent(session.id, {
        type: 'stepStarted',
        sessionId: session.id,
        stepId: 'step-1',
        payload: { stepNumber: 1 },
        timestamp: Date.now(),
      });
      expect(debugger_.getEvents()).toHaveLength(1);
    });
  });

  describe('getState', () => {
    it('should return execution state for active session', () => {
      const session = debugger_.startSession(makeConfig());
      const state = debugger_.getState(session.id);
      expect(state).toBeDefined();
      expect(state?.agentId).toBe('');
      expect(state?.status).toBe('running');
    });

    it('should return undefined for nonexistent session', () => {
      expect(debugger_.getState('nonexistent')).toBeUndefined();
    });
  });
});

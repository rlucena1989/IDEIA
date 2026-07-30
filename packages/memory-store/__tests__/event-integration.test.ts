import { MemoryStore } from '../src/memory-store';
import { DiagnosticsStore } from '../src/diagnostics-store';
import { BreakpointStore } from '../src/breakpoint-store';
import { DecisionAnalyzer } from '../src/decision-analyzer';
import { MemoryEventIntegration } from '../src/event-integration';

class FakeEventBus {
  public handlers = new Map<string, Array<(data: unknown) => void>>();
  public published: Array<{ topic: string; data: unknown }> = [];

  async publish(topic: string, data: unknown): Promise<void> {
    this.published.push({ topic, data });
  }

  subscribe(topic: string, handler: (data: unknown) => void): void {
    const existing = this.handlers.get(topic) ?? [];
    existing.push(handler);
    this.handlers.set(topic, existing);
  }

  emit(topic: string, data: unknown): void {
    const handlers = this.handlers.get(topic) ?? [];
    for (const h of handlers) {
      h(data);
    }
  }
}

describe('MemoryEventIntegration', () => {
  let memoryStore: MemoryStore;
  let diagnosticsStore: DiagnosticsStore;
  let breakpointStore: BreakpointStore;
  let decisionAnalyzer: DecisionAnalyzer;
  let integration: MemoryEventIntegration;
  let bus: FakeEventBus;

  beforeEach(() => {
    memoryStore = new MemoryStore();
    diagnosticsStore = new DiagnosticsStore();
    breakpointStore = new BreakpointStore();
    decisionAnalyzer = new DecisionAnalyzer();
    bus = new FakeEventBus();
    integration = new MemoryEventIntegration(memoryStore, diagnosticsStore, breakpointStore, decisionAnalyzer);
    integration.setEventBus(bus);
    integration.start();
  });

  it('handles lsp:diagnostic events', () => {
    bus.emit('lsp:diagnostic', {
      filePath: 'file:///test.ts',
      message: 'Missing semicolon',
      severity: 'error' as const,
      line: 5,
      column: 1,
    });
    expect(bus.published.some(p => p.topic === 'memory:store')).toBe(true);
  });

  it('handles dap:breakpoint events', () => {
    bus.emit('dap:breakpoint', {
      sessionId: 'debug-1',
      breakpoints: [{ line: 10, file: 'app.ts', enabled: true, id: 'bp-1' }],
      action: 'set' as const,
    });
    expect(bus.published.some(p => p.topic === 'memory:persist')).toBe(true);
  });

  it('handles chat:decision events', async () => {
    bus.emit('chat:decision', {
      decision: 'Use PostgreSQL for storage',
      context: 'Data persistence layer',
      outcome: 'accepted',
    });
    await new Promise(r => setTimeout(r, 50));
    expect(bus.published.some(p => p.topic === 'pattern:detect')).toBe(true);
  });

  it('handles memory:update events', async () => {
    bus.emit('memory:update', {
      id: 'mem-1',
      content: 'Updated content',
      category: 'general',
    });
    await new Promise(r => setTimeout(r, 50));
    expect(bus.published.some(p => p.topic === 'memory:persist')).toBe(true);
  });

  it('publishes diagnostics manually', async () => {
    await integration.publishDiagnostics('file.ts', [{ filePath: 'file.ts', line: 1, column: 0, message: 'error', severity: 'error', source: 'test', timestamp: new Date().toISOString() }]);
    expect(bus.published.some(p => p.topic === 'lsp:diagnostic')).toBe(true);
  });

  it('publishes breakpoints manually', async () => {
    await integration.publishBreakpoints('debug-1', [{ id: 'bp-1', filePath: 'app.ts', line: 5, enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
    expect(bus.published.some(p => p.topic === 'dap:breakpoint')).toBe(true);
  });

  it('publishes decisions manually', async () => {
    await integration.publishDecision('Use Redis cache', 'Performance optimization', 'accepted');
    expect(bus.published.some(p => p.topic === 'chat:decision')).toBe(true);
  });
});

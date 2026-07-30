import { createLogger } from '@ideia/logger';
import { MemoryStore, MemoryRecord } from './memory-store';
import { DiagnosticsStore, Diagnostic, DiagnosticSeverity } from './diagnostics-store';
import { BreakpointStore, Breakpoint } from './breakpoint-store';
import { DecisionAnalyzer} from './decision-analyzer';

const logger = createLogger('memory-store:event-integration');

export interface EventBusLike {
  publish(topic: string, data: unknown): Promise<void>;
  subscribe(topic: string, handler: (data: unknown) => void): void;
}

export class MemoryEventIntegration {
  private memoryStore: MemoryStore;
  private diagnosticsStore: DiagnosticsStore;
  private breakpointStore: BreakpointStore;
  private decisionAnalyzer: DecisionAnalyzer;
  private bus: EventBusLike | null = null;
  private running = false;

  constructor(
    memoryStore: MemoryStore,
    diagnosticsStore: DiagnosticsStore,
    breakpointStore: BreakpointStore,
    decisionAnalyzer: DecisionAnalyzer,
  ) {
    this.memoryStore = memoryStore;
    this.diagnosticsStore = diagnosticsStore;
    this.breakpointStore = breakpointStore;
    this.decisionAnalyzer = decisionAnalyzer;
  }

  setEventBus(bus: EventBusLike): void {
    this.bus = bus;
  }

  start(): void {
    if (this.running || !this.bus) return;
    this.running = true;
    logger.info('Memory event integration started');

    this.bus.subscribe('lsp:diagnostic', async (data: unknown) => {
      const payload = data as { filePath?: string; message?: string; severity?: DiagnosticSeverity; line?: number; column?: number; source?: string; code?: string };
      if (payload?.filePath) {
        this.diagnosticsStore.appendDiagnostic({
          filePath: payload.filePath,
          line: payload.line ?? 0,
          column: payload.column ?? 0,
          message: payload.message ?? '',
          severity: payload.severity ?? 'warning',
          source: payload.source,
          code: payload.code,
          timestamp: new Date().toISOString(),
        });
        logger.debug('LSP diagnostic stored', { uri: payload.filePath, message: payload.message });
        await this.bus?.publish('memory:store', { type: 'lsp_diagnostics', uri: payload.filePath });
      }
    });

    this.bus.subscribe('dap:breakpoint', async (data: unknown) => {
      const payload = data as { breakpoints?: Breakpoint[]; action?: 'set' | 'clear' };
      if (payload?.breakpoints) {
        if (payload.action === 'clear') {
          for (const bp of payload.breakpoints) {
            this.breakpointStore.removeBreakpoint(bp.id);
          }
        } else {
          for (const bp of payload.breakpoints) {
            this.breakpointStore.addBreakpoint(bp);
          }
        }
        logger.debug('DAP breakpoints stored', { count: payload.breakpoints.length });
        await this.bus?.publish('memory:persist', { type: 'dap_breakpoints' });
      }
    });

    this.bus.subscribe('chat:decision', async (data: unknown) => {
      const payload = data as { decision?: string; context?: string; outcome?: string };
      if (payload?.decision) {
        const record: MemoryRecord = {
          memoryId: `decision_${Date.now()}`,
          category: 'decision',
          source: 'event-integration',
          summary: payload.decision,
          tags: ['decision', 'chat'],
          createdAt: new Date().toISOString(),
        };
        this.memoryStore.append(record);
        this.decisionAnalyzer.recordDecision({
          text: payload.decision,
          action: payload.outcome ?? 'pending',
          source: 'event-integration',
          confidence: 0.5,
        });
        const analysis = this.decisionAnalyzer.analyze();
        await this.bus?.publish('pattern:detect', { type: 'decision_pattern', patterns: analysis.patterns });
        logger.debug('Chat decision stored and analyzed', { patterns: analysis.patterns.length });
      }
    });

    this.bus.subscribe('memory:update', async (data: unknown) => {
      const payload = data as { id?: string; content?: string; category?: string };
      if (payload?.id) {
        const record: MemoryRecord = {
          memoryId: payload.id,
          category: (payload.category ?? 'change') as MemoryRecord['category'],
          source: 'event-integration',
          summary: payload.content ?? '',
          tags: ['memory-update'],
          createdAt: new Date().toISOString(),
        };
        this.memoryStore.append(record);
        await this.bus?.publish('memory:persist', { type: 'memory_update', id: payload.id });
      }
    });
  }

  stop(): void {
    this.running = false;
    logger.info('Memory event integration stopped');
  }

  async publishDiagnostics(uri: string, diagnostics: Diagnostic[]): Promise<void> {
    if (this.bus) {
      await this.bus.publish('lsp:diagnostic', { uri, diagnostics });
    }
  }

  async publishBreakpoints(sessionId: string, breakpoints: Breakpoint[], action?: 'set' | 'clear'): Promise<void> {
    if (this.bus) {
      await this.bus.publish('dap:breakpoint', { sessionId, breakpoints, action });
    }
  }

  async publishDecision(decision: string, context?: string, outcome?: string): Promise<void> {
    if (this.bus) {
      await this.bus.publish('chat:decision', { decision, context, outcome });
    }
  }
}

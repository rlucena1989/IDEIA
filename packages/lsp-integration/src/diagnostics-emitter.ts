import type { IEventBus } from '@ideia/event-bus';
import { createLogger } from '@ideia/logger';

const log = createLogger('lsp:diagnostics-emitter');

export interface LspDiagnostic {
  filePath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'information' | 'hint';
  source?: string;
  code?: string;
}

export interface DiagnosticBatch {
  uri: string;
  diagnostics: LspDiagnostic[];
}

export interface DiagnosticsEmitterConfig {
  eventBus?: IEventBus;
  batchIntervalMs?: number;
}

export class DiagnosticsEmitter {
  private eventBus: IEventBus | null;
  private batchIntervalMs: number;
  private pendingBatches: Map<string, LspDiagnostic[]> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: DiagnosticsEmitterConfig) {
    this.eventBus = config?.eventBus ?? null;
    this.batchIntervalMs = config?.batchIntervalMs ?? 1000;
  }

  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), this.batchIntervalMs);
    log.info('DiagnosticsEmitter started', { batchIntervalMs: this.batchIntervalMs });
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    log.info('DiagnosticsEmitter stopped');
  }

  onDiagnostics(uri: string, diagnostics: LspDiagnostic[]): void {
    const normalized = uri.replace(/\\/g, '/');

    if (diagnostics.length === 0) {
      this.pendingBatches.set(normalized, []);
    } else {
      this.pendingBatches.set(normalized, diagnostics);
    }

    if (this.eventBus && diagnostics.length > 0) {
      for (const diag of diagnostics.slice(0, 50)) {
        this.eventBus.emit({
          type: 'lsp:diagnostic',
          source: 'lsp-integration',
          payload: {
            filePath: normalized,
            line: diag.line,
            column: diag.column,
            message: diag.message,
            severity: diag.severity,
            source: diag.source,
            code: diag.code,
          },
          metadata: { timestamp: new Date().toISOString() },
        }).catch(() => {});
      }
    }
  }

  flush(): void {
    if (this.pendingBatches.size === 0 || !this.eventBus) return;

    const batches = Array.from(this.pendingBatches.entries());
    this.pendingBatches.clear();

    const totalDiagnostics = batches.reduce((sum, [, diags]) => sum + diags.length, 0);
    if (totalDiagnostics === 0) return;

    this.eventBus.emit({
      type: 'lsp:diagnostics-batch',
      source: 'lsp-integration',
      payload: {
        files: batches.length,
        totalDiagnostics,
        batches: batches.map(([uri, diags]) => ({ uri, count: diags.length })),
      },
      metadata: { timestamp: new Date().toISOString() },
    }).catch(() => {});

    for (const [uri, diagnostics] of batches) {
      const errorCount = diagnostics.filter(d => d.severity === 'error').length;
      const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
      log.info('LSP diagnostics batch', { uri, total: diagnostics.length, errors: errorCount, warnings: warningCount });
    }
  }
}

export function createDiagnosticsEmitter(config?: DiagnosticsEmitterConfig): DiagnosticsEmitter {
  return new DiagnosticsEmitter(config);
}

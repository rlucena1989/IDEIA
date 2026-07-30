import { DiagnosticsEmitter, createDiagnosticsEmitter } from './diagnostics-emitter';
import type { IEventBus } from '@ideia/event-bus';
import type { LspDiagnostic } from './diagnostics-emitter';

jest.mock('@ideia/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

function createMockEventBus(): IEventBus {
  return {
    emit: jest.fn().mockResolvedValue({ id: '1', type: 'test', timestamp: '', source: 'test' }),
    subscribe: jest.fn().mockResolvedValue('sub-1'),
    subscribeOnce: jest.fn().mockResolvedValue('sub-1'),
    unsubscribe: jest.fn().mockResolvedValue(true),
    getHistory: jest.fn().mockResolvedValue([]),
    clearHistory: jest.fn().mockResolvedValue(undefined),
    subscriberCount: jest.fn().mockResolvedValue(0),
  } as IEventBus;
}

function diag(overrides?: Partial<LspDiagnostic>): LspDiagnostic {
  return {
    filePath: 'file.ts',
    line: 1,
    column: 1,
    message: 'test diagnostic',
    severity: 'error',
    ...overrides,
  };
}

describe('DiagnosticsEmitter', () => {
  let eventBus: jest.Mocked<IEventBus>;
  let emitter: DiagnosticsEmitter;

  beforeEach(() => {
    jest.useFakeTimers();
    eventBus = createMockEventBus() as any;
    emitter = new DiagnosticsEmitter({ eventBus, batchIntervalMs: 1000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should emit individual diagnostics via event bus on onDiagnostics', async () => {
    emitter.onDiagnostics('file.ts', [diag({ message: 'oops', severity: 'error' })]);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lsp:diagnostic',
        payload: expect.objectContaining({ filePath: 'file.ts', message: 'oops', severity: 'error' }),
      }),
    );
  });

  it('should normalize URI backslashes to forward slashes', () => {
    emitter.onDiagnostics('C:\\project\\file.ts', [diag()]);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ filePath: 'C:/project/file.ts' }),
      }),
    );
  });

  it('should clear pending diagnostics when empty array is passed', () => {
    emitter.onDiagnostics('file.ts', [diag({ message: 'first' })]);
    emitter.onDiagnostics('file.ts', []);
    emitter.flush();
    expect(eventBus.emit).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lsp:diagnostics-batch' }),
    );
  });

  it('should flush diagnostics in batch and include summary', () => {
    emitter.onDiagnostics('a.ts', [diag({ severity: 'error' }), diag({ severity: 'warning' })]);
    emitter.onDiagnostics('b.ts', [diag({ severity: 'error' })]);
    emitter.flush();

    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lsp:diagnostics-batch',
        payload: expect.objectContaining({ files: 2, totalDiagnostics: 3 }),
      }),
    );
  });

  it('should not flush when there are no pending batches', () => {
    emitter.flush();
    expect(eventBus.emit).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lsp:diagnostics-batch' }),
    );
  });

  it('should not flush when eventBus is not set', () => {
    const noBus = new DiagnosticsEmitter();
    noBus.onDiagnostics('f.ts', [diag()]);
    expect(() => noBus.flush()).not.toThrow();
  });

  it('should start periodic flushing and stop it', () => {
    emitter.start();
    expect(emitter['flushTimer']).not.toBeNull();

    emitter.onDiagnostics('f.ts', [diag()]);
    jest.advanceTimersByTime(1000);
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lsp:diagnostics-batch' }),
    );

    emitter.stop();
    expect(emitter['flushTimer']).toBeNull();
  });

  it('should not start multiple timers', () => {
    emitter.start();
    const firstTimer = emitter['flushTimer'];
    emitter.start();
    expect(emitter['flushTimer']).toBe(firstTimer);
  });

  it('should flush on stop before clearing timer', () => {
    emitter.onDiagnostics('f.ts', [diag()]);
    emitter.stop();
    expect(eventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'lsp:diagnostics-batch' }),
    );
  });

  it('should set event bus after construction', () => {
    const noBus = new DiagnosticsEmitter();
    noBus.setEventBus(eventBus);
    noBus.onDiagnostics('f.ts', [diag()]);
    expect(eventBus.emit).toHaveBeenCalled();
  });

  it('should limit live emission to first 50 diagnostics per URI', () => {
    const manyDiags: LspDiagnostic[] = Array.from({ length: 100 }, (_, i) =>
      diag({ message: `diag ${i}`, line: i + 1 }),
    );
    emitter.onDiagnostics('f.ts', manyDiags);
    expect(eventBus.emit).toHaveBeenCalledTimes(50);
  });

  it('should be creatable via factory function', () => {
    const created = createDiagnosticsEmitter({ eventBus });
    expect(created).toBeInstanceOf(DiagnosticsEmitter);
  });

  it('should not crash when eventBus.emit rejects', async () => {
    eventBus.emit.mockRejectedValue(new Error('bus error'));
    emitter.onDiagnostics('f.ts', [diag()]);
    expect(eventBus.emit).toHaveBeenCalled();
  });
});

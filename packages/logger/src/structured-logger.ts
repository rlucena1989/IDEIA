import { LogLevel, Logger, createLogger } from './index';

export interface StructuredLogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
  traceId?: string;
  spanId?: string;
  durationMs?: number;
  error?: { message: string; stack?: string };
  metadata: Record<string, unknown>;
}

export interface StructuredLoggerOptions {
  minLevel?: LogLevel;
  outputJson?: boolean;
  traceId?: string;
  spanId?: string;
  module?: string;
}

export class StructuredLogger implements Logger {
  private options: Required<StructuredLoggerOptions>;

  constructor(options?: StructuredLoggerOptions) {
    this.options = {
      minLevel: options?.minLevel ?? LogLevel.INFO,
      outputJson: options?.outputJson ?? true,
      traceId: options?.traceId ?? '',
      spanId: options?.spanId ?? '',
      module: options?.module ?? 'root',
    };
  }

  private write(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (level < this.options.minLevel) return;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      module: this.options.module,
      message: msg,
      metadata: meta ?? {},
    };

    if (this.options.traceId) entry.traceId = this.options.traceId;
    if (this.options.spanId) entry.spanId = this.options.spanId;

    if (level >= LogLevel.ERROR && meta?.error) {
      const err = meta.error as Error;
      entry.error = { message: err.message, stack: err.stack };
    }

    if (meta?.durationMs) {
      entry.durationMs = meta.durationMs as number;
    }

    const output = this.options.outputJson ? JSON.stringify(entry) : this.formatText(entry);

    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private formatText(entry: StructuredLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      `[${entry.module}]`,
      entry.message,
    ];
    if (entry.traceId) parts.push(`trace=${entry.traceId}`);
    if (entry.durationMs) parts.push(`dur=${entry.durationMs}ms`);
    return parts.join(' ');
  }

  debug(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.DEBUG, msg, meta); }
  info(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.INFO, msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.WARN, msg, meta); }
  error(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.ERROR, msg, meta); }
  fatal(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.FATAL, msg, meta); }

  child(module: string): Logger {
    return new StructuredLogger({
      ...this.options,
      module: `${this.options.module}:${module}`,
    });
  }

  withTrace(traceId: string, spanId?: string): StructuredLogger {
    return new StructuredLogger({
      ...this.options,
      traceId,
      spanId: spanId ?? traceId,
    });
  }

  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }

  setOutputJson(enabled: boolean): void {
    this.options.outputJson = enabled;
  }
}

export function createStructuredLogger(module?: string): StructuredLogger {
  return new StructuredLogger({ module });
}

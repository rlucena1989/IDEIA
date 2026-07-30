import { ILogger, LogEntry, LogLevel, LoggerConfig, LOG_LEVEL_NAMES } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('backend-logging');

export class DefaultLogger implements ILogger {
  private config: LoggerConfig;
  private _correlationId?: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level ?? LogLevel.INFO,
      enableConsole: config?.enableConsole ?? true,
      enableFile: config?.enableFile ?? false,
    };
    this._correlationId = config?.correlationId;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  fatal(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, meta);
  }

  setCorrelationId(id: string): void {
    this._correlationId = id;
  }

  getCorrelationId(): string | undefined {
    return this._correlationId;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this._correlationId,
      metadata: meta,
    };

    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${LOG_LEVEL_NAMES[entry.level]}]`;
    const corr = entry.correlationId ? ` [${entry.correlationId}]` : '';
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    const line = `${prefix}${corr} ${entry.message}${meta}`;

    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(line);
        break;
      case LogLevel.WARN:
        console.warn(line);
        break;
      default:
        logger.info(line);
    }
  }
}

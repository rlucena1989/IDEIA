export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  fatal(msg: string, meta?: Record<string, unknown>): void;
  child(module: string): Logger;
}

interface LogEntry {
  level: LogLevel;
  levelName: string;
  timestamp: string;
  module: string;
  message: string;
  meta?: Record<string, unknown>;
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

function toLogLevel(env?: string): LogLevel {
  switch (env?.toLowerCase()) {
    case 'debug': return LogLevel.DEBUG;
    case 'warn': return LogLevel.WARN;
    case 'error': return LogLevel.ERROR;
    case 'fatal': return LogLevel.FATAL;
    default: return LogLevel.INFO;
  }
}

class ConsoleLogger implements Logger {
  private level: LogLevel;
  private module: string;

  constructor(module = 'root', level?: LogLevel) {
    this.level = level ?? toLogLevel(
      typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined
    );
    this.module = module;
  }

  private write(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (level < this.level) return;
    const entry: LogEntry = {
      level,
      levelName: LEVEL_NAMES[level],
      timestamp: new Date().toISOString(),
      module: this.module,
      message: msg,
      meta,
    };
    const formatted = `[${entry.timestamp}] [${entry.levelName}] [${entry.module}] ${entry.message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    switch (level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.DEBUG, msg, meta); }
  info(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.INFO, msg, meta); }
  warn(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.WARN, msg, meta); }
  error(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.ERROR, msg, meta); }
  fatal(msg: string, meta?: Record<string, unknown>): void { this.write(LogLevel.FATAL, msg, meta); }

  child(module: string): Logger {
    return new ConsoleLogger(`${this.module}:${module}`, this.level);
  }
}

let rootLogger: Logger = new ConsoleLogger();
let loggerLocked = false;

export function setLogger(logger: Logger): void {
  if (loggerLocked) {
    console.warn('[logger] setLogger ignored — logger is locked');
    return;
  }
  rootLogger = logger;
}

export function lockLogger(): void {
  loggerLocked = true;
}

export function getLogger(): Logger {
  return rootLogger;
}

export function createLogger(module = 'root'): Logger {
  return new ConsoleLogger(module);
}

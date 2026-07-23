export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}
export interface Logger {
    debug(msg: string, meta?: Record<string, unknown>): void;
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    fatal(msg: string, meta?: Record<string, unknown>): void;
    child(module: string): Logger;
}
export declare function setLogger(logger: Logger): void;
export declare function lockLogger(): void;
export declare function getLogger(): Logger;
export declare function createLogger(module?: string): Logger;
//# sourceMappingURL=index.d.ts.map
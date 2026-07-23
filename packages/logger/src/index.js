"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
exports.setLogger = setLogger;
exports.lockLogger = lockLogger;
exports.getLogger = getLogger;
exports.createLogger = createLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const LEVEL_NAMES = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL',
};
function toLogLevel(env) {
    switch (env?.toLowerCase()) {
        case 'debug': return LogLevel.DEBUG;
        case 'warn': return LogLevel.WARN;
        case 'error': return LogLevel.ERROR;
        case 'fatal': return LogLevel.FATAL;
        default: return LogLevel.INFO;
    }
}
class ConsoleLogger {
    level;
    module;
    constructor(module = 'root', level) {
        this.level = level ?? toLogLevel(typeof process !== 'undefined' ? process.env?.LOG_LEVEL : undefined);
        this.module = module;
    }
    write(level, msg, meta) {
        if (level < this.level)
            return;
        const entry = {
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
    debug(msg, meta) { this.write(LogLevel.DEBUG, msg, meta); }
    info(msg, meta) { this.write(LogLevel.INFO, msg, meta); }
    warn(msg, meta) { this.write(LogLevel.WARN, msg, meta); }
    error(msg, meta) { this.write(LogLevel.ERROR, msg, meta); }
    fatal(msg, meta) { this.write(LogLevel.FATAL, msg, meta); }
    child(module) {
        return new ConsoleLogger(`${this.module}:${module}`, this.level);
    }
}
let rootLogger = new ConsoleLogger();
let loggerLocked = false;
function setLogger(logger) {
    if (loggerLocked) {
        console.warn('[logger] setLogger ignored — logger is locked');
        return;
    }
    rootLogger = logger;
}
function lockLogger() {
    loggerLocked = true;
}
function getLogger() {
    return rootLogger;
}
function createLogger(module = 'root') {
    return new ConsoleLogger(module);
}
//# sourceMappingURL=index.js.map
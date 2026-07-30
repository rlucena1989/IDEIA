"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoFixer = void 0;
const logger_1 = require("@ideia/logger");
class AutoFixer {
    logger;
    attempts = new Map();
    fixPatterns = [];
    maxAttempts;
    constructor(maxAttempts = 3, logger) {
        this.maxAttempts = maxAttempts;
        this.logger = logger ?? (0, logger_1.createLogger)('AutoFixer');
        this.initializePatterns();
    }
    async analyzeFailure(failure, _code) {
        this.logger.info('Analyzing CI failure', { prId: failure.prId });
        const attempt = this.attempts.get(failure.prId) ?? 0;
        const errorType = this.classifyFailure(failure);
        return {
            type: errorType,
            description: `Auto-fix attempt ${attempt + 1} for ${errorType} error`,
            files: [],
            attempt: attempt + 1,
        };
    }
    async applyFix(fixPlan) {
        this.logger.info('Applying fix', { type: fixPlan.type, attempt: fixPlan.attempt });
        const prId = 'current';
        const currentAttempts = (this.attempts.get(prId) ?? 0) + 1;
        this.attempts.set(prId, currentAttempts);
        if (currentAttempts > this.maxAttempts) {
            return {
                success: false,
                attempt: currentAttempts,
                description: fixPlan.description,
                error: `Max attempts (${this.maxAttempts}) exceeded`,
                appliedFixes: [],
            };
        }
        return {
            success: true,
            attempt: currentAttempts,
            description: fixPlan.description,
            appliedFixes: fixPlan.files.map((f) => f.path),
        };
    }
    async retryCI(_prId) {
        this.logger.info('Retrying CI');
        return {
            prId: _prId,
            status: 'running',
            checks: [],
            url: '',
            startedAt: new Date().toISOString(),
        };
    }
    learnFromFailure(failure, _fix) {
        this.logger.info('Learning from failure pattern', { type: failure.type });
        const exists = this.fixPatterns.some((p) => p.pattern === failure.pattern && p.type === failure.type);
        if (!exists) {
            this.fixPatterns.push(failure);
        }
    }
    getFixPatterns() {
        return [...this.fixPatterns];
    }
    resetAttempts() {
        this.attempts.clear();
    }
    initializePatterns() {
        this.fixPatterns = [
            {
                type: 'compilation',
                pattern: 'TS\\d+.*error',
                description: 'TypeScript compilation error detected',
                suggestion: 'Fix type annotations and imports',
            },
            {
                type: 'lint',
                pattern: 'eslint.*error',
                description: 'ESLint violation detected',
                suggestion: 'Auto-fix with eslint --fix',
            },
            {
                type: 'test',
                pattern: 'FAIL.*|.*AssertionError.*',
                description: 'Test failure detected',
                suggestion: 'Verify test assertions match implementation',
            },
            {
                type: 'dependency',
                pattern: 'ERR_PACKAGE_PATH_NOT_EXPORTED|MODULE_NOT_FOUND',
                description: 'Dependency resolution error',
                suggestion: 'Install missing dependency or fix import path',
            },
        ];
    }
    classifyFailure(status) {
        const allLogs = status.checks
            .filter((c) => c.status === 'failed')
            .map((c) => c.description)
            .join(' ');
        if (/TS\d+/.test(allLogs))
            return 'compilation';
        if (/eslint/.test(allLogs))
            return 'lint';
        if (/FAIL|AssertionError/.test(allLogs))
            return 'test';
        if (/coverage.*threshold/.test(allLogs))
            return 'coverage';
        if (/MODULE_NOT_FOUND/.test(allLogs))
            return 'dependency';
        if (/timeout/.test(allLogs))
            return 'infrastructure';
        return 'compilation';
    }
}
exports.AutoFixer = AutoFixer;
//# sourceMappingURL=auto-fixer.js.map
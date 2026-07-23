"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_QUALITY_GATES = void 0;
exports.runCommand = runCommand;
exports.runStep = runStep;
exports.runWithRetry = runWithRetry;
const node_child_process_1 = require("node:child_process");
exports.DEFAULT_QUALITY_GATES = [
    { name: 'lint', command: 'npx', args: ['eslint', '.', '--max-warnings=0'], timeout: 60000, required: false },
    { name: 'test', command: 'npx', args: ['jest', '--passWithNoTests'], timeout: 120000, required: false },
    { name: 'build', command: 'npx', args: ['tsc', '--noEmit'], timeout: 60000, required: true },
    { name: 'security', command: 'npm', args: ['audit', '--audit-level=high'], timeout: 30000, required: false },
    { name: 'architecture', command: 'npx', args: ['tsc', '-b', '--dry'], timeout: 60000, required: false },
];
function runCommand(config) {
    const start = Date.now();
    try {
        const output = (0, node_child_process_1.execFileSync)(config.command, config.args ?? [], {
            cwd: config.cwd ?? process.cwd(),
            encoding: 'utf-8',
            timeout: config.timeout ?? 60000,
            stdio: 'pipe',
        });
        return {
            success: true,
            output: output.trim(),
            code: 0,
            durationMs: Date.now() - start,
        };
    }
    catch (e) {
        const err = e;
        return {
            success: false,
            output: err.stdout?.toString().trim() || err.stderr?.toString().trim() || err.message || '',
            code: err.status ?? 1,
            durationMs: Date.now() - start,
        };
    }
}
async function runStep(name, fn) {
    const start = Date.now();
    try {
        const result = await fn();
        return { step: name, success: true, durationMs: Date.now() - start, result };
    }
    catch (err) {
        return { step: name, success: false, durationMs: Date.now() - start, error: String(err) };
    }
}
async function runWithRetry(name, fn, maxRetries = 3, timeoutMs = 30000) {
    const start = Date.now();
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)),
            ]);
            return { success: true, result, attempts: attempt, durationMs: Date.now() - start };
        }
        catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
        }
    }
    return { success: false, attempts: maxRetries, durationMs: Date.now() - start, error: lastError };
}
//# sourceMappingURL=command-runner.js.map
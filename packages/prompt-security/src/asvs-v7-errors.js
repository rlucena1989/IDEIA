"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV7_1_1 = checkV7_1_1;
exports.checkV7_1_2 = checkV7_1_2;
exports.checkV7_2_1 = checkV7_2_1;
exports.checkV7_3_1 = checkV7_3_1;
exports.checkV7_4_1 = checkV7_4_1;
exports.checkV7_5_1 = checkV7_5_1;
exports.checkV7_6_1 = checkV7_6_1;
exports.runAllV7Checks = runAllV7Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v7-errors');
const CATEGORY = 'V7';
function scanFilesForPattern(rootDir, pattern, maxResults = 5) {
    const results = [];
    function walk(dir) {
        if (results.length >= maxResults)
            return;
        try {
            for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
                if (results.length >= maxResults)
                    return;
                const full = node_path_1.default.join(dir, entry.name);
                if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    walk(full);
                }
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx'))) {
                    try {
                        const content = node_fs_1.default.readFileSync(full, 'utf8');
                        const match = content.match(pattern);
                        if (match) {
                            const relative = node_path_1.default.relative(rootDir, full);
                            results.push(`${relative}: ${match[0].slice(0, 100)}`);
                        }
                    }
                    catch {
                    }
                }
            }
        }
        catch {
        }
    }
    walk(rootDir);
    return results;
}
function checkV7_1_1(rootDir) {
    const unhandledPatterns = scanFilesForPattern(rootDir, /(process\.on\(['"]unhandledRejection['"]\)|process\.on\(['"]uncaughtException['"]\)|process\.once\(['"]unhandledRejection|process\.once\(['"]uncaughtException)/i);
    const catchAllPatterns = scanFilesForPattern(rootDir, /(app\.use\(.*error|app\.all\(.*error|errorHandler|errorMiddleware|globalErrorHandler|GlobalExceptionFilter|ExceptionFilter|catch\(.*error)/i);
    const expressError = scanFilesForPattern(rootDir, /(function.*error.*handler|middleware.*error|error.*middleware|ErrorRequestHandler)/i);
    const passed = unhandledPatterns.length > 0 || catchAllPatterns.length > 0 || expressError.length > 0;
    const evidence = [];
    if (unhandledPatterns.length > 0)
        evidence.push(`Unhandled rejection/exception handlers: ${unhandledPatterns.slice(0, 3).join(', ')}`);
    if (catchAllPatterns.length > 0)
        evidence.push(`Error-catching middleware: ${catchAllPatterns.slice(0, 3).join(', ')}`);
    if (expressError.length > 0)
        evidence.push(`Express error handlers: ${expressError.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No global error handlers for unhandled rejections detected');
    return {
        id: '7.1.1',
        name: 'Verify unhandled promise rejections are caught globally',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV7_1_2(rootDir) {
    const stackLeakPrevention = scanFilesForPattern(rootDir, /(stack.*trace|NODE_ENV.*production|node_env.*production|showStack|showMessage|includeStackTrace|hideErrorDetails)/i);
    const customErrorPages = scanFilesForPattern(rootDir, /(error.*page|error.*template|error.*view|404.*page|500.*page|notFound.*handler|not_found)/i);
    const errorResponse = scanFilesForPattern(rootDir, /(status\((\d{3})\).*json|status\((\d{3})\).*send|res\.status.*json.*error|errorResponse|ErrorResponse)/i);
    const passed = stackLeakPrevention.length > 0 || customErrorPages.length > 0 || errorResponse.length > 0;
    const evidence = [];
    if (stackLeakPrevention.length > 0)
        evidence.push(`Stack trace prevention: ${stackLeakPrevention.slice(0, 3).join(', ')}`);
    if (customErrorPages.length > 0)
        evidence.push(`Custom error pages: ${customErrorPages.slice(0, 3).join(', ')}`);
    if (errorResponse.length > 0)
        evidence.push(`Structured error responses: ${errorResponse.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No stack trace leakage prevention or custom error pages detected');
    return {
        id: '7.1.2',
        name: 'Verify HTTP error pages do not leak stack traces',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV7_2_1(rootDir) {
    const errorLogPatterns = scanFilesForPattern(rootDir, /(error.*log|log.*error|console\.error|logger\.error|logger\.warn|winston|pino|log4js|bunyan|debug|logLevel)/i);
    const sensitiveFilterPatterns = scanFilesForPattern(rootDir, /(redact|sanitize.*log|clean.*log|filter.*sensitive|remove.*sensitive|strip.*sensitive|mask.*log|pino.*redact|winston.*redact|log.*password|log.*token|log.*secret)/i);
    const passed = errorLogPatterns.length > 0 && sensitiveFilterPatterns.length > 0;
    const evidence = [];
    if (errorLogPatterns.length > 0)
        evidence.push(`Error logging: ${errorLogPatterns.slice(0, 3).join(', ')}`);
    if (sensitiveFilterPatterns.length > 0)
        evidence.push(`Sensitive data filtering in logs: ${sensitiveFilterPatterns.slice(0, 3).join(', ')}`);
    if (!passed && errorLogPatterns.length > 0)
        evidence.push('Logging detected but without sensitive data filtering');
    if (!passed && errorLogPatterns.length === 0)
        evidence.push('No error logging with sensitive data protection detected');
    return { id: '7.2.1', name: 'Verify error logging without sensitive data', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV7_3_1(rootDir) {
    const consistentResponses = scanFilesForPattern(rootDir, /(error.*dto|error.*schema|ErrorResponse|ApiError|ApiException.*response|consistent.*error|uniform.*error|standard.*error|error.*format|error.*contract)/i);
    const passed = consistentResponses.length > 0;
    const evidence = [];
    if (consistentResponses.length > 0)
        evidence.push(`Consistent error format: ${consistentResponses.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No consistent error response format detected');
    return { id: '7.3.1', name: 'Verify consistent error responses across the app', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV7_4_1(rootDir) {
    const catchBlockPatterns = scanFilesForPattern(rootDir, /(catch\s*\([^)]*\)\s*\{|\.catch\s*\(|try\s*\{[^}]*\}\s*catch|errorHandler|error.*handler|handleError|handleException|onError|onException)/i);
    const centralizedError = scanFilesForPattern(rootDir, /(GlobalExceptionFilter|ExceptionFilter|@Catch|BaseExceptionFilter|AllExceptionsFilter|HttpExceptionFilter)/i);
    const passed = catchBlockPatterns.length > 0;
    const evidence = [];
    if (centralizedError.length > 0)
        evidence.push(`Centralized error handling: ${centralizedError.slice(0, 3).join(', ')}`);
    if (catchBlockPatterns.length > 0)
        evidence.push(`Catch blocks: ${catchBlockPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No error handling in catch blocks detected');
    return { id: '7.4.1', name: 'Verify error handling in all catch blocks', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV7_5_1(rootDir) {
    const centralizedPatterns = scanFilesForPattern(rootDir, /(centralized.*error|error.*centraliz|error.*framework|error.*manager|error.*service|ErrorHandler|ExceptionHandler|ErrorManager|ExceptionManager|exceptionHandler)/i);
    const passed = centralizedPatterns.length > 0;
    const evidence = [];
    if (centralizedPatterns.length > 0)
        evidence.push(`Centralized error framework: ${centralizedPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No centralized error handling framework detected');
    return { id: '7.5.1', name: 'Verify centralized error handling framework', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV7_6_1(rootDir) {
    const leakPatterns = scanFilesForPattern(rootDir, /(stack|Stack|stackTrace|internal.*error|internal_error|implementation.*detail|debug.*info|debugInfo|__debug|devMessage|development.*error)/i);
    const genericPatterns = scanFilesForPattern(rootDir, /(An error occurred|Something went wrong|Internal server error|Server Error|Unexpected error|generic.*error|generic.*message)/i);
    const passed = genericPatterns.length > 0 || leakPatterns.length === 0;
    const evidence = [];
    if (genericPatterns.length > 0)
        evidence.push(`Generic error messages: ${genericPatterns.slice(0, 2).join(', ')}`);
    if (leakPatterns.length > 0)
        evidence.push(`Potential leak items: ${leakPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No evidence of generic error codes or potential implementation leak');
    return { id: '7.6.1', name: 'Verify error codes do not leak implementation details', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV7Checks(rootDir) {
    return [
        checkV7_1_1(rootDir),
        checkV7_1_2(rootDir),
        checkV7_2_1(rootDir),
        checkV7_3_1(rootDir),
        checkV7_4_1(rootDir),
        checkV7_5_1(rootDir),
        checkV7_6_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v7-errors.js.map
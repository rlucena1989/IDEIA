"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV3_1_1 = checkV3_1_1;
exports.checkV3_1_2 = checkV3_1_2;
exports.checkV3_2_1 = checkV3_2_1;
exports.checkV3_3_1 = checkV3_3_1;
exports.checkV3_4_1 = checkV3_4_1;
exports.checkV3_5_1 = checkV3_5_1;
exports.checkV3_6_1 = checkV3_6_1;
exports.runAllV3Checks = runAllV3Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v3-session');
const CATEGORY = 'V3';
function scanPackageJsonDeps(rootDir, depNames) {
    const found = [];
    function walk(dir) {
        try {
            const pkgPath = node_path_1.default.join(dir, 'package.json');
            if (node_fs_1.default.existsSync(pkgPath)) {
                const content = JSON.parse(node_fs_1.default.readFileSync(pkgPath, 'utf8'));
                const allDeps = { ...content.dependencies, ...content.devDependencies };
                for (const depName of depNames) {
                    if (allDeps[depName]) {
                        found.push(`${depName}@${allDeps[depName]} (in ${node_path_1.default.relative(rootDir, pkgPath)})`);
                    }
                }
            }
        }
        catch {
        }
        try {
            for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    walk(node_path_1.default.join(dir, entry.name));
                }
            }
        }
        catch {
        }
    }
    walk(rootDir);
    return found;
}
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
function checkV3_1_1(rootDir) {
    const sessionDeps = scanPackageJsonDeps(rootDir, ['express-session', 'cookie-parser', 'client-sessions', 'koa-session', 'next-session', 'remix-session', 'iron-session', 'session-file-store', 'connect-redis', 'connect-mongo', 'connect-session-knex', 'connect-session-sequelize']);
    const sessionPatterns = scanFilesForPattern(rootDir, /(session|Session|req\.session|session\.regenerate|session\.destroy|session\.save|session\.reload|sessionMiddleware|SessionMiddleware)/i);
    const cookiePatterns = scanFilesForPattern(rootDir, /(cookie|Cookie|httpOnly|secure.*cookie|sameSite|signedCookies|cookieParser)/i);
    const passed = sessionDeps.length > 0 || sessionPatterns.length > 0;
    const evidence = [];
    if (sessionDeps.length > 0)
        evidence.push(`Session libraries: ${sessionDeps.slice(0, 5).join(', ')}`);
    if (sessionPatterns.length > 0)
        evidence.push(`Session patterns: ${sessionPatterns.slice(0, 3).join(', ')}`);
    if (cookiePatterns.length > 0)
        evidence.push(`Cookie config: ${cookiePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No session management detected');
    return {
        id: '3.1.1',
        name: 'Verify session management is implemented using secure primitives',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV3_1_2(rootDir) {
    const timeoutPatterns = scanFilesForPattern(rootDir, /(session.*timeout|session.*maxAge|session.*expire|cookie.*maxAge|maxAge|session.*ttl|session.*duration|session.*life|rolling|resave|saveUninitialized)/i);
    const passed = timeoutPatterns.length > 0;
    const evidence = [];
    if (timeoutPatterns.length > 0)
        evidence.push(`Session timeout config: ${timeoutPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No session timeout configuration detected');
    return { id: '3.1.2', name: 'Verify session timeout configuration exists', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV3_2_1(rootDir) {
    const secureCookiePatterns = scanFilesForPattern(rootDir, /(httpOnly|secure|sameSite|SameSite|HttpOnly|Secure|cookie.*secure|cookie.*httpOnly|cookie.*sameSite)/i);
    const cookieConfig = scanFilesForPattern(rootDir, /(cookie\.secure|cookie\.httpOnly|cookie\.sameSite|cookie\.signed|cookie\.domain|cookie\.path)/i);
    const passed = secureCookiePatterns.length > 0 || cookieConfig.length > 0;
    const evidence = [];
    if (cookieConfig.length > 0)
        evidence.push(`Cookie security config: ${cookieConfig.slice(0, 3).join(', ')}`);
    if (secureCookiePatterns.length > 0)
        evidence.push(`Secure cookie attributes: ${secureCookiePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No secure cookie attributes (HttpOnly, Secure, SameSite) detected');
    return { id: '3.2.1', name: 'Verify secure cookie attributes (HttpOnly, Secure, SameSite)', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV3_3_1(rootDir) {
    const regeneratePatterns = scanFilesForPattern(rootDir, /(session.*regenerat|regenerat.*session|session.*rotate|rotate.*session|session.*recreate|session.*after.*login|login.*session.*new)/i);
    const passed = regeneratePatterns.length > 0;
    const evidence = [];
    if (regeneratePatterns.length > 0)
        evidence.push(`Session regeneration patterns: ${regeneratePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No session ID regeneration after login detected');
    return { id: '3.3.1', name: 'Verify session ID is regenerated after login', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV3_4_1(rootDir) {
    const logoutPatterns = scanFilesForPattern(rootDir, /(logout|signOut|sign.?out|log.?out|session.*destroy|destroy.*session|session.*clear|clear.*session|session.*end|end.*session)/i);
    const passed = logoutPatterns.length > 0;
    const evidence = [];
    if (logoutPatterns.length > 0)
        evidence.push(`Logout/session invalidation: ${logoutPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No session invalidation on logout detected');
    return { id: '3.4.1', name: 'Verify session invalidation on logout', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV3_5_1(rootDir) {
    const tlsBindPatterns = scanFilesForPattern(rootDir, /(session.*tls|tls.*session|certificate.*session|cert.*bind|mutual.*tls|mTLS|client.?cert|clientCert|requestCert)/i);
    const passed = tlsBindPatterns.length > 0;
    const evidence = [];
    if (tlsBindPatterns.length > 0)
        evidence.push(`Session TLS binding: ${tlsBindPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No session binding to TLS certificate detected');
    return { id: '3.5.1', name: 'Verify session binding to TLS certificate', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV3_6_1(rootDir) {
    const privilegeRotatePatterns = scanFilesForPattern(rootDir, /(privilege.*escalat|role.*change|role.*upgrade|role.*elevat|session.*escalat|session.*privilege|session.*rotate.*privilege|regenerat.*role|admin.*session.*new)/i);
    const passed = privilegeRotatePatterns.length > 0;
    const evidence = [];
    if (privilegeRotatePatterns.length > 0)
        evidence.push(`Privilege escalation session control: ${privilegeRotatePatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No session rotation on privilege escalation detected');
    return { id: '3.6.1', name: 'Verify session rotation on privilege escalation', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV3Checks(rootDir) {
    return [
        checkV3_1_1(rootDir),
        checkV3_1_2(rootDir),
        checkV3_2_1(rootDir),
        checkV3_3_1(rootDir),
        checkV3_4_1(rootDir),
        checkV3_5_1(rootDir),
        checkV3_6_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v3-session.js.map
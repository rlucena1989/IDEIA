"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV9_1_1 = checkV9_1_1;
exports.checkV9_1_2 = checkV9_1_2;
exports.checkV9_2_1 = checkV9_2_1;
exports.checkV9_2_2 = checkV9_2_2;
exports.checkV9_3_1 = checkV9_3_1;
exports.checkV9_4_1 = checkV9_4_1;
exports.checkV9_5_1 = checkV9_5_1;
exports.runAllV9Checks = runAllV9Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v9-comm');
const CATEGORY = 'V9';
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
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
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
function checkV9_1_1(rootDir) {
    const httpsPatterns = scanFilesForPattern(rootDir, /(https:\/\/|tls:|createServer.*ssl|https\.createServer|forceSSL|sslRedirect|redirectSSL)/i);
    const tlsDeps = scanPackageJsonDeps(rootDir, ['https', 'spdy', 'http2']);
    const tlsInConfig = scanFilesForPattern(rootDir, /(minVersion|secureContext|secureOptions|SSL_OP_NO_TLSv1|requestCert|rejectUnauthorized)/i);
    const passed = httpsPatterns.length > 0 || tlsInConfig.length > 0;
    const evidence = [];
    if (httpsPatterns.length > 0)
        evidence.push(`TLS/HTTPS config: ${httpsPatterns.slice(0, 3).join(', ')}`);
    if (tlsInConfig.length > 0)
        evidence.push(`TLS options: ${tlsInConfig.slice(0, 3).join(', ')}`);
    if (tlsDeps.length > 0)
        evidence.push(`TLS deps: ${tlsDeps.join(', ')}`);
    if (!passed)
        evidence.push('No TLS/HTTPS configuration detected');
    return {
        id: '9.1.1',
        name: 'Verify TLS is used for all communications',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV9_1_2(rootDir) {
    const certValidation = scanFilesForPattern(rootDir, /(rejectUnauthorized|checkServerIdentity|ca:|cert:|key:|pfx:|certificate.*valid|certificate.*check|cert.*verify|verify.*cert|trust.*cert)/i);
    const passed = certValidation.length > 0;
    const evidence = [];
    if (certValidation.length > 0)
        evidence.push(`Certificate validation: ${certValidation.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No certificate validation configuration detected');
    return { id: '9.1.2', name: 'Verify certificate validation is configured', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV9_2_1(rootDir) {
    const tls13Config = scanFilesForPattern(rootDir, /(TLSv1\.3|tlsv1\.3|minVersion.*1\.3|TLS_AES|SSL_OP_NO_TLSv1)/i);
    const tls13Deps = scanPackageJsonDeps(rootDir, ['node:tls', 'tls']);
    const passed = tls13Config.length > 0;
    const evidence = [];
    if (tls13Config.length > 0)
        evidence.push(`TLS 1.3 config: ${tls13Config.join(', ')}`);
    if (tls13Deps.length > 0 && tls13Config.length === 0)
        evidence.push(`TLS module present but version not enforced`);
    if (!passed)
        evidence.push('TLS 1.3 is not explicitly enforced');
    return {
        id: '9.2.1',
        name: 'Verify TLS 1.3 is enforced',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV9_2_2(rootDir) {
    const weakCipherPatterns = scanFilesForPattern(rootDir, /(SSL_OP_NO_SSLv2|SSL_OP_NO_SSLv3|SSL_OP_NO_TLSv1|SSL_OP_NO_TLSv1_1|ciphers:|secureOptions|ECDHE|TLS_ECDHE|TLS_AES|TLS_CHACHA20)/i);
    const cipherConfig = scanFilesForPattern(rootDir, /(ssl.*cipher|cipher.*suites|cipherSuites|ssl_ciphers|ssl.*protocol|protocol.*ssl|minVersion.*1\.2|minVersion.*1\.3)/i);
    const passed = weakCipherPatterns.length > 0 || cipherConfig.length > 0;
    const evidence = [];
    if (weakCipherPatterns.length > 0)
        evidence.push(`Cipher configuration: ${weakCipherPatterns.slice(0, 3).join(', ')}`);
    if (cipherConfig.length > 0)
        evidence.push(`Cipher suite config: ${cipherConfig.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No weak cipher suite disabling detected');
    return { id: '9.2.2', name: 'Verify weak cipher suites are disabled', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV9_3_1(rootDir) {
    const hstsPatterns = scanFilesForPattern(rootDir, /(strict-transport-security|Strict-Transport-Security|HSTS|hsts|max-age=\d+|includeSubDomains|preload)/i);
    const hstsDeps = scanPackageJsonDeps(rootDir, ['hsts', 'helmet']);
    const passed = hstsPatterns.length > 0 || hstsDeps.length > 0;
    const evidence = [];
    if (hstsPatterns.length > 0)
        evidence.push(`HSTS headers: ${hstsPatterns.slice(0, 3).join(', ')}`);
    if (hstsDeps.length > 0)
        evidence.push(`HSTS deps: ${hstsDeps.join(', ')}`);
    if (!passed)
        evidence.push('No HSTS header configured');
    return { id: '9.3.1', name: 'Verify HSTS header is configured', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV9_4_1(rootDir) {
    const certPinning = scanFilesForPattern(rootDir, /(certificate.?pinn|pinn.?cert|public.?key.?pinn|HPKP|expect-ct|Expect-CT|cert.*fingerprint|fingerprint.*cert|sha256.*cert|cert.*sha256)/i);
    const passed = certPinning.length > 0;
    const evidence = [];
    if (certPinning.length > 0)
        evidence.push(`Certificate pinning: ${certPinning.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No certificate pinning detected');
    return { id: '9.4.1', name: 'Verify certificate pinning for critical endpoints', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV9_5_1(rootDir) {
    const mtlsPatterns = scanFilesForPattern(rootDir, /(mutual.*tls|m.?TLS|mTLS|client.?cert|clientCert|requestCert|rejectUnauthorized|two.?way.*ssl|2-way.*ssl|cert.*auth|certificate.*auth)/i);
    const passed = mtlsPatterns.length > 0;
    const evidence = [];
    if (mtlsPatterns.length > 0)
        evidence.push(`mTLS patterns: ${mtlsPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No mTLS for service-to-service communication detected');
    return { id: '9.5.1', name: 'Verify mTLS for service-to-service communication', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV9Checks(rootDir) {
    return [
        checkV9_1_1(rootDir),
        checkV9_1_2(rootDir),
        checkV9_2_1(rootDir),
        checkV9_2_2(rootDir),
        checkV9_3_1(rootDir),
        checkV9_4_1(rootDir),
        checkV9_5_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v9-comm.js.map
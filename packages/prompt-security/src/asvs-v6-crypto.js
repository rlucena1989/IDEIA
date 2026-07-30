"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV6_1_1 = checkV6_1_1;
exports.checkV6_2_1 = checkV6_2_1;
exports.checkV6_2_2 = checkV6_2_2;
exports.checkV6_2_3 = checkV6_2_3;
exports.checkV6_3_1 = checkV6_3_1;
exports.checkV6_4_1 = checkV6_4_1;
exports.checkV6_5_1 = checkV6_5_1;
exports.checkV6_6_1 = checkV6_6_1;
exports.checkV6_7_1 = checkV6_7_1;
exports.runAllV6Checks = runAllV6Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v6-crypto');
const CATEGORY = 'V6';
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
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
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
function checkV6_1_1(rootDir) {
    const approvedAlgorithms = scanFilesForPattern(rootDir, /(aes-256-gcm|aes-256-cbc|aes256|chacha20.?poly1305|xchacha20|AES|aes-128|aes192|aes-192|SHA256|SHA384|SHA512|sha256|sha384|sha512|RSA-OAEP|ECDH|Ed25519)/i);
    const deprecatedAlgorithms = scanFilesForPattern(rootDir, /(MD5|md5|SHA1|sha1|DES|des|3DES|des3|RC4|rc4|RC2|rc2|Blowfish|blowfish)/i);
    const passed = approvedAlgorithms.length > 0;
    const evidence = [];
    if (approvedAlgorithms.length > 0)
        evidence.push(`Approved algorithms: ${approvedAlgorithms.slice(0, 4).join(', ')}`);
    if (deprecatedAlgorithms.length > 0)
        evidence.push(`WARNING: deprecated algos found: ${deprecatedAlgorithms.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No approved cryptographic algorithms detected');
    return { id: '6.1.1', name: 'Verify use of approved cryptographic algorithms', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV6_2_1(rootDir) {
    const cryptoUtils = scanFilesForPattern(rootDir, /encrypt|decrypt|createCipheriv|createDecipheriv/);
    const encryptPatterns = scanFilesForPattern(rootDir, /(encrypt|decrypt|cipher|crypto)/i);
    const passed = cryptoUtils.length > 0;
    const evidence = [];
    if (cryptoUtils.length > 0)
        evidence.push(`Encryption implementations: ${cryptoUtils.slice(0, 5).join(', ')}`);
    if (encryptPatterns.length > 0 && cryptoUtils.length === 0)
        evidence.push(`Crypto mentions: ${encryptPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No data-at-rest encryption implementation detected');
    return {
        id: '6.2.1',
        name: 'Verify data-at-rest encryption exists',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV6_2_2(rootDir) {
    const aes256gcm = scanFilesForPattern(rootDir, /aes-256-gcm|aes256gcm|AES-256-GCM/);
    const modernAlgorithms = scanFilesForPattern(rootDir, /aes-256|chacha20|chacha20-poly1305|xchacha20|XChaCha20/i);
    const passed = aes256gcm.length > 0 || modernAlgorithms.length > 0;
    const evidence = [];
    if (aes256gcm.length > 0)
        evidence.push(`AES-256-GCM usage: ${aes256gcm.join(', ')}`);
    if (modernAlgorithms.length > 0 && aes256gcm.length === 0)
        evidence.push(`Modern algorithm: ${modernAlgorithms.join(', ')}`);
    if (!passed)
        evidence.push('No modern encryption algorithm (AES-256-GCM/ChaCha20) detected');
    return {
        id: '6.2.2',
        name: 'Verify algorithm is modern (AES-256-GCM)',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV6_2_3(rootDir) {
    const keyMgmt = scanFilesForPattern(rootDir, /(deriveKey|pbkdf2|key.*derivation|key.*rotation|key.*management|secret.*store|vault)/i);
    const keyPatterns = scanFilesForPattern(rootDir, /(generateKey|createKeyPair|keyPair|publicKey|privateKey|keyStore|KeyManagement)/i);
    const passed = keyMgmt.length > 0 || keyPatterns.length > 0;
    const evidence = [];
    if (keyMgmt.length > 0)
        evidence.push(`Key management: ${keyMgmt.slice(0, 3).join(', ')}`);
    if (keyPatterns.length > 0)
        evidence.push(`Key operations: ${keyPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No key management mechanisms detected');
    return {
        id: '6.2.3',
        name: 'Verify key management exists',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV6_3_1(rootDir) {
    const csprngPatterns = scanFilesForPattern(rootDir, /(randomBytes|crypto\.randomInt|crypto\.randomUUID|crypto\.randomFill|webcrypto\.getRandomValues|window\.crypto\.getRandomValues|secureRandom|randomUUID)/i);
    const weakRandom = scanFilesForPattern(rootDir, /(Math\.random|Math\.floor\(Math\.random)/i);
    const passed = csprngPatterns.length > 0;
    const evidence = [];
    if (csprngPatterns.length > 0)
        evidence.push(`CSPRNG usage: ${csprngPatterns.slice(0, 3).join(', ')}`);
    if (weakRandom.length > 0)
        evidence.push(`WARNING: weak Math.random found: ${weakRandom.length} occurrences`);
    if (!passed)
        evidence.push('No cryptographically secure random number generation detected');
    return { id: '6.3.1', name: 'Verify cryptographically secure random number generation', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV6_4_1(rootDir) {
    const keyRotationPatterns = scanFilesForPattern(rootDir, /(key.*rotat|rotat.*key|key.*renew|renew.*key|key.*refresh|refresh.*key|key.*version|version.*key|key.*expir|expir.*key|key.*ttl|key.*lifetime)/i);
    const passed = keyRotationPatterns.length > 0;
    const evidence = [];
    if (keyRotationPatterns.length > 0)
        evidence.push(`Key rotation config: ${keyRotationPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No encryption key rotation detected');
    return { id: '6.4.1', name: 'Verify encryption key rotation', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV6_5_1(rootDir) {
    const cryptoErrorPatterns = scanFilesForPattern(rootDir, /(crypto.*error|encrypt.*error|decrypt.*error|cipher.*error|decipher.*error|key.*error|verify.*error|sign.*error|hmac.*error)/i);
    const passed = cryptoErrorPatterns.length > 0;
    const evidence = [];
    if (cryptoErrorPatterns.length > 0)
        evidence.push(`Crypto error handling: ${cryptoErrorPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No cryptographic failure handling detected');
    return { id: '6.5.1', name: 'Verify cryptographic failure is handled securely', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV6_6_1(rootDir) {
    const aeadPatterns = scanFilesForPattern(rootDir, /(aes-256-gcm|chacha20-poly1305|xchacha20|aead|AEAD|GCM|CCM|Poly1305)/i);
    const gcmUsage = scanFilesForPattern(rootDir, /(createCipheriv.*aes-256-gcm|createDecipheriv.*aes-256-gcm|gcm|GCM)/i);
    const passed = aeadPatterns.length > 0 && gcmUsage.length > 0;
    const evidence = [];
    if (aeadPatterns.length > 0)
        evidence.push(`AEAD algorithms: ${aeadPatterns.slice(0, 3).join(', ')}`);
    if (gcmUsage.length > 0)
        evidence.push(`GCM usage: ${gcmUsage.slice(0, 2).join(', ')}`);
    if (!passed && aeadPatterns.length > 0)
        evidence.push('AEAD mentioned but may not be enforced');
    if (!passed)
        evidence.push('No authenticated encryption (AEAD) detected');
    return { id: '6.6.1', name: 'Verify authenticated encryption (AEAD) is used', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV6_7_1(rootDir) {
    const sideChannelPatterns = scanFilesForPattern(rootDir, /(timing.?safe|constant.?time|constantTime|timing.*attack|timingSafeEqual|safeCompare|timeSafeEqual|scmp|compare.*timing)/i);
    const passed = sideChannelPatterns.length > 0;
    const evidence = [];
    if (sideChannelPatterns.length > 0)
        evidence.push(`Side-channel mitigations: ${sideChannelPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No side-channel attack mitigations (timing-safe compare) detected');
    return { id: '6.7.1', name: 'Verify side-channel attack mitigations (timing-safe compare)', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV6Checks(rootDir) {
    return [
        checkV6_1_1(rootDir),
        checkV6_2_1(rootDir),
        checkV6_2_2(rootDir),
        checkV6_2_3(rootDir),
        checkV6_3_1(rootDir),
        checkV6_4_1(rootDir),
        checkV6_5_1(rootDir),
        checkV6_6_1(rootDir),
        checkV6_7_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v6-crypto.js.map
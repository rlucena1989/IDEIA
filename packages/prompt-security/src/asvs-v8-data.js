"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkV8_1_1 = checkV8_1_1;
exports.checkV8_2_1 = checkV8_2_1;
exports.checkV8_3_1 = checkV8_3_1;
exports.checkV8_3_2 = checkV8_3_2;
exports.checkV8_3_3 = checkV8_3_3;
exports.checkV8_4_1 = checkV8_4_1;
exports.checkV8_5_1 = checkV8_5_1;
exports.checkV8_6_1 = checkV8_6_1;
exports.runAllV8Checks = runAllV8Checks;
const node_fs_1 = __importDefault(require("node:fs"));
const logger_1 = require("@ideia/logger");
const node_path_1 = __importDefault(require("node:path"));
const logger = (0, logger_1.createLogger)('asvs-v8-data');
const CATEGORY = 'V8';
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
                else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.md'))) {
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
function checkV8_1_1(rootDir) {
    const piiPatterns = scanFilesForPattern(rootDir, /(PII|personally.identifiable|dado.?pessoal|personal.data|sensitive.data|data.?classification|data.?category|DataCategory)/i);
    const privacyPatterns = scanFilesForPattern(rootDir, /(privacy|privacidade|LGPD|GDPR|data.?protection)/i);
    const passed = piiPatterns.length > 0 || privacyPatterns.length > 0;
    const evidence = [];
    if (piiPatterns.length > 0)
        evidence.push(`PII/sensitive data identification: ${piiPatterns.slice(0, 3).join(', ')}`);
    if (privacyPatterns.length > 0)
        evidence.push(`Privacy framework mentions: ${privacyPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No sensitive data classification or PII detection found');
    return {
        id: '8.1.1',
        name: 'Verify sensitive data is identified and classified',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV8_2_1(rootDir) {
    const dataMasking = scanFilesForPattern(rootDir, /(mask|masking|masked|obfuscate|obfuscation|redact|redaction|hide|hidden|truncat|partial.*show|show.*partial|replace.*char)/i);
    const passed = dataMasking.length > 0;
    const evidence = [];
    if (dataMasking.length > 0)
        evidence.push(`Data masking patterns: ${dataMasking.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No data masking for sensitive data detected');
    return { id: '8.2.1', name: 'Verify data masking for sensitive data in display', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV8_3_1(rootDir) {
    const encryptAtRest = scanFilesForPattern(rootDir, /(encrypt|aes-256-gcm|aes256|data.?at.?rest|at.?rest.?encryption|storage.?encryption|persistente.?cripto)/i);
    const encryptFunctions = scanFilesForPattern(rootDir, /(export function encrypt|export const encrypt|export async function encrypt)/i);
    const passed = encryptAtRest.length > 0 || encryptFunctions.length > 0;
    const evidence = [];
    if (encryptAtRest.length > 0)
        evidence.push(`Encryption mentions: ${encryptAtRest.slice(0, 3).join(', ')}`);
    if (encryptFunctions.length > 0)
        evidence.push(`Encryption functions: ${encryptFunctions.slice(0, 2).join(', ')}`);
    if (!passed)
        evidence.push('No data-at-rest encryption implementation detected');
    return {
        id: '8.3.1',
        name: 'Verify sensitive data is encrypted at rest',
        category: CATEGORY,
        level: 1,
        passed,
        evidence: evidence.join(' | '),
    };
}
function checkV8_3_2(rootDir) {
    const secureDelete = scanFilesForPattern(rootDir, /(secure.*(delete|remove|erase|clear|destroy|wipe)|permanent.*delete|data.*purge|purge.*data|delete.*permanent|shred|zero.*fill|overwrite.*data)/i);
    const passed = secureDelete.length > 0;
    const evidence = [];
    if (secureDelete.length > 0)
        evidence.push(`Secure deletion: ${secureDelete.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No secure data deletion mechanisms detected');
    return { id: '8.3.2', name: 'Verify secure data deletion exists', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV8_3_3(rootDir) {
    const keySeparation = scanFilesForPattern(rootDir, /(key.*separat|separat.*key|key.?per.?service|key.?per.?app|key.?per.?tenant|tenant.*key|app.*key|service.*key|different.*key|multiple.*key|isolated.*key)/i);
    const passed = keySeparation.length > 0;
    const evidence = [];
    if (keySeparation.length > 0)
        evidence.push(`Key separation: ${keySeparation.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No encryption key separation detected');
    return { id: '8.3.3', name: 'Verify encryption key separation per component', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV8_4_1(rootDir) {
    const retentionPatterns = scanFilesForPattern(rootDir, /(data.*retention|retention.*(period|policy|time|duration)|data.*expir|expir.*data|data.*lifecycle|lifecycle.*data|data.*archiv|archiv.*data|data.*cleanup|cleanup.*data|data.*purge|data.*prune|auto.*delete|auto.*remove|TTL|ttl|expireAfter)/i);
    const passed = retentionPatterns.length > 0;
    const evidence = [];
    if (retentionPatterns.length > 0)
        evidence.push(`Data retention policies: ${retentionPatterns.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No data retention policies detected');
    return { id: '8.4.1', name: 'Verify data retention policies are defined', category: CATEGORY, level: 2, passed, evidence: evidence.join(' | ') };
}
function checkV8_5_1(rootDir) {
    const dbEncryption = scanFilesForPattern(rootDir, /(TDE|transparent.*data.*encrypt|column.*level.*encrypt|column.*encrypt|cell.*encrypt|db.*encrypt|database.*encrypt|mongo.*encrypt|postgres.*encrypt|mysql.*encrypt|sqlite.*encrypt|encrypt.*column|encrypt.*field)/i);
    const passed = dbEncryption.length > 0;
    const evidence = [];
    if (dbEncryption.length > 0)
        evidence.push(`Database encryption: ${dbEncryption.slice(0, 3).join(', ')}`);
    if (!passed)
        evidence.push('No database encryption (TDE/column-level) detected');
    return { id: '8.5.1', name: 'Verify database encryption (TDE/column-level)', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function checkV8_6_1(rootDir) {
    const keyVaultPatterns = scanFilesForPattern(rootDir, /(key.?vault|KeyVault|vault|Hashicorp|Azure.*Key|AWS.*KMS|GCP.*KMS|google.*key.*management|aws.*kms|key.*management.*service|secret.*manager|SecretsManager|SecretManager)/i);
    const hsmDirect = scanFilesForPattern(rootDir, /(hsm|hardware.*security.*module|secure.*enclave|trusted.*platform|TPM|nitro.*enclave)/i);
    const passed = keyVaultPatterns.length > 0 || hsmDirect.length > 0;
    const evidence = [];
    if (keyVaultPatterns.length > 0)
        evidence.push(`Key Vault integration: ${keyVaultPatterns.slice(0, 3).join(', ')}`);
    if (hsmDirect.length > 0)
        evidence.push(`HSM/enclave: ${hsmDirect.slice(0, 2).join(', ')}`);
    if (!passed)
        evidence.push('No HSM/Key Vault integration detected');
    return { id: '8.6.1', name: 'Verify HSM/Key Vault integration for production keys', category: CATEGORY, level: 3, passed, evidence: evidence.join(' | ') };
}
function runAllV8Checks(rootDir) {
    return [
        checkV8_1_1(rootDir),
        checkV8_2_1(rootDir),
        checkV8_3_1(rootDir),
        checkV8_3_2(rootDir),
        checkV8_3_3(rootDir),
        checkV8_4_1(rootDir),
        checkV8_5_1(rootDir),
        checkV8_6_1(rootDir),
    ];
}
//# sourceMappingURL=asvs-v8-data.js.map
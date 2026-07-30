"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportConfig = exportConfig;
exports.exportToFile = exportToFile;
exports.exportWithProfile = exportWithProfile;
exports.exportSummary = exportSummary;
exports.importConfig = importConfig;
const logger_1 = require("@ideia/logger");
const _log = (0, logger_1.createLogger)('config-export');
function anonymizeConfig(obj) {
    const sensitiveKeys = ['token', 'secret', 'password', 'key', 'credential', 'apiKey', 'auth'];
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = anonymizeConfig(value);
        }
        else if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
            result[key] = '***ANONYMIZED***';
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function flattenKeys(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenKeys(value, fullKey));
        }
        else {
            result[fullKey] = value;
        }
    }
    return result;
}
function computeConfigDiff(existing, incoming) {
    const flatExisting = flattenKeys(existing);
    const flatIncoming = flattenKeys(incoming);
    const changes = [];
    const allKeys = new Set([...Object.keys(flatExisting), ...Object.keys(flatIncoming)]);
    for (const key of allKeys) {
        const oldVal = flatExisting[key];
        const newVal = flatIncoming[key];
        if (oldVal === undefined && newVal !== undefined) {
            changes.push({ path: key, oldValue: undefined, newValue: newVal, operation: 'added' });
        }
        else if (oldVal !== undefined && newVal === undefined) {
            changes.push({ path: key, oldValue: oldVal, newValue: undefined, operation: 'removed' });
        }
        else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ path: key, oldValue: oldVal, newValue: newVal, operation: 'modified' });
        }
    }
    return changes;
}
function exportConfig(engine, scope, anonymized = false) {
    let config;
    switch (scope) {
        case 'global':
            config = engine.getGlobal();
            break;
        case 'project':
            config = engine.getProject();
            break;
        case 'all':
            config = engine.getFull();
            break;
    }
    let payloadConfig = config;
    if (anonymized) {
        payloadConfig = anonymizeConfig(config);
    }
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        scope,
        anonymized,
        config: payloadConfig,
    };
    return JSON.stringify(payload, null, 2);
}
async function exportToFile(engine, filePath, scope = 'all', anonymized = false) {
    const data = exportConfig(engine, scope, anonymized);
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    fs.writeFileSync(filePath, data, 'utf-8');
    _log.info(`Config exported to ${filePath}`);
}
function exportWithProfile(engine, profileId, anonymized = false) {
    const config = engine.getFull();
    let payloadConfig = config;
    if (anonymized) {
        payloadConfig = anonymizeConfig(config);
    }
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        scope: 'all',
        anonymized,
        config: payloadConfig,
        profileId,
        metadata: { profile: profileId },
    };
    return JSON.stringify(payload, null, 2);
}
function exportSummary(config) {
    const flat = flattenKeys(config);
    const sensitiveKeys = ['token', 'secret', 'password', 'key', 'credential', 'apiKey', 'auth'];
    const sensitiveCount = Object.keys(flat).filter(k => sensitiveKeys.some(sk => k.toLowerCase().includes(sk.toLowerCase()))).length;
    const categories = [...new Set(Object.keys(flat).map(k => k.split('.')[0]).filter(Boolean))];
    return {
        keyCount: Object.keys(flat).length,
        categories,
        sensitiveKeys: sensitiveCount,
        sizeBytes: JSON.stringify(config).length,
    };
}
async function importConfig(engine, data, dryRun = false, validateOnly = false) {
    const result = {
        success: false,
        applied: 0,
        skipped: 0,
        errors: [],
        warnings: [],
        changes: [],
    };
    let payload;
    try {
        payload = JSON.parse(data);
    }
    catch (_err) {
        result.errors.push(`Invalid JSON: ${String(_err)}`);
        return result;
    }
    if (payload.version !== 1) {
        result.errors.push(`Unsupported export version: ${payload.version}`);
        return result;
    }
    const incomingConfig = payload.config;
    const existingConfig = engine.getFull();
    const changes = computeConfigDiff(existingConfig, incomingConfig);
    result.changes = changes;
    if (changes.length === 0) {
        result.success = true;
        result.warnings.push('No changes detected — config is identical');
        return result;
    }
    if (validateOnly || dryRun) {
        for (const change of changes) {
            if (change.operation === 'removed') {
                result.warnings.push(`Skipping removal of '${change.path}' — import does not delete existing keys`);
                result.skipped++;
            }
            else {
                try {
                    if (change.operation === 'modified') {
                        engine.set(change.path, change.newValue ?? '');
                    }
                    else {
                        engine.set(change.path, change.newValue ?? '');
                    }
                    result.applied++;
                }
                catch (_err) {
                    result.errors.push(`Failed to set '${change.path}': ${String(_err)}`);
                    result.skipped++;
                }
            }
        }
        result.success = result.errors.length === 0;
        return result;
    }
    for (const change of changes) {
        if (change.operation === 'removed') {
            result.warnings.push(`Skipping removal of '${change.path}' — import does not delete existing keys`);
            result.skipped++;
            continue;
        }
        try {
            await engine.set(change.path, change.newValue ?? '');
            result.applied++;
        }
        catch (_err) {
            result.errors.push(`Failed to set '${change.path}': ${String(_err)}`);
            result.skipped++;
        }
    }
    result.success = result.errors.length === 0;
    return result;
}
//# sourceMappingURL=config-export.js.map
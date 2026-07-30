"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigEngine = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('config-engine');
const GLOBAL_CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.ideia');
const GLOBAL_CONFIG_PATH = path_1.default.join(GLOBAL_CONFIG_DIR, 'config.json');
const PROJECT_CONFIG_DIR = '.ideia';
const PROJECT_CONFIG_PATH = path_1.default.join(PROJECT_CONFIG_DIR, 'config.json');
const SECURITY_RULES = [
    { path: 'security.minRetries', minValue: 1, description: 'Minimum retry count must be at least 1' },
    { path: 'security.maxRetries', maxValue: 10, description: 'Maximum retry count cannot exceed 10' },
    { path: 'security.logLevel', allowedValues: ['error', 'warn', 'info', 'debug'], description: 'Log level must be one of: error, warn, info, debug' },
    { path: 'security.sandbox.enabled', allowedValues: [true], description: 'Sandbox cannot be disabled by project config' },
    { path: 'security.audit.enabled', allowedValues: [true], description: 'Audit trail cannot be disabled by project config' },
];
function resolveNested(obj, dottedPath) {
    const parts = dottedPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current !== 'object' || current === null)
            return undefined;
        current = current[parts[i] ?? ''];
    }
    if (typeof current !== 'object' || current === null)
        return undefined;
    const parent = current;
    const key = parts[parts.length - 1] ?? '';
    return { parent, key, fullValue: parent[key] };
}
function setNested(obj, dottedPath, value) {
    const parts = dottedPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i] ?? '';
        if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1] ?? ''] = value;
}
function deleteNested(obj, dottedPath) {
    const resolved = resolveNested(obj, dottedPath);
    if (!resolved)
        return false;
    delete resolved.parent[resolved.key];
    return true;
}
function getNested(obj, dottedPath) {
    const resolved = resolveNested(obj, dottedPath);
    if (!resolved)
        return undefined;
    return resolved.fullValue;
}
function deepMerge(base, override) {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value) &&
            key in result && result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
            result[key] = deepMerge(result[key], value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function checkSecurityRuleViolation(path, value, rules) {
    for (const rule of rules) {
        const globPattern = rule.path.replace(/\*\*/g, '.*').replace(/\*/g, '[^.]*');
        const re = new RegExp(`^${globPattern}$`);
        if (!re.test(path))
            continue;
        if (rule.allowedValues !== undefined && !rule.allowedValues.includes(value)) {
            return `Security violation at '${path}': value ${JSON.stringify(value)} not in allowed values ${JSON.stringify(rule.allowedValues)}. ${rule.description || ''}`;
        }
        if (rule.minValue !== undefined && typeof value === 'number' && value < rule.minValue) {
            return `Security violation at '${path}': ${value} < minimum ${rule.minValue}. ${rule.description || ''}`;
        }
        if (rule.maxValue !== undefined && typeof value === 'number' && value > rule.maxValue) {
            return `Security violation at '${path}': ${value} > maximum ${rule.maxValue}. ${rule.description || ''}`;
        }
    }
    return null;
}
function flattenKeys(obj, prefix = '') {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...flattenKeys(value, fullKey));
        }
        else {
            keys.push(fullKey);
        }
    }
    return keys;
}
async function readJsonFile(filePath) {
    try {
        const content = await promises_1.default.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return {};
    }
}
async function writeJsonFile(filePath, data) {
    await promises_1.default.mkdir(path_1.default.dirname(filePath), { recursive: true });
    await promises_1.default.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
class ConfigEngine {
    eventBus;
    auditTrail;
    globalConfig = {};
    projectConfig = {};
    securityRules = [...SECURITY_RULES];
    loaded = false;
    constructor(eventBus, auditTrail, customRules) {
        this.eventBus = eventBus;
        this.auditTrail = auditTrail;
        if (customRules)
            this.securityRules.push(...customRules);
    }
    async load() {
        this.globalConfig = await readJsonFile(GLOBAL_CONFIG_PATH);
        this.projectConfig = await readJsonFile(PROJECT_CONFIG_PATH);
        this.loaded = true;
        log.info('Config loaded', { globalKeys: Object.keys(this.globalConfig).length, projectKeys: Object.keys(this.projectConfig).length });
    }
    ensureLoaded() {
        if (!this.loaded) {
            try {
                const raw = fs_1.default.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8');
                this.globalConfig = JSON.parse(raw);
            }
            catch {
                this.globalConfig = {};
            }
            try {
                const raw = fs_1.default.readFileSync(PROJECT_CONFIG_PATH, 'utf-8');
                this.projectConfig = JSON.parse(raw);
            }
            catch {
                this.projectConfig = {};
            }
            this.loaded = true;
        }
    }
    getMerged() {
        this.ensureLoaded();
        const merged = deepMerge(this.globalConfig, this.projectConfig);
        return merged;
    }
    get(path) {
        this.ensureLoaded();
        if (path === undefined || path === '')
            return this.getMerged();
        return getNested(this.getMerged(), path);
    }
    async set(path, value) {
        this.ensureLoaded();
        const violation = checkSecurityRuleViolation(path, value, this.securityRules);
        if (violation) {
            log.warn(violation);
            await this.audit('config.set.rejected', path, { value, reason: violation });
            throw new Error(violation);
        }
        const oldValue = getNested(this.projectConfig, path);
        setNested(this.projectConfig, path, value);
        await writeJsonFile(PROJECT_CONFIG_PATH, this.projectConfig);
        await this.audit('config.set', path, { oldValue, newValue: value });
        if (this.eventBus) {
            await this.eventBus.emit({ type: 'config.changed', source: 'config-engine', payload: { path, oldValue, newValue: value } });
        }
    }
    async setGlobal(path, value) {
        this.ensureLoaded();
        const oldValue = getNested(this.globalConfig, path);
        setNested(this.globalConfig, path, value);
        await writeJsonFile(GLOBAL_CONFIG_PATH, this.globalConfig);
        await this.audit('config.set.global', path, { oldValue, newValue: value });
        if (this.eventBus) {
            await this.eventBus.emit({ type: 'config.changed', source: 'config-engine', payload: { scope: 'global', path, oldValue, newValue: value } });
        }
    }
    async reset(path) {
        this.ensureLoaded();
        if (path === undefined || path === '') {
            this.projectConfig = {};
            await writeJsonFile(PROJECT_CONFIG_PATH, {});
            await this.audit('config.reset.all', '*', {});
            if (this.eventBus) {
                await this.eventBus.emit({ type: 'config.reset', source: 'config-engine', payload: { scope: 'project', path: '*' } });
            }
            return;
        }
        const oldValue = getNested(this.projectConfig, path);
        const removed = deleteNested(this.projectConfig, path);
        if (removed) {
            await writeJsonFile(PROJECT_CONFIG_PATH, this.projectConfig);
            await this.audit('config.reset', path, { oldValue });
            if (this.eventBus) {
                await this.eventBus.emit({ type: 'config.reset', source: 'config-engine', payload: { path, oldValue } });
            }
        }
    }
    getFull() {
        return this.getMerged();
    }
    getGlobal() {
        this.ensureLoaded();
        return { ...this.globalConfig };
    }
    getProject() {
        this.ensureLoaded();
        return { ...this.projectConfig };
    }
    getValidationErrors() {
        this.ensureLoaded();
        const errors = [];
        const merged = this.getMerged();
        const keys = flattenKeys(merged);
        for (const key of keys) {
            const value = getNested(merged, key);
            for (const rule of this.securityRules) {
                const globPattern = rule.path.replace(/\*\*/g, '.*').replace(/\*/g, '[^.]*');
                const re = new RegExp(`^${globPattern}$`);
                if (!re.test(key))
                    continue;
                if (rule.required && value === undefined) {
                    errors.push(`Required config '${key}' is missing`);
                }
                if (value !== undefined) {
                    const violation = checkSecurityRuleViolation(key, value, this.securityRules);
                    if (violation)
                        errors.push(violation);
                }
            }
        }
        return errors;
    }
    async validate() {
        const errors = this.getValidationErrors();
        return { valid: errors.length === 0, errors };
    }
    async audit(action, target, metadata) {
        if (!this.auditTrail)
            return;
        try {
            this.auditTrail.append({
                actor: 'system',
                eventType: action,
                target,
                decision: 'approved',
                result: 'success',
                metadata,
            });
        }
        catch (_err) {
            log.error('Audit append failed', { error: String(_err) });
        }
    }
}
exports.ConfigEngine = ConfigEngine;
//# sourceMappingURL=config-engine.js.map
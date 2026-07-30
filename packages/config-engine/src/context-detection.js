"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextDetector = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('context-detection');
const CONTEXT_FILE = path_1.default.join('.ideia', 'context.json');
async function readContextConfig() {
    try {
        const content = await promises_1.default.readFile(CONTEXT_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return { current: 'development', history: [] };
    }
}
async function writeContextConfig(config) {
    await promises_1.default.mkdir(path_1.default.dirname(CONTEXT_FILE), { recursive: true });
    await promises_1.default.writeFile(CONTEXT_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
class ContextDetector {
    configEngine;
    current = 'development';
    constructor(configEngine) {
        this.configEngine = configEngine;
    }
    async detect() {
        const detected = await this.detectFromEnvironment();
        const saved = await readContextConfig();
        if (saved.current !== detected) {
            log.info(`Context mismatch: saved=${saved.current}, detected=${detected}, using detected`);
        }
        this.current = detected;
        await this.persistContext(detected, 'auto-detect');
        return detected;
    }
    async detectFromEnvironment() {
        if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true' || process.env.GITLAB_CI === 'true') {
            return 'production';
        }
        try {
            const head = await promises_1.default.readFile(path_1.default.join('.git', 'HEAD'), 'utf-8');
            const ref = head.trim();
            if (ref.includes('refs/heads/main') || ref.includes('refs/heads/master')) {
                return 'production';
            }
            if (ref.includes('refs/heads/emergency') || ref.includes('refs/heads/hotfix')) {
                return 'emergency';
            }
            if (ref.includes('refs/heads/feature') || ref.includes('refs/heads/develop')) {
                return 'development';
            }
        }
        catch {
            log.debug('No git HEAD found, skipping branch detection');
        }
        if (process.env.NODE_ENV === 'production')
            return 'production';
        if (process.env.NODE_ENV === 'development')
            return 'development';
        if (process.env.IDEIA_LEARNING === 'true')
            return 'learning';
        if (process.env.IDEIA_EMERGENCY === 'true')
            return 'emergency';
        return 'development';
    }
    async switch(context) {
        this.current = context;
        await this.persistContext(context, 'manual-switch');
        await this.applyContextConfig(context);
        log.info(`Context switched to: ${context}`);
    }
    async persistContext(context, source) {
        const config = await readContextConfig();
        config.current = context;
        config.history.push({ context, timestamp: new Date().toISOString(), source });
        if (config.history.length > 100)
            config.history = config.history.slice(-100);
        await writeContextConfig(config);
    }
    async applyContextConfig(context) {
        const configMap = {
            production: {
                'security.logLevel': 'error',
                'security.sandbox.enabled': true,
                'security.audit.enabled': true,
                'performance.cache.ttl': 5000,
            },
            development: {
                'security.logLevel': 'debug',
                'security.sandbox.enabled': true,
                'security.audit.enabled': true,
                'performance.cache.ttl': 1000,
            },
            emergency: {
                'security.logLevel': 'debug',
                'security.sandbox.enabled': false,
                'security.audit.enabled': true,
                'performance.cache.ttl': 0,
            },
            learning: {
                'security.logLevel': 'info',
                'security.sandbox.enabled': true,
                'security.audit.enabled': true,
                'performance.cache.ttl': 30000,
            },
        };
        const overrides = configMap[context] || {};
        for (const [key, value] of Object.entries(overrides)) {
            try {
                await this.configEngine.set(key, value);
            }
            catch (_err) {
                log.warn(`Failed to apply context config '${key}': ${String(_err)}`);
            }
        }
    }
    getCurrent() {
        return this.current;
    }
    getContextHistory() {
        const config = fs_1.default.existsSync(CONTEXT_FILE)
            ? JSON.parse(fs_1.default.readFileSync(CONTEXT_FILE, 'utf-8'))
            : { history: [] };
        return config.history || [];
    }
}
exports.ContextDetector = ContextDetector;
//# sourceMappingURL=context-detection.js.map
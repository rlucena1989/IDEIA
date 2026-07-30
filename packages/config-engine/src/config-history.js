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
exports.ConfigHistory = void 0;
exports.createConfigHistory = createConfigHistory;
const logger_1 = require("@ideia/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const log = (0, logger_1.createLogger)('config-history');
const MAX_VERSIONS = 50;
class ConfigHistory {
    versions = [];
    historyDir;
    constructor(historyDir) {
        this.historyDir = historyDir ?? path.join(process.cwd(), '.ai', 'config-history');
        this.load();
    }
    snapshot(config, label) {
        const version = {
            id: this.nextId(),
            timestamp: new Date().toISOString(),
            config: { ...config },
            label,
            checksum: this.checksum(config),
        };
        this.versions.push(version);
        if (this.versions.length > MAX_VERSIONS)
            this.versions.shift();
        this.persist(version);
        log.info(`Config snapshot #${version.id} saved${label ? `: ${label}` : ''}`);
        return version;
    }
    get(id) {
        return this.versions.find(v => v.id === id);
    }
    getLatest() {
        return this.versions[this.versions.length - 1];
    }
    getAll() {
        return [...this.versions];
    }
    diff(idA, idB) {
        const vA = this.get(idA);
        const vB = this.get(idB);
        if (!vA || !vB)
            return [];
        const changes = [];
        const allKeys = new Set([...Object.keys(vA.config), ...Object.keys(vB.config)]);
        for (const key of allKeys) {
            const valA = JSON.stringify(vA.config[key]);
            const valB = JSON.stringify(vB.config[key]);
            if (valA !== valB)
                changes.push({ key, from: vA.config[key], to: vB.config[key] });
        }
        return changes;
    }
    rollback(id) {
        const version = this.get(id);
        if (!version) {
            log.warn(`Version #${id} not found for rollback`);
            return null;
        }
        log.info(`Rolled back to config version #${id}`);
        return { ...version.config };
    }
    search(query) {
        const q = query.toLowerCase();
        return this.versions.filter(v => v.label?.toLowerCase().includes(q) ||
            v.checksum.toLowerCase().includes(q) ||
            JSON.stringify(v.config).toLowerCase().includes(q));
    }
    getLatestVersion() {
        return this.versions[this.versions.length - 1] ?? null;
    }
    getVersionCount() {
        return this.versions.length;
    }
    nextId() {
        return this.versions.length > 0 ? Math.max(...this.versions.map(v => v.id)) + 1 : 1;
    }
    checksum(config) {
        const { createHash } = require('crypto');
        return createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 12);
    }
    load() {
        try {
            if (!fs.existsSync(this.historyDir))
                return;
            for (const file of fs.readdirSync(this.historyDir).sort()) {
                if (file.endsWith('.json')) {
                    const data = JSON.parse(fs.readFileSync(path.join(this.historyDir, file), 'utf-8'));
                    this.versions.push(data);
                }
            }
        }
        catch (_err) {
            log.warn('Failed to load config history', { error: String(_err) });
        }
    }
    persist(version) {
        try {
            if (!fs.existsSync(this.historyDir))
                fs.mkdirSync(this.historyDir, { recursive: true });
            fs.writeFileSync(path.join(this.historyDir, `config-v${String(version.id).padStart(4, '0')}.json`), JSON.stringify(version, null, 2), 'utf-8');
        }
        catch (_err) {
            log.error('Failed to persist config version', { error: String(_err) });
        }
    }
}
exports.ConfigHistory = ConfigHistory;
function createConfigHistory(historyDir) {
    return new ConfigHistory(historyDir);
}
//# sourceMappingURL=config-history.js.map
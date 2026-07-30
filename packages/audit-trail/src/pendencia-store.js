"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendenciaStore = void 0;
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("@ideia/logger");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const logger = (0, logger_1.createLogger)('pendencia-store');
class PendenciaStore {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    append(p) {
        const full = {
            id: crypto_1.default.randomUUID(),
            createdAt: new Date().toISOString(),
            ...p,
        };
        fs_1.default.mkdirSync(path_1.default.dirname(this.filePath), { recursive: true });
        fs_1.default.appendFileSync(this.filePath, JSON.stringify(full) + '\n', 'utf-8');
        return full;
    }
    load() {
        if (!fs_1.default.existsSync(this.filePath))
            return [];
        return fs_1.default.readFileSync(this.filePath, 'utf-8').split('\n').filter(l => l.trim()).map(l => {
            try {
                return JSON.parse(l);
            }
            catch {
                return null;
            }
        }).filter((e) => e !== null);
    }
    query(filter) {
        return this.load().filter(p => {
            for (const [key, value] of Object.entries(filter)) {
                if (!(key in p) || p[key] !== value)
                    return false;
            }
            return true;
        });
    }
    resolve(id) {
        const pendencias = this.load();
        const idx = pendencias.findIndex(p => p.id === id);
        if (idx === -1)
            return false;
        pendencias[idx].status = 'resolved';
        pendencias[idx].resolvedAt = new Date().toISOString();
        fs_1.default.writeFileSync(this.filePath, pendencias.map(p => JSON.stringify(p)).join('\n') + '\n', 'utf-8');
        return true;
    }
    count() {
        const all = this.load();
        const bySeverity = {};
        let open = 0;
        for (const p of all) {
            if (p.status === 'open' || p.status === 'acknowledged') {
                open++;
                bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
            }
        }
        return { open, bySeverity };
    }
}
exports.PendenciaStore = PendenciaStore;
//# sourceMappingURL=pendencia-store.js.map
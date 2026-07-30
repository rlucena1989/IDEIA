"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoRAAdapterStore = void 0;
const crypto_1 = require("crypto");
const logger_1 = require("@ideia/logger");
const log = (0, logger_1.createLogger)('memory-store:lora-adapter');
class LoRAAdapterStore {
    adapters = new Map();
    diffs = [];
    async save(adapter) {
        const existing = Array.from(this.adapters.values())
            .find(a => a.name === adapter.name && a.projectId === adapter.projectId);
        const version = existing ? existing.version + 1 : 1;
        const content = JSON.stringify(adapter);
        const checksum = (0, crypto_1.createHash)('sha256').update(content).digest('hex').slice(0, 16);
        const newAdapter = {
            ...adapter,
            id: `lora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            version,
            checksum,
            createdAt: existing ? existing.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true,
        };
        if (existing) {
            this.diffs.push({
                adapterId: existing.id,
                oldVersion: existing.version,
                newVersion: version,
                metricsDelta: {
                    perplexity: adapter.metrics.perplexity ? (existing.metrics.perplexity || 0) - (adapter.metrics.perplexity || 0) : undefined,
                    evalScore: adapter.metrics.evalScore ? (adapter.metrics.evalScore || 0) - (adapter.metrics.evalScore || 0) : undefined,
                },
                changedAt: new Date().toISOString(),
            });
        }
        this.adapters.set(newAdapter.id, newAdapter);
        log.info('LoRA adapter saved', { id: newAdapter.id, name: newAdapter.name, version });
        return newAdapter;
    }
    async get(adapterId) {
        return this.adapters.get(adapterId);
    }
    async findByProject(projectId, activeOnly = true) {
        return Array.from(this.adapters.values())
            .filter(a => a.projectId === projectId && (!activeOnly || a.active))
            .sort((a, b) => b.version - a.version);
    }
    async findByBaseModel(baseModel) {
        return Array.from(this.adapters.values())
            .filter(a => a.baseModel === baseModel && a.active)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    async deactivate(adapterId) {
        const adapter = this.adapters.get(adapterId);
        if (adapter) {
            adapter.active = false;
            adapter.updatedAt = new Date().toISOString();
            log.info('LoRA adapter deactivated', { id: adapterId });
        }
    }
    async getDiffHistory(adapterId) {
        if (adapterId) {
            return this.diffs.filter(d => d.adapterId === adapterId)
                .sort((a, b) => b.newVersion - a.newVersion);
        }
        return [...this.diffs].sort((a, b) => b.newVersion - a.newVersion);
    }
    async listAll() {
        return Array.from(this.adapters.values());
    }
    async getActiveForProject(projectId) {
        return Array.from(this.adapters.values())
            .filter(a => a.projectId === projectId && a.active)
            .sort((a, b) => b.version - a.version)[0];
    }
}
exports.LoRAAdapterStore = LoRAAdapterStore;
//# sourceMappingURL=lora-adapter-store.js.map
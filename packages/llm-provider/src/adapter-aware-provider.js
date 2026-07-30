"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterAwareProvider = void 0;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('adapter-aware-provider');
class AdapterAwareProvider {
    name = 'adapter-aware';
    baseProvider;
    adapterStore;
    projectId;
    fallbackToBase;
    activeAdapter = null;
    constructor(config) {
        this.baseProvider = config.baseProvider;
        this.adapterStore = config.adapterStore;
        this.projectId = config.projectId;
        this.fallbackToBase = config.fallbackToBase ?? true;
    }
    async setProject(projectId) {
        this.projectId = projectId;
        const adapter = await this.adapterStore.getActiveForProject(projectId);
        this.activeAdapter = adapter || null;
    }
    getActiveAdapter() {
        return this.activeAdapter;
    }
    async chat(request, signal) {
        const adaptedRequest = await this.adaptRequest(request);
        if (this.activeAdapter) {
            const adapterInfo = `[Active adapter: ${this.activeAdapter.name} v${this.activeAdapter.version} | base: ${this.activeAdapter.baseModel} | method: ${this.activeAdapter.method}]\n`;
            if (typeof adaptedRequest === 'object' && 'messages' in adaptedRequest) {
                adaptedRequest.messages = [
                    { role: 'system', content: adapterInfo, ...(adaptedRequest.messages?.[0]?.id ? { id: adaptedRequest.messages[0].id } : {}) },
                    ...(adaptedRequest.messages || []),
                ];
            }
        }
        return this.baseProvider.chat(adaptedRequest, signal);
    }
    async embed(request) {
        return this.baseProvider.embed(request);
    }
    async adaptRequest(request) {
        if (!this.activeAdapter)
            return request;
        const adapterContext = this.buildAdapterContext(this.activeAdapter);
        return {
            ...request,
            messages: [
                { role: 'system', content: adapterContext },
                ...request.messages,
            ],
        };
    }
    buildAdapterContext(adapter) {
        return [
            `# LoRA Adapter Context`,
            `Adapter: ${adapter.name} v${adapter.version}`,
            `Base model: ${adapter.baseModel}`,
            `Method: ${adapter.method} (rank=${adapter.rank}, alpha=${adapter.alpha})`,
            `Target modules: ${adapter.targetModules.join(', ')}`,
            `Project: ${adapter.projectId}`,
            adapter.metrics.perplexity ? `Quality: perplexity=${adapter.metrics.perplexity}` : '',
            adapter.metrics.evalScore ? `Eval score: ${adapter.metrics.evalScore}` : '',
            `Created: ${adapter.createdAt}`,
            `Tags: ${adapter.tags.join(', ')}`,
        ].filter(Boolean).join('\n');
    }
}
exports.AdapterAwareProvider = AdapterAwareProvider;
//# sourceMappingURL=adapter-aware-provider.js.map
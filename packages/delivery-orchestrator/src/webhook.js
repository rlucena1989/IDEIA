"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookManager = void 0;
exports.createWebhookManager = createWebhookManager;
const crypto_1 = require("crypto");
const DEFAULT_CONFIG = {
    url: '',
    events: ['deploy.completed', 'deploy.failed', 'canary.promoted'],
    retryCount: 3,
    retryDelayMs: 5000,
    timeoutMs: 30000,
};
class WebhookManager {
    handlers = new Map();
    configs = new Map();
    registerHandler(event, handler) {
        const handlers = this.handlers.get(event) || [];
        handlers.push(handler);
        this.handlers.set(event, handlers);
    }
    registerWebhook(name, config) {
        this.configs.set(name, { ...DEFAULT_CONFIG, ...config });
    }
    removeWebhook(name) {
        return this.configs.delete(name);
    }
    listWebhooks() {
        return Array.from(this.configs.entries()).map(([name, config]) => ({ name, config }));
    }
    async dispatch(event, payload) {
        const fullPayload = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date().toISOString(),
            ...payload,
            event,
        };
        const localHandlers = this.handlers.get(event) || [];
        await Promise.allSettled(localHandlers.map(h => h(fullPayload).catch(() => { })));
        const matchedConfigs = Array.from(this.configs.values())
            .filter(c => c.events.includes(event) && c.url);
        await Promise.allSettled(matchedConfigs.map(c => this.sendWithRetry(c, fullPayload)));
    }
    async sendWithRetry(config, payload) {
        let lastError;
        for (let attempt = 1; attempt <= config.retryCount; attempt++) {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': payload.event,
                    'X-Webhook-Id': payload.id,
                };
                if (config.secret) {
                    headers['X-Webhook-Signature'] = config.secret;
                }
                const res = await fetch(config.url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    signal: AbortSignal.timeout(config.timeoutMs),
                });
                if (res.ok)
                    return;
                lastError = new Error(`Webhook returned ${res.status}: ${await res.text().catch(() => 'unknown')}`);
            }
            catch (_err) {
                lastError = _err instanceof Error ? _err : new Error(String(_err));
            }
            if (attempt < config.retryCount) {
                await this.delay(config.retryDelayMs);
            }
        }
        throw lastError || new Error('Webhook delivery failed');
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.WebhookManager = WebhookManager;
function createWebhookManager() {
    return new WebhookManager();
}
//# sourceMappingURL=webhook.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRouter = exports.REASONING_ENDPOINTS = exports.UNIVERSAL_ENDPOINTS = void 0;
exports.createDefaultRouter = createDefaultRouter;
const ollama_provider_1 = require("./ollama-provider");
const openai_provider_1 = require("./openai-provider");
const openai_reasoning_provider_1 = require("./openai-reasoning-provider");
const deepseek_provider_1 = require("./deepseek-provider");
const factory_1 = require("./factory");
const gemini_provider_1 = require("./gemini-provider");
const config_engine_1 = require("@ideia/config-engine");
const config = config_engine_1.ConfigManager.getInstance();
exports.UNIVERSAL_ENDPOINTS = [
    { name: 'openai', endpoint: 'https://api.openai.com/v1', defaultModel: 'gpt-4o-mini', envKey: 'OPENAI_API_KEY' },
    { name: 'openrouter', endpoint: 'https://openrouter.ai/api/v1', defaultModel: 'openai/gpt-4o-mini', envKey: 'OPENROUTER_API_KEY' },
    { name: 'deepseek', endpoint: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-chat', envKey: 'DEEPSEEK_API_KEY' },
    { name: 'groq', endpoint: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.1-70b-versatile', envKey: 'GROQ_API_KEY' },
    { name: 'together', endpoint: 'https://api.together.xyz/v1', defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1', envKey: 'TOGETHER_API_KEY' },
    { name: 'deepinfra', endpoint: 'https://api.deepinfra.com/v1/openai', defaultModel: 'mistralai/Mixtral-8x22B-Instruct-v0.1', envKey: 'DEEPINFRA_API_KEY' },
    { name: 'fireworks', endpoint: 'https://api.fireworks.ai/inference/v1', defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct', envKey: 'FIREWORKS_API_KEY' },
    { name: 'perplexity', endpoint: 'https://api.perplexity.ai', defaultModel: 'llama-3.1-sonar-small-128k-online', envKey: 'PERPLEXITY_API_KEY' },
    { name: 'cerebras', endpoint: 'https://api.cerebras.ai/v1', defaultModel: 'llama3.1-8b', envKey: 'CEREBRAS_API_KEY' },
    { name: 'siliconflow', endpoint: 'https://api.siliconflow.cn/v1', defaultModel: 'Pro/Qwen/Qwen2.5-7B-Instruct', envKey: 'SILICONFLOW_API_KEY' },
    { name: 'sambanova', endpoint: 'https://api.sambanova.ai/v1', defaultModel: 'Meta-Llama-3.1-70B-Instruct', envKey: 'SAMBANOVA_API_KEY' },
    { name: 'anyscale', endpoint: 'https://api.endpoints.anyscale.com/v1', defaultModel: 'mistralai/Mistral-7B-Instruct-v0.1', envKey: 'ANYSCALE_API_KEY' },
];
exports.REASONING_ENDPOINTS = [
    { name: 'openai-reasoning', endpoint: 'https://api.openai.com/v1', defaultModel: 'o3-mini', envKey: 'OPENAI_API_KEY' },
    { name: 'deepseek-reasoning', endpoint: 'https://api.deepseek.com/v1', defaultModel: 'deepseek-reasoner', envKey: 'DEEPSEEK_API_KEY' },
];
class ProviderRouter {
    providers = [];
    register(provider) {
        this.providers.push(provider);
    }
    setPriority(names) {
        const ordered = [];
        for (const name of names) {
            const provider = this.providers.find(p => p.name === name);
            if (provider)
                ordered.push(provider);
        }
        const remaining = this.providers.filter(p => !names.includes(p.name));
        this.providers = [...ordered, ...remaining];
    }
    getActive() {
        if (this.providers.length === 0)
            throw new Error('No LLM provider registered');
        return this.providers[0];
    }
    getProvider(name) {
        return this.providers.find(p => p.name === name);
    }
    listProviders() {
        return this.providers.map(p => p.name);
    }
}
exports.ProviderRouter = ProviderRouter;
function resolveApiKey(envKey) {
    if (!envKey)
        return undefined;
    return config.get(envKey) || config.get('IDEIA_LLM_API_KEY');
}
function tryRegisterProvider(router, name, endpoint, defaultModel, envKey) {
    const apiKey = resolveApiKey(envKey);
    if (!apiKey)
        return false;
    try {
        router.register(new openai_provider_1.OpenAIProvider({ endpoint, apiKey, defaultModel, providerName: name }));
        return true;
    }
    catch {
        return false;
    }
}
function createDefaultRouter() {
    const router = new ProviderRouter();
    const masterKey = config.get('IDEIA_LLM_API_KEY');
    const endpoint = config.get('IDEIA_LLM_ENDPOINT') || 'http://localhost:11434';
    const model = config.get('IDEIA_LLM_MODEL');
    // 1. Register Ollama local always (no key needed)
    router.register(new ollama_provider_1.OllamaProvider({ endpoint: 'http://localhost:11434', defaultModel: model || 'deepseek-coder' }));
    // 2. If user set a custom endpoint, register it as primary
    const customEndpoint = config.get('IDEIA_LLM_ENDPOINT');
    if (customEndpoint && !customEndpoint.includes('localhost') && !customEndpoint.includes('127.0.0.1')) {
        try {
            const primary = (0, factory_1.createProvider)({ endpoint: customEndpoint, apiKey: masterKey, defaultModel: model });
            router.register(primary);
        }
        catch {
            // fall through to universal registration
        }
    }
    // 3. Universal registration: try all known endpoints
    const registeredCount = {};
    for (const ep of exports.UNIVERSAL_ENDPOINTS) {
        if (tryRegisterProvider(router, ep.name, ep.endpoint, ep.defaultModel, ep.envKey || 'IDEIA_LLM_API_KEY')) {
            registeredCount[ep.name] = (registeredCount[ep.name] || 0) + 1;
        }
    }
    // 4. Gemini (dedicated provider, different API format)
    const geminiApiKey = config.get('GEMINI_API_KEY') || config.get('GOOGLE_API_KEY') || masterKey;
    if (geminiApiKey) {
        try {
            router.register(new gemini_provider_1.GeminiProvider({ endpoint: 'https://generativelanguage.googleapis.com', apiKey: geminiApiKey, defaultModel: 'gemini-2.0-flash' }));
        }
        catch { /* skip */ }
    }
    // 5. Reasoning providers (o1/o3, deepseek-r1)
    const reasoningEnabled = config.get('IDEIA_LLM_REASONING') === 'true' || config.get('IDEIA_LLM_REASONING') === '1';
    if (reasoningEnabled) {
        for (const ep of exports.REASONING_ENDPOINTS) {
            const key = resolveApiKey(ep.envKey);
            if (key) {
                try {
                    if (ep.name === 'openai-reasoning')
                        router.register(new openai_reasoning_provider_1.OpenAIReasoningProvider({ endpoint: ep.endpoint, apiKey: key, defaultModel: ep.defaultModel }));
                    if (ep.name === 'deepseek-reasoning')
                        router.register(new deepseek_provider_1.DeepSeekReasoningProvider({ endpoint: ep.endpoint, apiKey: key, defaultModel: ep.defaultModel }));
                }
                catch { /* skip */ }
            }
        }
    }
    return router;
}
//# sourceMappingURL=provider-router.js.map
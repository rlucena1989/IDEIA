"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_PROVIDERS = void 0;
exports.createProvider = createProvider;
exports.createProviderFromEnv = createProviderFromEnv;
const ollama_provider_1 = require("./ollama-provider");
const openai_provider_1 = require("./openai-provider");
const openai_reasoning_provider_1 = require("./openai-reasoning-provider");
const deepseek_provider_1 = require("./deepseek-provider");
const gemini_provider_1 = require("./gemini-provider");
const config_engine_1 = require("@ideia/config-engine");
const config = config_engine_1.ConfigManager.getInstance();
exports.KNOWN_PROVIDERS = {
    'openrouter': { name: 'openrouter', defaultModel: 'openai/gpt-4o-mini' },
    'openai': { name: 'openai', defaultModel: 'gpt-4o-mini' },
    'deepseek': { name: 'deepseek', defaultModel: 'deepseek-chat' },
    'together': { name: 'together', defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1' },
    'groq': { name: 'groq', defaultModel: 'llama-3.1-70b-versatile' },
    'deepinfra': { name: 'deepinfra', defaultModel: 'mistralai/Mixtral-8x22B-Instruct-v0.1' },
    'fireworks': { name: 'fireworks', defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
    'perplexity': { name: 'perplexity', defaultModel: 'llama-3.1-sonar-small-128k-online' },
    'anyscale': { name: 'anyscale', defaultModel: 'mistralai/Mistral-7B-Instruct-v0.1' },
    'together': { name: 'together', defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1' },
    'huggingface': { name: 'huggingface', defaultModel: 'meta-llama/Llama-3.2-3B-Instruct', chatOnly: true },
    'cerebras': { name: 'cerebras', defaultModel: 'llama3.1-8b' },
    'siliconflow': { name: 'siliconflow', defaultModel: 'Pro/Qwen/Qwen2.5-7B-Instruct' },
    'sambanova': { name: 'sambanova', defaultModel: 'Meta-Llama-3.1-70B-Instruct' },
};
function detectProviderFromUrl(endpoint) {
    const url = endpoint.toLowerCase();
    for (const [key, _info] of Object.entries(exports.KNOWN_PROVIDERS)) {
        if (url.includes(key))
            return key;
    }
    return null;
}
function createProvider(config) {
    const url = config.endpoint.toLowerCase();
    const model = (config.defaultModel || '').toLowerCase();
    if (config.reasoning) {
        if (model.includes('o1') || model.includes('o3')) {
            if (!config.apiKey)
                throw new Error('OpenAI reasoning endpoint requires an API key.');
            return new openai_reasoning_provider_1.OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'o3-mini' });
        }
        if (model.includes('r1') || model.includes('deepseek-reasoner')) {
            if (!config.apiKey)
                throw new Error('DeepSeek reasoning endpoint requires an API key.');
            return new deepseek_provider_1.DeepSeekReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-reasoner' });
        }
    }
    if (url.includes('googleapis') || url.includes('gemini')) {
        if (!config.apiKey)
            throw new Error('Gemini endpoint requires an API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.');
        return new gemini_provider_1.GeminiProvider({ ...config, apiKey: config.apiKey });
    }
    if (url.includes('anthropic') || url.includes('claude')) {
        if (!config.apiKey)
            throw new Error('Anthropic endpoint requires an API key.');
        return new openai_provider_1.OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'claude-3-haiku', providerName: 'anthropic' });
    }
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama'))
        return new ollama_provider_1.OllamaProvider(config);
    const detected = detectProviderFromUrl(url);
    if (detected) {
        const info = exports.KNOWN_PROVIDERS[detected];
        if (!config.apiKey)
            throw new Error(`${info.name} endpoint requires an API key.`);
        if (model.includes('o1') || model.includes('o3'))
            return new openai_reasoning_provider_1.OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || info.defaultModel });
        return new openai_provider_1.OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || info.defaultModel, providerName: info.name });
    }
    if (model.includes('o1') || model.includes('o3')) {
        if (!config.apiKey)
            throw new Error('Reasoning model requires an API key.');
        return new openai_reasoning_provider_1.OpenAIReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'o3-mini' });
    }
    if (model.includes('r1') || model.includes('deepseek-reasoner')) {
        if (!config.apiKey)
            throw new Error('DeepSeek reasoning model requires an API key.');
        return new deepseek_provider_1.DeepSeekReasoningProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-reasoner' });
    }
    if (config.apiKey)
        return new openai_provider_1.OpenAIProvider({ ...config, apiKey: config.apiKey, providerName: 'openai-compatible' });
    return new ollama_provider_1.OllamaProvider(config);
}
function createProviderFromEnv() {
    const endpoint = config.get('IDEIA_LLM_ENDPOINT') || 'http://localhost:11434';
    const apiKey = config.get('IDEIA_LLM_API_KEY');
    const model = config.get('IDEIA_LLM_MODEL');
    return createProvider({ endpoint, apiKey, defaultModel: model });
}
//# sourceMappingURL=factory.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRouter = exports.OpenAIProvider = exports.OllamaProvider = void 0;
exports.createProvider = createProvider;
exports.createProviderFromEnv = createProviderFromEnv;
exports.createDefaultRouter = createDefaultRouter;
function parseSSEStream(response) {
    let buffer = '';
    return new ReadableStream({
        start(controller) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            function push() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        controller.close();
                        return;
                    }
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            controller.enqueue(trimmed.slice(6));
                        }
                    }
                    push();
                }).catch(e => controller.error(e));
            }
            push();
        },
    });
}
async function* streamJSON(url, body, apiKey, signal) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
    });
    if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
    }
    const stream = parseSSEStream(response);
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        if (value === '[DONE]')
            break;
        try {
            const chunk = JSON.parse(value);
            yield chunk;
        }
        catch { /* skip malformed SSE */ }
    }
}
class OllamaProvider {
    name = 'ollama';
    endpoint;
    defaultModel;
    timeout;
    constructor(config) {
        this.endpoint = config.endpoint.replace(/\/+$/, '');
        this.defaultModel = config.defaultModel || 'deepseek-coder';
        this.timeout = config.timeout || 120000;
    }
    async chat(request, signal) {
        const model = request.model || this.defaultModel;
        if (request.stream) {
            return this.streamChat(model, request.messages, signal);
        }
        const response = await fetch(`${this.endpoint}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: request.messages, stream: false }),
            signal,
        });
        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return {
            content: data.message?.content || '',
            model: data.model || model,
            provider: this.name,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
            } : undefined,
        };
    }
    async *streamChat(model, messages, signal) {
        const url = `${this.endpoint}/api/chat`;
        const body = { model, messages, stream: true };
        for await (const chunk of streamJSON(url, body, undefined, signal)) {
            const message = chunk.message;
            yield {
                content: message?.content || '',
                model: chunk.model || model,
                provider: this.name,
            };
        }
    }
    async embed(request) {
        const response = await fetch(`${this.endpoint}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: request.model || this.defaultModel, input: request.input }),
        });
        if (!response.ok) {
            throw new Error(`Ollama embed error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return {
            embeddings: data.embeddings || [],
            model: data.model || request.model,
            provider: this.name,
        };
    }
}
exports.OllamaProvider = OllamaProvider;
class OpenAIProvider {
    name = 'openai';
    endpoint;
    apiKey;
    defaultModel;
    timeout;
    constructor(config) {
        this.endpoint = config.endpoint.replace(/\/+$/, '');
        this.apiKey = config.apiKey;
        this.defaultModel = config.defaultModel || 'gpt-4o-mini';
        this.timeout = config.timeout || 120000;
        if (!this.apiKey) {
            throw new Error('OpenAIProvider requires an apiKey');
        }
    }
    async chat(request, signal) {
        const model = request.model || this.defaultModel;
        const body = {
            model,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content,
                ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
            })),
            temperature: request.temperature ?? 0.7,
            max_tokens: request.maxTokens,
        };
        if (request.stream) {
            body.stream = true;
            return this.streamChat(body, signal);
        }
        const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
            signal,
        });
        if (!response.ok) {
            throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const choice = data.choices?.[0];
        return {
            content: choice?.message?.content || '',
            model: data.model || model,
            provider: this.name,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
            } : undefined,
        };
    }
    async *streamChat(body, signal) {
        const url = `${this.endpoint}/v1/chat/completions`;
        for await (const chunk of streamJSON(url, body, this.apiKey, signal)) {
            const choices = chunk.choices;
            const choice = choices?.[0];
            const delta = choice?.delta;
            yield {
                content: delta?.content || '',
                model: chunk.model || body.model,
                provider: this.name,
            };
        }
    }
    async embed(request) {
        const response = await fetch(`${this.endpoint}/v1/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: request.model || 'text-embedding-3-small',
                input: request.input,
            }),
        });
        if (!response.ok) {
            throw new Error(`OpenAI embed error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return {
            embeddings: data.data?.map((d) => d.embedding) || [],
            model: data.model || request.model,
            provider: this.name,
            usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
        };
    }
}
exports.OpenAIProvider = OpenAIProvider;
function createProvider(config) {
    const url = config.endpoint.toLowerCase();
    if (url.includes('api.openai.com') || url.includes('openai')) {
        if (!config.apiKey) {
            throw new Error('OpenAI endpoint requires an API key. Set IDEIA_LLM_API_KEY or pass apiKey in config.');
        }
        return new OpenAIProvider({ ...config, apiKey: config.apiKey });
    }
    if (url.includes('anthropic') || url.includes('claude')) {
        if (!config.apiKey) {
            throw new Error('Anthropic endpoint requires an API key.');
        }
        return new OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'claude-3-haiku' });
    }
    if (url.includes('deepseek')) {
        if (!config.apiKey) {
            throw new Error('DeepSeek endpoint requires an API key.');
        }
        return new OpenAIProvider({ ...config, apiKey: config.apiKey, defaultModel: config.defaultModel || 'deepseek-chat' });
    }
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('ollama')) {
        return new OllamaProvider(config);
    }
    if (config.apiKey) {
        return new OpenAIProvider({ ...config, apiKey: config.apiKey });
    }
    return new OllamaProvider(config);
}
function createProviderFromEnv() {
    const endpoint = process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
    const apiKey = process.env.IDEIA_LLM_API_KEY;
    const model = process.env.IDEIA_LLM_MODEL;
    return createProvider({ endpoint, apiKey, defaultModel: model });
}
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
function createDefaultRouter() {
    const router = new ProviderRouter();
    const endpoint = process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
    const apiKey = process.env.IDEIA_LLM_API_KEY;
    const model = process.env.IDEIA_LLM_MODEL;
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
        router.register(new OllamaProvider({ endpoint, defaultModel: model }));
        if (apiKey)
            router.register(new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: model || 'gpt-4o-mini' }));
    }
    else {
        const provider = createProvider({ endpoint, apiKey, defaultModel: model });
        router.register(provider);
        if (!endpoint.includes('openai') && apiKey) {
            router.register(new OpenAIProvider({ endpoint: 'https://api.openai.com/v1', apiKey, defaultModel: 'gpt-4o-mini' }));
        }
    }
    return router;
}
//# sourceMappingURL=index.js.map
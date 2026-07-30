"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const utils_1 = require("./utils");
class OpenAIProvider {
    name;
    endpoint;
    apiKey;
    defaultModel;
    timeout;
    constructor(config) {
        this.name = config.providerName || 'openai';
        this.endpoint = config.endpoint.replace(/\/+$/, '');
        this.apiKey = config.apiKey;
        this.defaultModel = config.defaultModel || 'gpt-4o-mini';
        this.timeout = config.timeout || 120000;
        if (!this.apiKey)
            throw new Error(`${this.name} requires an apiKey`);
    }
    async chat(request, signal) {
        const model = request.model || this.defaultModel;
        const body = {
            model,
            messages: request.messages.map(m => ({ role: m.role, content: m.content, ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}) })),
            temperature: request.temperature ?? 0.7, max_tokens: request.maxTokens,
        };
        if (request.stream) {
            body.stream = true;
            return this.streamChat(body, signal);
        }
        const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
            body: JSON.stringify(body), signal,
        });
        if (!response.ok)
            throw new Error(`OpenAI error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        const choice = data.choices?.[0];
        return {
            content: choice?.message?.content || '', model: data.model || model, provider: this.name,
            usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
        };
    }
    async *streamChat(body, signal) {
        for await (const chunk of (0, utils_1.streamJSON)(`${this.endpoint}/v1/chat/completions`, body, this.apiKey, signal)) {
            const choices = chunk.choices;
            const delta = choices?.[0]?.delta;
            yield { content: delta?.content || '', model: chunk.model || body.model, provider: this.name };
        }
    }
    async embed(request) {
        const response = await fetch(`${this.endpoint}/v1/embeddings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
            body: JSON.stringify({ model: request.model || 'text-embedding-3-small', input: request.input }),
        });
        if (!response.ok)
            throw new Error(`OpenAI embed error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        return {
            embeddings: data.data?.map((d) => d.embedding) || [],
            model: data.model || request.model, provider: this.name,
            usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
        };
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai-provider.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIReasoningProvider = void 0;
const utils_1 = require("./utils");
class OpenAIReasoningProvider {
    name = 'openai-reasoning';
    endpoint;
    apiKey;
    defaultModel;
    timeout;
    constructor(config) {
        this.endpoint = config.endpoint.replace(/\/+$/, '');
        this.apiKey = config.apiKey;
        this.defaultModel = config.defaultModel || 'o3-mini';
        this.timeout = config.timeout || 300000;
        if (!this.apiKey)
            throw new Error('OpenAIReasoningProvider requires an apiKey');
    }
    async chat(request, signal) {
        const model = request.model || this.defaultModel;
        const mappedMessages = request.messages.map(m => ({
            ...m, role: m.role === 'system' ? 'user' : m.role,
        }));
        const body = {
            model, messages: mappedMessages,
            max_completion_tokens: request.maxTokens ?? 16384,
        };
        if (model.startsWith('o1'))
            body.reasoning_effort = 'medium';
        if (request.stream) {
            body.stream = true;
            return this.streamChat(body, signal);
        }
        const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
            body: JSON.stringify(body), signal,
        });
        if (!response.ok)
            throw new Error(`OpenAI reasoning error: ${response.status} ${response.statusText}`);
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
exports.OpenAIReasoningProvider = OpenAIReasoningProvider;
//# sourceMappingURL=openai-reasoning-provider.js.map
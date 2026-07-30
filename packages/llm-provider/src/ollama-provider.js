"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const utils_1 = require("./utils");
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
        if (request.stream)
            return this.streamChat(model, request.messages, signal);
        const response = await fetch(`${this.endpoint}/api/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: request.messages, stream: false }), signal,
        });
        if (!response.ok)
            throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        return {
            content: data.message?.content || '', model: data.model || model, provider: this.name,
            usage: data.usage ? { promptTokens: data.usage.prompt_tokens || 0, completionTokens: data.usage.completion_tokens || 0, totalTokens: data.usage.total_tokens || 0 } : undefined,
        };
    }
    async *streamChat(model, messages, signal) {
        for await (const chunk of (0, utils_1.streamJSON)(`${this.endpoint}/api/chat`, { model, messages, stream: true }, undefined, signal)) {
            const message = chunk.message;
            yield { content: message?.content || '', model: chunk.model || model, provider: this.name };
        }
    }
    async embed(request) {
        const response = await fetch(`${this.endpoint}/api/embed`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: request.model || this.defaultModel, input: request.input }),
        });
        if (!response.ok)
            throw new Error(`Ollama embed error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        return { embeddings: data.embeddings || [], model: data.model || request.model, provider: this.name };
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollama-provider.js.map
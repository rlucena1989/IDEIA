"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
exports.createGeminiProvider = createGeminiProvider;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('gemini-provider');
class GeminiProvider {
    name = 'gemini';
    apiKey;
    defaultModel;
    timeout;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.defaultModel = config.defaultModel || 'gemini-2.0-flash';
        this.timeout = config.timeout || 120000;
        if (!this.apiKey) {
            throw new Error('GeminiProvider requires an apiKey');
        }
    }
    buildContents(messages) {
        const contents = [];
        let systemInstruction = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction += (systemInstruction ? '\n' : '') + msg.content;
                continue;
            }
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            });
        }
        return contents;
    }
    buildRequestBody(messages, stream, maxTokens) {
        const contents = this.buildContents(messages);
        const body = {
            contents,
            generationConfig: {
                maxOutputTokens: maxTokens ?? 8192,
            },
        };
        const systemMessages = messages.filter(m => m.role === 'system');
        if (systemMessages.length > 0) {
            body.systemInstruction = {
                parts: systemMessages.map(m => ({ text: m.content })),
            };
        }
        if (stream) {
            body.generationConfig.candidateCount = 1;
        }
        return body;
    }
    async chat(request, signal) {
        const model = request.model || this.defaultModel;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${request.stream ? 'streamGenerateContent' : 'generateContent'}?key=${this.apiKey}`;
        if (request.stream) {
            return this.streamChat(model, url, request, signal);
        }
        const body = this.buildRequestBody(request.messages, false, request.maxTokens);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });
        if (!response.ok) {
            throw new Error(`Gemini error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
        return {
            content: text,
            model,
            provider: this.name,
            usage: data.usageMetadata ? {
                promptTokens: data.usageMetadata.promptTokenCount || 0,
                completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata.totalTokenCount || 0,
            } : undefined,
        };
    }
    async *streamChat(model, url, request, signal) {
        const body = this.buildRequestBody(request.messages, true, request.maxTokens);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
        });
        if (!response.ok) {
            throw new Error(`Gemini stream error: ${response.status} ${response.statusText}`);
        }
        if (!response.body)
            throw new Error('Response body is null');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: '))
                    continue;
                const jsonStr = trimmed.slice(6);
                if (jsonStr === '[DONE]')
                    return;
                try {
                    const chunk = JSON.parse(jsonStr);
                    const text = chunk.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
                    if (text) {
                        yield { content: text, model, provider: this.name };
                    }
                }
                catch {
                    // skip malformed chunks
                }
            }
        }
    }
    async embed(request) {
        const model = request.model || 'text-embedding-004';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${this.apiKey}`;
        const inputs = Array.isArray(request.input) ? request.input : [request.input];
        const embeddings = [];
        for (const input of inputs) {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: `models/${model}`,
                    content: { parts: [{ text: input }] },
                }),
            });
            if (!response.ok) {
                throw new Error(`Gemini embed error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            embeddings.push(data.embedding?.values || []);
        }
        return { embeddings, model, provider: this.name };
    }
}
exports.GeminiProvider = GeminiProvider;
function createGeminiProvider(config) {
    return new GeminiProvider(config);
}
//# sourceMappingURL=gemini-provider.js.map
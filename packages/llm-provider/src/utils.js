"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamJSON = streamJSON;
function parseSSEStream(response) {
    let buffer = '';
    return new ReadableStream({
        start(controller) {
            if (!response.body)
                throw new Error('Response body is null');
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
//# sourceMappingURL=utils.js.map
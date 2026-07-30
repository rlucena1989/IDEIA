function parseSSEStream(response: Response): ReadableStream<string> {
  let buffer = '';
  return new ReadableStream({
    start(controller) {
      if (!response.body) throw new Error('Response body is null');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      function push(): void {
        reader.read().then(({ done, value }) => {
          if (done) { controller.close(); return; }
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

export async function* streamJSON(url: string, body: unknown, apiKey?: string, signal?: AbortSignal): AsyncIterable<Record<string, unknown>> {
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
    if (done) break;
    if (value === '[DONE]') break;
    try {
      const chunk = JSON.parse(value) as Record<string, unknown>;
      yield chunk;
    } catch { /* skip malformed SSE */ }
  }
}

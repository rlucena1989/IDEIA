# @ideia/acp

AI Context Protocol for IDEIA — unified context payload, compression, cache, provider interface.

## Features

- **ACPOrchestrator** — builds unified ACP payload from multiple context providers
- **Built-in Providers** — Codebase, Git, Stack, Memory
- **Token Budget** — configurable max tokens, automatic truncation
- **Source Filtering** — request only specific context sources
- **Cache** — TTL-based payload caching
- **Zod Schemas** — typed validation for all ACP payloads
- **Protocol** — standard `acp-v1` payload format

## Usage

```typescript
import { ACPOrchestrator, CodebaseProvider, GitProvider } from '@ideia/acp';

const orchestrator = new ACPOrchestrator({ maxTokens: 4000 });
orchestrator.registerProvider(new CodebaseProvider());
orchestrator.registerProvider(new GitProvider());

const payload = await orchestrator.buildPayload();
console.log(payload.protocol); // 'acp-v1'
console.log(payload.sources); // context items
```

## ACP Payload Format

```json
{
  "protocol": "acp-v1",
  "requestId": "uuid",
  "timestamp": "ISO8601",
  "sources": [
    { "id": "...", "source": "codebase", "content": "...", "timestamp": 123, "relevance": 0.8 }
  ],
  "compressed": false,
  "tokenCount": 1234
}
```

## Tests

9 tests covering orchestrator, providers, token estimation, source filtering, and cache.

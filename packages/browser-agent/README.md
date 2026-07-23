# @ideia/browser-agent

> Browser Agent — autonomous browser navigation and session recording.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/browser-agent
```

## Usage

```typescript
import { BrowserAgent, SessionRecorder } from '@ideia/browser-agent';

const agent = new BrowserAgent();
await agent.navigate('https://example.com');
```

## API

- `BrowserAgent` — autonomous browser navigation engine
- `BrowserAction`, `BrowserEngine` — action and engine types
- `SessionRecorder` — records browser sessions for replay
- `Session`, `SessionAction` — session data types

## License

MIT

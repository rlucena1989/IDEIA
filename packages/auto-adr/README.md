# @ideia/auto-adr

> Auto-ADR — autonomous generation and management of Architecture Decision Records.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/auto-adr
```

## Usage

```typescript
import { AutoAdr, createAutoAdr } from '@ideia/auto-adr';

const adr = createAutoAdr();
const record = await adr.generate({ title: 'Use NATS JetStream', context: '...' });
```

## API

- `AutoAdr` — main class for ADR generation and management
- `createAutoAdr()` — factory function
- Types exported from `./types`

## License

MIT

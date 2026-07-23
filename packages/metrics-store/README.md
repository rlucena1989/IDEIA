# @ideia/metrics-store

> Persistent metrics storage for evolution data.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/metrics-store
```

## Usage

```typescript
import { MetricsStore } from '@ideia/metrics-store';

const store = new MetricsStore();
store.record('cycle.duration', 1234, { mode: 'fast' });
const history = store.query({ name: 'cycle.duration', limit: 10 });
```

## API

- `MetricsStore` — persistent metrics storage with record/query capabilities
- Types exported from `./types`

## License

MIT

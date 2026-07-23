# @ideia/logger

> IDEIA structured logger — replaces console.* in production.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/logger
```

## Usage

```typescript
import { getLogger, createLogger, setLogger, lockLogger, LogLevel } from '@ideia/logger';

const log = createLogger('my-module');
log.info('Hello', { user: 'ideia' });
log.error('Something failed', { error: err });
```

## API

- `getLogger()` — returns the root logger instance
- `createLogger(module)` — creates a child logger for a module
- `setLogger(logger)` — replaces the root logger (respects lock)
- `lockLogger()` — prevents further logger replacement
- `LogLevel` — enum: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`
- `Logger` — interface with `debug`, `info`, `warn`, `error`, `fatal`, `child` methods

## License

MIT

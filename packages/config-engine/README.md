# @ideia/config-engine

> Config Engine — gerenciamento de configuração global e por projeto com merge, versionamento e contexto.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/config-engine
```

## Usage

```typescript
import { ConfigEngine, ContextDetector } from '@ideia/config-engine';

const engine = new ConfigEngine();
const config = engine.merge(['global', 'project']);
```

## API

- `ConfigEngine` — main config management with merge and resolution
- `ConfigVersioning` — configuration versioning and rollback
- `ContextDetector` — auto-detects project context for config selection
- `exportConfig()`, `importConfig()` — config portability helpers
- Types exported from `./types`

## License

MIT

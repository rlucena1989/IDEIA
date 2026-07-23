# @ideia/control-tower

> Autonomy Control Tower — status panel, emergency controls, decision log, activity timeline.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/control-tower
```

## Usage

```typescript
import { ControlTower, createControlTower, CliCommands, createCliCommands } from '@ideia/control-tower';

const tower = createControlTower(/* deps */);
const status = tower.getStatus();
```

## API

- `ControlTower` — main autonomy control panel
- `createControlTower()` — factory function
- `CliCommands` — CLI command bindings for the control tower
- `createCliCommands()` — CLI commands factory
- Types exported from `./types`

## License

MIT

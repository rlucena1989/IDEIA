# @ideia/continuity-engine

> IDEIA Decision Continuity Engine — timeline-based escalation, auto-decide with profile matching, and multi-level scheduling.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/continuity-engine
```

## Usage

```typescript
import { ContinuityEngine, ContinuityScheduler } from '@ideia/continuity-engine';

const engine = new ContinuityEngine(/* deps */);
await engine.decide({ task: '...', context: {} });
```

## API

- `ContinuityEngine` — timeline-based decision continuity with escalation
- `ContinuityScheduler` — multi-level scheduling for continuity tasks
- Types exported from `./types`

## License

MIT

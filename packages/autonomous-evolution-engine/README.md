# @ideia/autonomous-evolution-engine

> Core evolution engine — Scanner Pool + Analyzer + Planner + Executor + Verify cycle (S23).

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/autonomous-evolution-engine
```

## Usage

```typescript
import { EvolutionCycle, ScannerPool, AnalyzerEngine, PlannerEngine, ExecutorEngine } from '@ideia/autonomous-evolution-engine';

const cycle = new EvolutionCycle(/* deps */);
await cycle.run();
```

## API

- `EvolutionCycle` — orchestrates the full scan→analyze→plan→execute→verify pipeline
- `ScannerPool` — concurrent scanning of the codebase
- `AnalyzerEngine` — analyzes scan results for improvement opportunities
- `PlannerEngine` — generates execution plans from analysis
- `ExecutorEngine` — executes planned changes
- Types exported from `./types`

## License

MIT

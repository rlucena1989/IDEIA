# @ideia/test-orchestrator

> Test Orchestrator — automated test suite runner, quality dashboard, quality gate integration.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/test-orchestrator
```

## Usage

```typescript
import { TestOrchestrator, createTestOrchestrator, QualityDashboard, createQualityDashboard } from '@ideia/test-orchestrator';

const orchestrator = createTestOrchestrator();
const report = await orchestrator.runAll();
```

## API

- `TestOrchestrator` — runs test suites and aggregates results
- `createTestOrchestrator()` — factory function
- `QualityDashboard` — dashboard for quality metrics and gate status
- `createQualityDashboard()` — dashboard factory
- Types: `TestSuite`, `TestResult`, `TestRunReport`, `QualityDimension`, `DimensionScore`, `QualityOverview`, `GateStatus`

## License

MIT

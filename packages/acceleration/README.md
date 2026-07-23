# @ideia/acceleration

> Acceleration Engine — project diagnostics, health checks, planning, execution, and quality gates with AI-driven feedback loop.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/acceleration
```

## Usage

```typescript
import { runEngineOnce } from '@ideia/acceleration';

const report = await runEngineOnce();
console.log(report.quality.score);
```

## API

- `runEngineOnce()` — run the full acceleration cycle (diagnostics → plan → execute → evaluate)
- `EngineReport` — output with quality, scorecard, coverage, gaps, maturity, and history
- `loadConfig()`, `createPlan()`, `executePlan()`, `qualityGate()` — individual engine stages
- Types: `EngineMode`, `JobResult`, `QualityReport`, `Forecast`, `PrecisionReport`, `Alert`, `HealthCheckResult`

## License

MIT

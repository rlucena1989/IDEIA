# @ideia/slo-monitor

> SLO Monitor — track Service Level Objectives, detect violations, and enforce contract compliance.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/slo-monitor
```

## Usage

```typescript
import { SloMonitor, ContractVerifier, SLO_TARGETS } from '@ideia/slo-monitor';

const monitor = new SloMonitor(/* deps */);
const status = await monitor.checkAll();
```

## API

- `SloMonitor` — monitors SLO targets and detects violations
- `ContractVerifier` — verifies contract compliance against SLOs
- `SLO_TARGETS` — default SLO target definitions
- Types: `SloMetric`, `SloThreshold`, `SloTarget`, `SloStatus`, `SloResult`, `SloViolation`, `SloDashboard`, `ContractBreakage`

## License

MIT

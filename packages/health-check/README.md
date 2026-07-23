# @ideia/health-check

Unified Health Check Framework for IDEIA — aggregator, system checks, component health probes.

## Features

- **HealthCheckAggregator** — register/unregister checkers, collect all checks, calculate overall status
- **SystemChecker** — CPU load, memory usage, disk, uptime
- **ProcessChecker** — PID, uptime, memory usage, Node.js versions
- **Custom Checkers** — extend with your own health probes
- **Zod Schemas** — typed validation for all health responses
- **Standard Response Format** — `{ status, timestamp, version, uptime, checks[] }`

## Usage

```typescript
import { HealthCheckAggregator, SystemChecker } from '@ideia/health-check';

const aggregator = new HealthCheckAggregator({ version: '1.0.0' });

// Add custom checker
aggregator.register({
  name: 'database',
  async check() {
    // ... check database connectivity
    return { name: 'database', status: 'healthy', message: 'Connected' };
  },
});

const health = await aggregator.check();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
```

## API

### HealthCheckAggregator
- `register(checker)` — add a health checker
- `unregister(name)` — remove a checker
- `getRegistered()` — list registered checker names
- `check()` — run all checks and return aggregated result

### Response Schema
```json
{
  "status": "healthy",
  "timestamp": "2026-07-22T...",
  "version": "0.0.0",
  "uptime": 3600,
  "checks": [
    { "name": "system", "status": "healthy", "latency": 5, "metadata": { ... } },
    { "name": "process", "status": "healthy", "message": "PID 1234" }
  ]
}
```

## Tests

12 tests covering aggregator, system checks, custom checkers, error handling, and status aggregation.

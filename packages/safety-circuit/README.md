# @ideia/safety-circuit

> Safety Circuit Breaker — 5 triggers: loop detection, regression spike, breakage chain, resource exhaustion, user override.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/safety-circuit
```

## Usage

```typescript
import { SafetyCircuit, createSafetyCircuit, EmergencyStop, createEmergencyStop } from '@ideia/safety-circuit';

const circuit = createSafetyCircuit();
circuit.monitor('resource-exhaustion', () => process.memoryUsage().heapUsed > 1e9);
```

## API

- `SafetyCircuit` — main circuit breaker with configurable triggers
- `createSafetyCircuit()` — factory function
- `EmergencyStop` — immediate halt mechanism
- `createEmergencyStop()` — emergency stop factory
- Types exported from `./types`

## License

MIT

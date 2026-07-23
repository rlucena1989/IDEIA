# @ideia/bhp

> Bidirectional Help Protocol (BHP) — formal protocol for IDEIA↔IA collaboration.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/bhp
```

## Usage

```typescript
import { BHP, DecisionEngine } from '@ideia/bhp';

const bhp = new BHP(/* config */);
const decision = await bhp.evaluate({ message: '...', context: {} });
```

## API

- `BHP` — main protocol handler for IDEIA↔IA collaboration
- `DecisionEngine` — evaluates and scores decisions based on context
- `DecisionEngineConfig` — configuration for the decision engine
- Types: `BHPPlatform`, `BHPMessageType`, `BHPDecision`, `BHPConfig`, `BHPContext`, `BHPMessage`, `BHPPlan`, `PlanEvaluation`, `BHPProfile`, `DecisionResult`, `CollaborationState`, `ConsensusResult`, `BHPMessageHandler`

## License

MIT

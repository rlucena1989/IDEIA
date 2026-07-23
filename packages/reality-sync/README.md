# @ideia/reality-sync

> Reality Sync Engine — watcher contínuo que mantém código, docs e manifests alinhados em tempo real.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/reality-sync
```

## Usage

```typescript
import { RealitySyncDaemon, createDefaultConfig } from '@ideia/reality-sync';

const daemon = new RealitySyncDaemon(createDefaultConfig('/workspace'));
await daemon.start();
```

## API

- `RealitySyncDaemon` — continuous file watcher that syncs code/docs/manifests
- `syncManifest()`, `syncGaps()`, `syncRegistry()` — individual sync functions
- `ProactiveInitiativeEngine` — proactive improvement initiative engine
- `StudyIntensifier` — auto-detect gaps in studies and generate fixes
- `StudyScanner` — scan studies for compliance
- `BHPProtocol` — BHP protocol integration
- `SafetyCircuit`, `SafetyLayers` — safety mechanisms
- `UsabilityProfileEngine` — user profile recommendations
- `DecisionContinuityEngine` — decision continuity
- `TechRadarAPI`, `TechRadar`, `ADRGenerator`, `ADRValidator`, `AutoStudyGenerator` — supporting tools
- `PathValidator` — path scope enforcement
- `createDefaultConfig(workspaceRoot)` — creates default sync configuration

## License

MIT

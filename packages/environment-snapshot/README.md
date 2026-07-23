# @ideia/environment-snapshot

> Environment Snapshot — project state capture, reproducible environments, snapshot diff/verify.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/environment-snapshot
```

## Usage

```typescript
import { EnvironmentSnapshot, createEnvironmentSnapshot, ReproducibleEnvironment } from '@ideia/environment-snapshot';

const snapshot = createEnvironmentSnapshot();
await snapshot.capture('my-snapshot');
```

## API

- `EnvironmentSnapshot` — capture and manage project state snapshots
- `createEnvironmentSnapshot()` — factory function
- `Snapshot`, `SnapshotFile`, `SnapshotMetadata` — snapshot types
- `ReproducibleEnvironment` — reproduce environments from snapshots
- `createReproducibleEnvironment()` — reproducible env factory
- `EnvReport` — environment report type

## License

MIT

# @ideia/scope-isolation

> Isolation between IDEIA Self-Space and Project Space — path resolution, policy enforcement, and cross-scope violation audit.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/scope-isolation
```

## Usage

```typescript
import { ScopeIsolation, createScopeIsolation, PathValidator, createPathValidator, IsolationPolicy, createIsolationPolicy, ViolationAudit, createViolationAudit } from '@ideia/scope-isolation';

const isolation = createScopeIsolation();
isolation.enforce('/workspace/project', 'read');
```

## API

- `ScopeIsolation` — main scope isolation manager
- `createScopeIsolation()` — factory function
- `PathValidator` — validates paths against allowed scopes
- `createPathValidator()` — path validator factory
- `ScopeViolationError` — error for scope violations
- `IsolationPolicy` — policy definition for scope access
- `createIsolationPolicy()` — policy factory
- `ViolationAudit` — audit trail for cross-scope violations
- `createViolationAudit()` — audit factory
- Types exported from `./types`

## License

MIT

# @ideia/self-optimization-panel

> Self-Optimization Panel — React dashboard data layer with health scores, evolution charts, tech radar, and self-chat.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/self-optimization-panel
```

## Usage

```typescript
import { DashboardService, createDashboardService, SelfChat, createSelfChat, ProjectPanel, createProjectPanel } from '@ideia/self-optimization-panel';

const dashboard = createDashboardService(/* deps */);
const health = await dashboard.getHealthScore();
```

## API

- `DashboardService` — health scores, metrics aggregation, dashboard data
- `createDashboardService()` — factory function
- `SelfChat` — self-reflection chat for the IDEIA agent
- `createSelfChat()` — self-chat factory
- `ProjectPanel` — project-level panel data
- `createProjectPanel()` — project panel factory
- Types exported from `./types`

## License

MIT

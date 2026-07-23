# @ideia/plugin

> IDEIA — IDE that transforms ideas into complete systems. Theia-based plugin with AI agents, chat, and autonomous workflows.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

Install via OpenVSX or clone and build:

```bash
npm install @ideia/plugin
```

## Usage

This package provides Theia browser and backend modules. See `theiaExtensions` in `package.json`:

```json
{
  "frontend": "lib/browser/ideia-frontend-module",
  "backend": "lib/node/ideia-backend-module"
}
```

## API

- Frontend widgets: Chat, Dashboard, Approvals, Diff, File, Studies, Suggestions, Search
- Backend services: Chat, Task, Agent, Memory, Dashboard
- Integrates with: `@ideia/agent-runtime`, `@ideia/core`, `@ideia/event-bus`, `@ideia/llm-provider`, `@ideia/memory-store`, `@ideia/policy-engine`, `@ideia/verification-layer`, `@ideia/delivery-orchestrator`

## License

MIT

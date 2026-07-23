# @ideia/mcp

> Model Context Protocol implementation for tool-based LLM interaction.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/mcp
```

## Usage

```typescript
import { MCPRegistry, createMCPRegistry, createMCPServer, createFileSystemTools, createMcpHttpServer, A2AProtocol } from '@ideia/mcp';

const registry = createMCPRegistry();
const server = createMCPServer({ name: 'my-server' });
server.tools.push(...createFileSystemTools('/workspace'));
registry.register(server);
```

## API

- `MCPRegistry` — register servers, list tools/resources/prompts, call tools, read resources, get prompts
- `createMCPRegistry()` — factory function
- `createMCPServer(config)` — creates a new server instance
- `createFileSystemTools(basePath)` — built-in read/write/list/search/exec tools
- `McpHttpServer` — HTTP transport for MCP
- `createMcpHttpServer()` — HTTP server factory
- `A2AProtocol` — Agent-to-Agent protocol (Agent Card, A2A messages/tasks)
- `createA2AProtocol()` — A2A factory
- Types: `MCPTool`, `MCPResource`, `MCPPrompt`, `MCPServer`, `AgentCard`, `AgentSkill`, `A2AMessage`, `A2ATask`

## License

MIT

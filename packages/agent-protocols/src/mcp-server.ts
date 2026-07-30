import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';
import { MCPTool, MCPResource, MCPPrompt, MCPContext } from './types';
const logger = createLogger('mcp-server');

export class MCPServer {
  private _tools: Map<string, MCPTool> = new Map();
  private _resources: Map<string, MCPResource> = new Map();
  private _prompts: Map<string, MCPPrompt> = new Map();
  private _instructions: string[] = [];
  private _handlers: Map<string, (args: Record<string, unknown>) => Promise<unknown>> = new Map();
  private _serverUrl: string;

  constructor(config: { serverUrl: string; instructions?: string[] }) {
    this._serverUrl = config.serverUrl;
    this._instructions = config.instructions ?? [];
  }

  registerTool(tool: MCPTool, handler: (args: Record<string, unknown>) => Promise<unknown>): void {
    this._tools.set(tool.name, tool);
    this._handlers.set(`tools/call:${tool.name}`, handler);
  }

  registerResource(resource: MCPResource): void {
    this._resources.set(resource.uri, resource);
  }

  registerPrompt(prompt: MCPPrompt): void {
    this._prompts.set(prompt.name, prompt);
  }

  getContext(): MCPContext {
    return {
      tools: Array.from(this._tools.values()),
      resources: Array.from(this._resources.values()),
      prompts: Array.from(this._prompts.values()),
      instructions: [...this._instructions],
    };
  }

  async handleRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize': {
        return {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: { name: 'IDEIA-MCP', version: '3.0.0' },
        };
      }

      case 'tools/list': {
        return { tools: Array.from(this._tools.values()) };
      }

      case 'tools/call': {
        const toolName = params.name as string;
        const tool = this._tools.get(toolName);
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }
        const handler = this._handlers.get(`tools/call:${toolName}`);
        if (!handler) {
          throw new Error(`No handler for tool: ${toolName}`);
        }
        return handler(params.arguments as Record<string, unknown> ?? {});
      }

      case 'resources/list': {
        return { resources: Array.from(this._resources.values()) };
      }

      case 'prompts/list': {
        return { prompts: Array.from(this._prompts.values()) };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  getTool(toolName: string): MCPTool | undefined {
    return this._tools.get(toolName);
  }

  getResource(uri: string): MCPResource | undefined {
    return this._resources.get(uri);
  }

  getPrompt(promptName: string): MCPPrompt | undefined {
    return this._prompts.get(promptName);
  }
}

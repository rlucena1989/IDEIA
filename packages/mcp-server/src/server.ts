import { McpRequest, McpResponse, McpTool, McpResource, McpCapabilities, McpToolHandler, McpTransport, McpServerConfig, McpTimeoutError, DEFAULT_MCP_TIMEOUT_MS } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('server');

export class McpServer {
  private tools = new Map<string, { tool: McpTool; handler: McpToolHandler }>();
  private resources = new Map<string, McpResource>();
  private transport: McpTransport | null = null;
  private requestHandlers = new Map<string, (params?: Record<string, unknown>) => Promise<unknown>>();
  private serverInfo: { name: string; version: string };
  private config: McpServerConfig;

  constructor(options: { name?: string; version?: string; config?: McpServerConfig } = {}) {
    this.serverInfo = { name: options.name || 'ideia-mcp', version: options.version || '0.1.0' };
    this.config = {
      defaultTimeoutMs: options.config?.defaultTimeoutMs ?? DEFAULT_MCP_TIMEOUT_MS,
      maxTimeoutMs: options.config?.maxTimeoutMs ?? 60000,
      toolTimeouts: options.config?.toolTimeouts ?? {},
    };
    this.registerBuiltinMethods();
  }

  private registerBuiltinMethods(): void {
    this.requestHandlers.set('initialize', async (_params) => ({
      protocolVersion: 'mcp-v1',
      capabilities: this.getCapabilities(),
      serverInfo: this.serverInfo,
    }));

    this.requestHandlers.set('tools/list', async () => ({
      tools: [...this.tools.values()].map(t => t.tool),
    }));

    this.requestHandlers.set('tools/call', async (params) => {
      const p = params as Record<string, unknown> | undefined;
      const name = p?.name as string;
      const args = p?.arguments as Record<string, unknown> | undefined;
      if (!name || !this.tools.has(name)) {
        throw new Error(`Tool not found: ${name}`);
      }
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Tool not found: ${name}`);
      const { handler } = tool;
      return handler(args || {});
    });

    this.requestHandlers.set('resources/list', async () => ({
      resources: [...this.resources.values()],
    }));

    this.requestHandlers.set('resources/read', async (params) => {
      const p = params as Record<string, unknown> | undefined;
      const uri = p?.uri as string;
      const resource = this.resources.get(uri);
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }
      return resource;
    });
  }

  registerTool(name: string, tool: Omit<McpTool, 'name'>, handler: McpToolHandler): void {
    this.tools.set(name, { tool: { ...tool, name }, handler });
  }

  registerResource(resource: McpResource): void {
    this.resources.set(resource.uri, resource);
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  unregisterResource(uri: string): void {
    this.resources.delete(uri);
  }

  getTools(): McpTool[] {
    return [...this.tools.values()].map(t => t.tool);
  }

  getResources(): McpResource[] {
    return [...this.resources.values()];
  }

  getCapabilities(): McpCapabilities {
    return {
      tools: this.tools.size > 0 ? {} : undefined,
      resources: this.resources.size > 0 ? {} : undefined,
    };
  }

  setDefaultTimeout(ms: number): void {
    this.config.defaultTimeoutMs = ms;
  }

  setToolTimeout(toolName: string, ms: number): void {
    this.config.toolTimeouts = { ...this.config.toolTimeouts, [toolName]: ms };
  }

  getConfig(): McpServerConfig {
    return { ...this.config };
  }

  connect(transport: McpTransport): void {
    this.transport = transport;
    transport.onMessage(async (msg) => {
      const response = await this.handleRequest(msg);
      transport.send(response);
    });
  }

  disconnect(): void {
    if (this.transport) {
      this.transport.close();
      this.transport = null;
    }
  }

  private async handleRequest(request: McpRequest): Promise<McpResponse> {
    const { id, method, params } = request;

    try {
      const handler = this.requestHandlers.get(method);
      if (!handler) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        };
      }

      let timeoutMs = this.config.defaultTimeoutMs ?? DEFAULT_MCP_TIMEOUT_MS;
      let toolName: string | undefined;
      if (method === 'tools/call' && params) {
        const p = params as Record<string, unknown> | undefined;
        toolName = p?.name as string;
        if (toolName && this.config.toolTimeouts?.[toolName] !== undefined) {
          timeoutMs = this.config.toolTimeouts[toolName];
        }
      }
      timeoutMs = Math.min(timeoutMs, this.config.maxTimeoutMs ?? 60000);

      const result = await this.executeWithTimeout(handler, params, timeoutMs, toolName);
      return { jsonrpc: '2.0', id, result };
    } catch (caught) {
      if (caught instanceof McpTimeoutError) {
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: caught.message },
        };
      }
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: caught instanceof Error ? caught.message : String(caught),
        },
      };
    }
  }

  private async executeWithTimeout(
    handler: (params?: Record<string, unknown>) => Promise<unknown>,
    params: Record<string, unknown> | undefined,
    timeoutMs: number,
    toolName?: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        const name = toolName || 'unknown';
        reject(new McpTimeoutError(`Tool execution timed out after ${timeoutMs}ms: ${name}`, timeoutMs));
      }, timeoutMs);
    });
    return Promise.race([handler(params), timeoutPromise]);
  }
}

export function createMcpServer(options?: { name?: string; version?: string }): McpServer {
  return new McpServer(options);
}

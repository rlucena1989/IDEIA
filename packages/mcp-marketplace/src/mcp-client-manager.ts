import { MCPClientConnection, TransportType, ToolExecutionRequest, ToolExecutionResult, MCPToolDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('mcp-client-manager');

interface ClientSession {
  connection: MCPClientConnection;
  tools: MCPToolDefinition[];
  lastActivity: number;
}

export class MCPClientManager {
  private _sessions: Map<string, ClientSession> = new Map();
  private _defaultTimeout: number;
  private _maxRetries: number;

  constructor(defaultTimeout = 30000, maxRetries = 3) {
    this._defaultTimeout = defaultTimeout;
    this._maxRetries = maxRetries;
  }

  async connect(serverId: string, transport: TransportType, endpoint: string): Promise<MCPClientConnection> {
    const existing = this._sessions.get(serverId);
    if (existing) {
      existing.connection.status = 'connected';
      existing.connection.lastHeartbeat = new Date();
      return existing.connection;
    }
    const connection: MCPClientConnection = {
      serverId,
      transport,
      endpoint,
      status: 'connected',
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };
    const tools = await this._discoverTools(transport, endpoint);
    this._sessions.set(serverId, { connection, tools, lastActivity: Date.now() });
    return connection;
  }

  async disconnect(serverId: string): Promise<void> {
    this._sessions.delete(serverId);
  }

  async execute(request: ToolExecutionRequest, serverId: string): Promise<ToolExecutionResult> {
    const session = this._sessions.get(serverId);
    if (!session) {
      return { success: false, output: '', duration: 0, error: `Not connected to server ${serverId}` };
    }
    const tool = session.tools.find(t => t.name === request.toolName);
    if (!tool) {
      return { success: false, output: '', duration: 0, error: `Tool "${request.toolName}" not found on server ${serverId}` };
    }
    const timeout = request.timeout ?? this._defaultTimeout;
    let lastError: string | undefined;
    const retries = request.retry ?? 0;
    for (let attempt = 0; attempt <= Math.min(retries, this._maxRetries); attempt++) {
      const start = Date.now();
      try {
        const output = await this._callTool(serverId, request.toolName, request.args, timeout);
        session.lastActivity = Date.now();
        return { success: true, output, duration: Date.now() - start };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < Math.min(retries, this._maxRetries)) {
          await this._delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    return { success: false, output: '', duration: 0, error: lastError ?? 'Execution failed' };
  }

  getTools(serverId: string): MCPToolDefinition[] {
    return this._sessions.get(serverId)?.tools ?? [];
  }

  getAllConnectedTools(): Map<string, MCPToolDefinition[]> {
    const result = new Map<string, MCPToolDefinition[]>();
    for (const [serverId, session] of this._sessions) {
      result.set(serverId, session.tools);
    }
    return result;
  }

  getConnection(serverId: string): MCPClientConnection | undefined {
    return this._sessions.get(serverId)?.connection;
  }

  getConnectedServers(): string[] {
    return Array.from(this._sessions.keys());
  }

  isConnected(serverId: string): boolean {
    const session = this._sessions.get(serverId);
    return session?.connection.status === 'connected';
  }

  disconnectAll(): void {
    this._sessions.clear();
  }

  private async _discoverTools(transport: TransportType, _endpoint: string): Promise<MCPToolDefinition[]> {
    return [];
  }

  private async _callTool(_serverId: string, _toolName: string, _args: Record<string, unknown>, _timeout: number): Promise<unknown> {
    return null;
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

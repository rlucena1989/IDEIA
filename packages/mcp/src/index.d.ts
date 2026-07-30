export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    handler: (args: Record<string, unknown>) => Promise<unknown>;
}
export interface MCPResource {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    handler: () => Promise<string | {
        text: string;
    }>;
}
export interface MCPPrompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required?: boolean;
    }>;
    handler: (args: Record<string, string>) => Promise<string>;
}
export interface MCPServer {
    name: string;
    version: string;
    tools: MCPTool[];
    resources: MCPResource[];
    prompts: MCPPrompt[];
}
export declare class MCPRegistry {
    private servers;
    register(server: MCPServer): void;
    unregister(name: string): boolean;
    getServer(name: string): MCPServer | undefined;
    listServers(): MCPServer[];
    getTools(): MCPTool[];
    getResources(): MCPResource[];
    getPrompts(): MCPPrompt[];
    callTool(name: string, args: Record<string, unknown>): Promise<{
        ok: boolean;
        result?: unknown;
        error?: string;
    }>;
    readResource(uri: string): Promise<{
        ok: boolean;
        content?: string;
        error?: string;
    }>;
    getPrompt(name: string, args: Record<string, string>): Promise<{
        ok: boolean;
        prompt?: string;
        error?: string;
    }>;
}
export declare function createMCPServer(config: {
    name: string;
    version?: string;
}): MCPServer;
export declare function createFileSystemTools(basePath: string): MCPTool[];
export declare function createMCPRegistry(): MCPRegistry;
export { McpHttpServer, createMcpHttpServer } from './server-http';
export type { McpHttpServerConfig } from './server-http';
export { A2AProtocol, createA2AProtocol } from './a2a';
export type { AgentCard, AgentSkill, A2AMessage, A2ATask, AgentCardStatus } from './a2a';
export { MCPMarketplace, createMarketplace } from './marketplace';
export type { MarketplaceServerEntry, MarketplaceConfig } from './marketplace';
//# sourceMappingURL=index.d.ts.map
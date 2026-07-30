import type { MCPServer, MCPTool } from './index';
import { MCPRegistry } from './index';
export interface MarketplaceServerEntry {
    name: string;
    version: string;
    description: string;
    registryUrl: string;
    tools: Array<{
        name: string;
        description: string;
    }>;
    installedAt?: string;
    updatedAt?: string;
}
export interface MarketplaceConfig {
    registryUrl?: string;
    storageDir?: string;
}
export declare class MCPMarketplace {
    private registry;
    private registryUrl;
    private storageDir;
    private installed;
    constructor(config?: MarketplaceConfig);
    getRegistry(): MCPRegistry;
    getInstalledServers(): MarketplaceServerEntry[];
    isInstalled(name: string): boolean;
    discover(): Promise<MarketplaceServerEntry[]>;
    install(serverName: string, serverEntry?: MarketplaceServerEntry): Promise<MCPServer>;
    uninstall(serverName: string): boolean;
    publish(server: MCPServer): Promise<{
        ok: boolean;
        url: string;
    }>;
    getTools(): MCPTool[];
    callTool(name: string, args: Record<string, unknown>): Promise<{
        ok: boolean;
        result?: unknown;
        error?: string;
    }>;
    private loadInstalled;
    private saveInstalled;
}
export declare function createMarketplace(config?: MarketplaceConfig): MCPMarketplace;
//# sourceMappingURL=marketplace.d.ts.map
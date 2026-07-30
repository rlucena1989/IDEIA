import { MCPRegistry } from './index';
export interface McpHttpServerConfig {
    port: number;
    registry: MCPRegistry;
    allowedOrigins?: string[];
    apiKey?: string;
    bodySizeLimit?: number;
    tls?: boolean;
}
export declare class McpHttpServer {
    private server;
    private registry;
    private port;
    private allowedOrigins;
    private apiKey;
    private bodySizeLimit;
    private tlsOptions;
    constructor(config: McpHttpServerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private isOriginAllowed;
    private checkAuth;
    private handleRequest;
    private readBody;
}
export declare function createMcpHttpServer(config: McpHttpServerConfig): McpHttpServer;
//# sourceMappingURL=server-http.d.ts.map
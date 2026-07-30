export interface DataLayerConfig {
    type: 'postgres' | 'sqlite';
    url?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    sqlitePath?: string;
    maxConnections?: number;
    vectorDimensions?: number;
}
export interface Migration {
    version: number;
    name: string;
    up: string;
    down?: string;
}
export interface QueryResult<T = Record<string, unknown>> {
    rows: T[];
    rowCount: number;
    durationMs: number;
}
export interface DatabaseAdapter {
    connect(config: DataLayerConfig): Promise<void>;
    disconnect(): Promise<void>;
    query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    migrate(migrations: Migration[]): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=types.d.ts.map
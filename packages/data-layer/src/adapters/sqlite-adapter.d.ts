import { DatabaseAdapter, DataLayerConfig, Migration, QueryResult } from '../types';
export declare class SqliteAdapter implements DatabaseAdapter {
    private db;
    private connected;
    connect(config: DataLayerConfig): Promise<void>;
    disconnect(): Promise<void>;
    query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    migrate(migrations: Migration[]): Promise<void>;
    isConnected(): boolean;
}
//# sourceMappingURL=sqlite-adapter.d.ts.map
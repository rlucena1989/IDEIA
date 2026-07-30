import { DataLayerConfig, DatabaseAdapter, QueryResult } from './types';
import { VectorStore } from './vector-store';
export declare class DataLayer {
    private adapter;
    private vectorStore;
    private connected;
    constructor(config: DataLayerConfig, adapter?: DatabaseAdapter);
    get vector(): VectorStore;
    get adapter_(): DatabaseAdapter;
    get isConnected(): boolean;
    connect(config?: DataLayerConfig): Promise<void>;
    disconnect(): Promise<void>;
    query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    recordDecision(data: {
        actionId: string;
        actionType: string;
        decision: string;
        reason?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    createSession(workspaceRoot: string): Promise<string>;
    endSession(id: string): Promise<void>;
}
export declare function createDataLayer(config?: DataLayerConfig, adapter?: DatabaseAdapter): DataLayer;
//# sourceMappingURL=data-layer.d.ts.map
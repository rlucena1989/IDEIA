import { DatabaseAdapter } from './types';
export interface VectorRecord {
    id: string;
    key: string;
    embedding: number[];
    content: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export declare class VectorStore {
    private dimensions;
    private adapter;
    private ready;
    private isPostgres;
    constructor(adapter: DatabaseAdapter, dimensions?: number, isPostgres?: boolean);
    ensureSchema(): Promise<void>;
    insert(id: string, key: string, embedding: number[], content: string, metadata?: Record<string, unknown>): Promise<void>;
    search(queryEmbedding: number[], limit?: number): Promise<VectorRecord[]>;
    delete(key: string): Promise<void>;
    count(): Promise<number>;
}
//# sourceMappingURL=vector-store.d.ts.map
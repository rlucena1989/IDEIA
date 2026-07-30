import { BaseRepository } from './base-repo';
export interface VectorRecord {
    id: string;
    key: string;
    embedding?: number[];
    content: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface VectorSearchResult extends VectorRecord {
    distance: number;
}
export declare class VectorRepository extends BaseRepository {
    ensureTable(dimensions?: number): Promise<void>;
    ensureIndex(): Promise<void>;
    insert(record: VectorRecord): Promise<void>;
    search(queryEmbedding: number[], limit?: number): Promise<VectorSearchResult[]>;
    findByKey(key: string): Promise<VectorRecord | null>;
    delete(key: string): Promise<void>;
    count(): Promise<number>;
}
//# sourceMappingURL=vector-repo.d.ts.map
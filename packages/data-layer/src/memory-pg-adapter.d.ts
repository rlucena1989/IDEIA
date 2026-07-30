import { DatabaseAdapter } from './types';
import { DecisionRepository } from './repositories/decision-repo';
import { SessionRepository } from './repositories/session-repo';
export interface MemoryRow {
    id: string;
    memory_id: string;
    category: string;
    source: string;
    summary: string;
    tags: string;
    severity: string;
    context: string;
    created_at: string;
}
export declare class MemoryPgAdapter {
    private adapter;
    private decisionRepo;
    private sessionRepo;
    private dbType;
    constructor(adapter: DatabaseAdapter, dbType?: 'postgres' | 'sqlite');
    get decisions(): DecisionRepository;
    get sessions(): SessionRepository;
    ensureSchema(): Promise<void>;
    insertMemory(record: {
        id: string;
        memoryId: string;
        category: string;
        source: string;
        summary: string;
        tags: string[];
        severity: string;
        context?: Record<string, unknown>;
    }): Promise<void>;
    queryMemory(options: {
        category?: string;
        severity?: string;
        source?: string;
        fromDate?: string;
        toDate?: string;
        limit?: number;
        offset?: number;
    }): Promise<MemoryRow[]>;
    searchMemory(query: string, limit?: number): Promise<MemoryRow[]>;
    countMemory(): Promise<number>;
    deleteMemory(memoryId: string): Promise<void>;
    deleteOlderThan(date: string): Promise<number>;
}
//# sourceMappingURL=memory-pg-adapter.d.ts.map
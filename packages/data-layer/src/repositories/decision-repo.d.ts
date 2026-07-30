import { BaseRepository } from './base-repo';
export interface DecisionRecord {
    id: string;
    actionId: string;
    actionType: string;
    decision: string;
    reason?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface DecisionQuery {
    actionType?: string;
    decision?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
}
export declare class DecisionRepository extends BaseRepository {
    ensureTable(): Promise<void>;
    insert(record: DecisionRecord): Promise<void>;
    findById(id: string): Promise<DecisionRecord | null>;
    query(query: DecisionQuery): Promise<DecisionRecord[]>;
    count(query?: DecisionQuery): Promise<number>;
    deleteOlderThan(date: string): Promise<number>;
}
//# sourceMappingURL=decision-repo.d.ts.map
import { BaseRepository } from './base-repo';
export interface AuditRecord {
    id: string;
    actor: string;
    eventType: string;
    target?: string;
    decision: string;
    result: string;
    metadata?: Record<string, unknown>;
    previousHash?: string;
    createdAt: string;
}
export interface AuditQuery {
    eventType?: string;
    actor?: string;
    decision?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
}
export declare class AuditRepository extends BaseRepository {
    ensureTable(): Promise<void>;
    insert(record: AuditRecord): Promise<void>;
    findById(id: string): Promise<AuditRecord | null>;
    query(query: AuditQuery): Promise<AuditRecord[]>;
    getLatestHash(): Promise<string | null>;
    countByEventType(): Promise<Array<{
        eventType: string;
        count: number;
    }>>;
    deleteOlderThan(date: string): Promise<number>;
}
//# sourceMappingURL=audit-repo.d.ts.map
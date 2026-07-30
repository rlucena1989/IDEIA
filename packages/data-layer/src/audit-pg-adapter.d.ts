import { DatabaseAdapter } from './types';
import { AuditRepository } from './repositories/audit-repo';
export declare class AuditPgAdapter {
    private adapter;
    private auditRepo;
    private dbType;
    constructor(adapter: DatabaseAdapter, dbType?: 'postgres' | 'sqlite');
    get repo(): AuditRepository;
    ensureSchema(): Promise<void>;
    recordHash(eventId: string, hash: string, previousHash: string | null): Promise<void>;
    verifyChain(): Promise<{
        valid: boolean;
        totalEvents: number;
        breakAtIndex: number | null;
        breakReason: string | null;
    }>;
    getLatestHash(): Promise<string | null>;
    getStats(): Promise<{
        totalEvents: number;
        chainLength: number;
        oldestEvent: string | null;
        newestEvent: string | null;
    }>;
}
//# sourceMappingURL=audit-pg-adapter.d.ts.map
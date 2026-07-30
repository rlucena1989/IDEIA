import { BaseRepository } from './base-repo';
export interface SessionRecord {
    id: string;
    workspaceRoot: string;
    status: 'active' | 'ended';
    metadata?: Record<string, unknown>;
    startedAt: string;
    endedAt?: string;
}
export declare class SessionRepository extends BaseRepository {
    ensureTable(): Promise<void>;
    insert(session: SessionRecord): Promise<void>;
    findById(id: string): Promise<SessionRecord | null>;
    findByWorkspace(workspaceRoot: string, status?: 'active' | 'ended'): Promise<SessionRecord[]>;
    endSession(id: string): Promise<void>;
    updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
    countActive(): Promise<number>;
}
//# sourceMappingURL=session-repo.d.ts.map
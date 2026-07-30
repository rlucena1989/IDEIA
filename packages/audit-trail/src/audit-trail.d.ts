import { Actor, Decision, EventResult } from '@ideia/contracts';
export interface AuditEvent {
    eventId: string;
    timestamp: string;
    actor: Actor;
    eventType: string;
    target: string;
    decision: Decision | 'approved' | 'rejected';
    approvalStatus?: 'approved' | 'rejected';
    result: EventResult;
    metadata?: Record<string, unknown>;
    previousHash?: string;
}
export interface MerkleProof {
    entryIndex: number;
    entryHash: string;
    siblings: string[];
    rootHash: string;
}
export interface ChainVerificationResult {
    valid: boolean;
    totalEvents: number;
    breakAtIndex: number | null;
    breakReason: string | null;
    currentTipHash: string | null;
}
export declare class AuditTrail {
    private filePath;
    private lineCache;
    private eventCache;
    private indexByEventType;
    private indexByActor;
    private indexByTarget;
    private eventQueue;
    constructor(filePath: string);
    private rebuildIndexes;
    append(event: Omit<AuditEvent, 'eventId' | 'timestamp'>): AuditEvent;
    private persistAsync;
    load(): AuditEvent[];
    query(filter: Partial<AuditEvent>): Promise<AuditEvent[]>;
    loadAsync(): Promise<AuditEvent[]>;
    count(): number;
    verifyChain(): ChainVerificationResult;
    proveEntry(eventId: string): MerkleProof | null;
    verifyEntryInclusion(proof: MerkleProof): boolean;
    getMerkleRoot(): string;
    getChainGaps(): Array<{
        index: number;
        eventId: string;
    }>;
    scheduleVerification(intervalMs: number): {
        stop: () => void;
    };
    getChainTipHash(): string | null;
    private getLastHashSync;
    private rotateIfNeededAsync;
}
//# sourceMappingURL=audit-trail.d.ts.map
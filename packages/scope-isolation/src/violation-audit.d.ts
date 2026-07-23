import { ScopeViolationEvent, Scope } from './types';
import { ScopeViolationError } from './scope-isolation';
export declare class ViolationAudit {
    private events;
    private maxEvents;
    record(event: Omit<ScopeViolationEvent, 'id' | 'timestamp'>): ScopeViolationEvent;
    recordFromError(error: ScopeViolationError): ScopeViolationEvent;
    list(scope?: Scope): ScopeViolationEvent[];
    count(scope?: Scope): number;
    recent(n: number): ScopeViolationEvent[];
    clear(): void;
}
export declare function createViolationAudit(): ViolationAudit;
//# sourceMappingURL=violation-audit.d.ts.map
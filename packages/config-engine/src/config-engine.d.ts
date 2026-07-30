import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import type { ConfigValue, FullConfig, SecurityRule } from './types';
export declare class ConfigEngine {
    private eventBus?;
    private auditTrail?;
    private globalConfig;
    private projectConfig;
    private securityRules;
    private loaded;
    constructor(eventBus?: EventBus | undefined, auditTrail?: AuditTrail | undefined, customRules?: SecurityRule[]);
    load(): Promise<void>;
    private ensureLoaded;
    private getMerged;
    get(path?: string): ConfigValue | undefined;
    set(path: string, value: unknown): Promise<void>;
    setGlobal(path: string, value: unknown): Promise<void>;
    reset(path?: string): Promise<void>;
    getFull(): FullConfig;
    getGlobal(): FullConfig;
    getProject(): FullConfig;
    getValidationErrors(): string[];
    validate(): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private audit;
}
//# sourceMappingURL=config-engine.d.ts.map
import { Scope, IsolationPolicyConfig, CrossSpaceAccess } from './types';
export declare class IsolationPolicy {
    private config;
    constructor(config?: Partial<IsolationPolicyConfig>);
    get crossSpaceAccess(): CrossSpaceAccess;
    get bypassRequired(): boolean;
    get approvalLevel(): string;
    get dryRunFirst(): boolean;
    toConfig(): IsolationPolicyConfig;
    evaluate(source: Scope, target: Scope): {
        allowed: boolean;
        bypassRequired: boolean;
        approvalLevel: string;
        reason: string;
    };
    update(config: Partial<IsolationPolicyConfig>): void;
}
export declare function createIsolationPolicy(config?: Partial<IsolationPolicyConfig>): IsolationPolicy;
//# sourceMappingURL=isolation-policy.d.ts.map
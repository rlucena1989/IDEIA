import type { FullConfig, SecurityCheckResult, SecurityRuleResult } from './types';
interface SecurityRuleDef {
    id: string;
    description: string;
    check: (config: FullConfig) => {
        passed: boolean;
        message?: string;
    };
}
export declare class SecurityRules {
    check(config: FullConfig): SecurityCheckResult;
    evaluateAll(config: FullConfig): {
        passed: boolean;
        rules: SecurityRuleResult[];
        summary: {
            total: number;
            passed: number;
            failed: number;
        };
    };
    getRuleDescription(id: string): string | undefined;
    getRules(): SecurityRuleDef[];
}
export {};
//# sourceMappingURL=security-rules.d.ts.map
import { Decision, RiskLevel } from '@ideia/contracts';
export interface PolicyInput {
    actionType: string;
    resource?: string;
    riskLevel?: RiskLevel;
}
export interface PolicyResult {
    decision: Decision;
    reason: string;
}
export declare function evaluatePolicy(input: PolicyInput): PolicyResult;
export declare function evaluateBatch(inputs: PolicyInput[]): PolicyResult[];
//# sourceMappingURL=policy.d.ts.map
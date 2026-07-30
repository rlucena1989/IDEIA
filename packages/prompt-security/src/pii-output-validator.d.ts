import { SecurityRule, SecurityIssue } from './types';
export interface PiiConfidenceResult {
    issues: SecurityIssue[];
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
export interface PiiContextResult {
    raw: string;
    normalized: string;
    type: string;
    confidence: number;
}
export declare class PiiOutputValidator {
    private enhancedRules;
    constructor();
    validate(output: string): PiiConfidenceResult;
    addRule(rule: SecurityRule): void;
    getRules(): SecurityRule[];
    private evaluateContext;
    private adjustSeverity;
    private getSuggestion;
}
export declare function createPiiOutputValidator(): PiiOutputValidator;
//# sourceMappingURL=pii-output-validator.d.ts.map
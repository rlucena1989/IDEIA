import { RateLimitConfig, ScanResult, SecurityRule, SecurityIssue } from './types';
export interface OutputValidationResult {
    safe: boolean;
    issues: SecurityIssue[];
    sanitizedOutput: string | null;
}
export interface CodeValidationOptions {
    language?: string;
    checkSecrets?: boolean;
    checkInjections?: boolean;
    checkXSS?: boolean;
    checkSQL?: boolean;
    checkServiceSecrets?: boolean;
}
export declare class PromptSecurity {
    private rules;
    private outputRules;
    private codeRules;
    private jailbreakRules;
    private rateLimitMap;
    private piiValidator;
    constructor(customRules?: SecurityRule[]);
    scan(prompt: string): ScanResult;
    validateOutput(output: string): OutputValidationResult;
    validateGeneratedCode(code: string, options?: CodeValidationOptions): OutputValidationResult;
    addCodeRule(rule: SecurityRule): void;
    addJailbreakRule(rule: SecurityRule): void;
    validatePromptInjection(input: string): ScanResult;
    private getInjectionSuggestion;
    private getCodeSuggestion;
    checkRateLimit(config: RateLimitConfig): {
        allowed: boolean;
        remaining: number;
        resetInMs: number;
    };
    addRule(rule: SecurityRule): void;
    addOutputRule(rule: SecurityRule): void;
    getRules(): SecurityRule[];
    private applySanitization;
    private findMatchLength;
    private getSuggestion;
}
export declare function createPromptSecurity(customRules?: SecurityRule[]): PromptSecurity;
//# sourceMappingURL=prompt-security.d.ts.map
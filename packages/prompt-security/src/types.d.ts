export type SanitizationAction = 'block' | 'warn' | 'mask' | 'allow';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export interface SecurityRule {
    pattern: RegExp;
    action: SanitizationAction;
    severity: SeverityLevel;
    category: string;
    description: string;
}
export interface ScanResult {
    safe: boolean;
    issues: SecurityIssue[];
    maskedPrompt?: string;
}
export interface SecurityIssue {
    category: string;
    severity: SeverityLevel;
    action: SanitizationAction;
    match: string;
    position: number;
    description: string;
    suggestion?: string;
}
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    sessionId: string;
}
//# sourceMappingURL=types.d.ts.map
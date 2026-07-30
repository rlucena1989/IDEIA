export interface IndirectInjectionPattern {
    name: string;
    patterns: RegExp[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    subcategory: 'context-injection' | 'tool-output-mimicry' | 'data-source-poisoning';
    description: string;
}
export interface IndirectInjectionMatch {
    pattern: string;
    category: string;
    subcategory: 'context-injection' | 'tool-output-mimicry' | 'data-source-poisoning';
    severity: string;
    match: string;
    position: number;
    confidence: number;
}
export interface IndirectInjectionResult {
    detected: boolean;
    confidence: number;
    matches: IndirectInjectionMatch[];
    overallSeverity: 'low' | 'medium' | 'high' | 'critical';
    subcategoryBreakdown: Record<string, {
        count: number;
        maxSeverity: string;
    }>;
}
export declare class IndirectInjectionDetector {
    private patterns;
    constructor(customPatterns?: IndirectInjectionPattern[]);
    analyze(input: string): IndirectInjectionResult;
    getBlocked(input: string): {
        blocked: boolean;
        reason?: string;
    };
    addPattern(pattern: IndirectInjectionPattern): void;
    getPatterns(): IndirectInjectionPattern[];
    private calculateConfidence;
}
export declare function createIndirectInjectionDetector(): IndirectInjectionDetector;
//# sourceMappingURL=indirect-injection-detector.d.ts.map
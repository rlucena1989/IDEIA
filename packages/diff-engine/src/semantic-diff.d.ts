export interface EquivalenceResult {
    sourceA: string;
    sourceB: string;
    structuralSimilarity: number;
    semanticSimilarity: number;
    overallSimilarity: number;
    equivalent: boolean;
    differences: string[];
    confidence: number;
}
export interface EquivalenceConfig {
    structuralThreshold: number;
    semanticThreshold: number;
    overallThreshold: number;
}
export declare const DEFAULT_EQUIVALENCE_CONFIG: EquivalenceConfig;
export declare function detectEquivalence(sourceA: string, sourceB: string, config?: Partial<EquivalenceConfig>): EquivalenceResult;
//# sourceMappingURL=semantic-diff.d.ts.map
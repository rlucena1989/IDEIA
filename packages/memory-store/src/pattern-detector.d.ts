import { KnowledgeGraph } from './knowledge-graph';
export interface DetectedPattern {
    id: string;
    name: string;
    frequency: number;
    confidence: number;
    firstSeen: string;
    lastSeen: string;
    relatedPatterns: string[];
    source?: 'statistical' | 'llm';
}
export interface PatternDetectorConfig {
    llmEndpoint?: string;
    llmModel?: string;
    minOccurrences?: number;
    filePath?: string;
}
export declare class PatternDetector {
    private config;
    private patterns;
    private entries;
    private dirty;
    private _knowledgeGraph?;
    get knowledgeGraph(): KnowledgeGraph | undefined;
    set knowledgeGraph(kg: KnowledgeGraph | undefined);
    setKnowledgeGraph(kg: KnowledgeGraph): void;
    constructor(config?: PatternDetectorConfig);
    record(text: string, metadata?: Record<string, unknown>): void;
    detect(): DetectedPattern[];
    detectAll(): Promise<DetectedPattern[]>;
    getPatterns(): DetectedPattern[];
    getTrends(): DetectedPattern[];
    getPatternHistory(months?: number): Array<{
        month: string;
        patterns: DetectedPattern[];
        count: number;
    }>;
    private storePatternsInKg;
    private findRelated;
    private mergePatterns;
    save(): void;
    load(): void;
    isDirty(): boolean;
    clear(): void;
    detectWithLLM(history?: string[]): Promise<DetectedPattern[]>;
}
//# sourceMappingURL=pattern-detector.d.ts.map
export interface BiasCategory {
    name: string;
    patterns: RegExp[];
    sensitivity: 'low' | 'medium' | 'high';
    description: string;
}
export interface BiasMatch {
    category: string;
    match: string;
    position: number;
    sensitivity: string;
}
export interface BiasReport {
    detected: boolean;
    matches: BiasMatch[];
    categories: string[];
    overallSensitivity: 'low' | 'medium' | 'high' | 'none';
    suggestion?: string;
}
export declare class BiasDetector {
    private categories;
    constructor(customCategories?: BiasCategory[]);
    analyze(text: string): BiasReport;
    addCategory(category: BiasCategory): void;
    getCategories(): BiasCategory[];
    validateOutput(text: string): BiasReport;
}
export declare function createBiasDetector(): BiasDetector;
//# sourceMappingURL=bias-detector.d.ts.map
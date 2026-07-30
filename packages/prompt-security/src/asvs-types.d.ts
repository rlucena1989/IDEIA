export interface AsvsCheck {
    id: string;
    name: string;
    category: AsvsCategory;
    level: 1 | 2 | 3;
    passed: boolean;
    evidence: string;
    details?: string;
}
export interface AsvsCategoryResult {
    category: AsvsCategory;
    name: string;
    total: number;
    passed: number;
    checks: AsvsCheck[];
}
export interface LevelSummary {
    total: number;
    passed: number;
    percent: number;
}
export interface AsvsReport {
    summary: {
        total: number;
        passed: number;
        failed: number;
        overallPercent: number;
    };
    l1Summary: LevelSummary;
    l2Summary: LevelSummary;
    l3Summary: LevelSummary;
    categories: AsvsCategoryResult[];
    timestamp: string;
}
export type AsvsCategory = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10' | 'V11' | 'V12' | 'V13';
export declare const ASVS_CATEGORIES: Record<AsvsCategory, string>;
export interface AsvsCheckDefinition {
    id: string;
    name: string;
    category: AsvsCategory;
    level: 1 | 2 | 3;
    check: (rootDir: string) => AsvsCheck;
}
//# sourceMappingURL=asvs-types.d.ts.map
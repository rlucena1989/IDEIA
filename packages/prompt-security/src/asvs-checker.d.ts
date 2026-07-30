import type { AsvsCategory, AsvsCategoryResult, AsvsReport } from './asvs-types';
export declare class AsvsChecker {
    private rootDir;
    constructor(rootDir?: string);
    runAll(): AsvsReport;
    runCategories(selected: AsvsCategory[]): AsvsCategoryResult[];
    private buildReport;
}
export declare function formatAsvsReport(report: AsvsReport): string;
//# sourceMappingURL=asvs-checker.d.ts.map
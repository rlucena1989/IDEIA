import { Logger } from '@ideia/logger';
import { ReviewReport, QualityMetrics, CoverageReport, SecurityFinding, Suggestion } from './types-pr';
export declare class ReviewGenerator {
    private logger;
    constructor(logger?: Logger);
    generateReview(diff: string, _context: string): Promise<ReviewReport>;
    checkCodeQuality(_diff: string): Promise<QualityMetrics>;
    checkTestCoverage(_diff: string): Promise<CoverageReport>;
    checkSecurity(_diff: string): Promise<{
        passed: boolean;
        blocked: boolean;
        findings: SecurityFinding[];
        summary: string;
    }>;
    generateSummary(changes: string): string;
    suggestImprovements(_issues: QualityMetrics): Suggestion[];
    private computeGrade;
    private analyzePerformance;
    private makeDecision;
}
//# sourceMappingURL=review-generator.d.ts.map
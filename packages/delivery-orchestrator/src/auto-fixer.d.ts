import { Logger } from '@ideia/logger';
import { FailurePattern, FixPlan, FixResult, CIStatus } from './types-pr';
export declare class AutoFixer {
    private logger;
    private attempts;
    private fixPatterns;
    maxAttempts: number;
    constructor(maxAttempts?: number, logger?: Logger);
    analyzeFailure(failure: CIStatus, _code: string): Promise<FixPlan>;
    applyFix(fixPlan: FixPlan): Promise<FixResult>;
    retryCI(_prId: string): Promise<CIStatus>;
    learnFromFailure(failure: FailurePattern, _fix: FixPlan): void;
    getFixPatterns(): FailurePattern[];
    resetAttempts(): void;
    private initializePatterns;
    private classifyFailure;
}
//# sourceMappingURL=auto-fixer.d.ts.map
import { Logger } from '@ideia/logger';
import { CIStatus, CIResult, Check, CheckStatus, LogEntry, FailurePattern } from './types-pr';
export declare class CIMonitor {
    private logger;
    private watches;
    constructor(logger?: Logger);
    watchCI(prId: string): Promise<CIStatus>;
    getChecks(prId: string): Promise<Check[]>;
    waitForChecks(prId: string, timeout: number): Promise<CIResult>;
    parseLogs(jobId: string): Promise<LogEntry[]>;
    detectFailurePatterns(logs: LogEntry[]): FailurePattern[];
    updateCheckStatus(prId: string, checkName: string, status: CheckStatus): void;
    private delay;
}
//# sourceMappingURL=ci-monitor.d.ts.map
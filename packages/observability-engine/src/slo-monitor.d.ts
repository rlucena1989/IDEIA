import { Logger } from '@ideia/logger';
export type SLOStatus = 'pass' | 'warning' | 'fail';
export interface SLODefinition {
    name: string;
    target: number;
    windowMs: number;
    description?: string;
}
export interface SLOState {
    definition: SLODefinition;
    currentValue: number;
    status: SLOStatus;
    errorBudget: number;
    errorBudgetUsed: number;
    dataPoints: number;
    lastUpdated: string;
}
export interface BurnRate {
    metric: string;
    windowMs: number;
    burnRate: number;
    projectedExhaustionMs: number;
    status: SLOStatus;
}
export declare class SLOMonitor {
    private slos;
    private data;
    private timestamps;
    private logger;
    constructor(logger?: Logger);
    defineSLO(name: string, target: number, windowMs: number, description?: string): void;
    record(metric: string, value: number): void;
    check(metric: string): {
        status: SLOStatus;
        slo: SLODefinition | undefined;
        value: number;
        errorBudget: number;
        errorBudgetUsed: number;
    };
    getSLODashboard(): Array<{
        name: string;
        target: number;
        currentValue: number;
        status: SLOStatus;
        errorBudget: number;
        errorBudgetUsed: number;
        dataPoints: number;
        lastUpdated: string;
    }>;
    getBurnRate(metric: string, windowMs: number): BurnRate;
    listSLOs(): SLODefinition[];
    clear(): void;
}
export declare function createDefaultSLOs(monitor: SLOMonitor): void;
export declare function createSLOMonitor(logger?: Logger): SLOMonitor;
//# sourceMappingURL=slo-monitor.d.ts.map
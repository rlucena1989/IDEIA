import { EventEmitter } from 'node:events';
export interface TriggerStatus {
    loopDetection: {
        active: boolean;
        count: number;
        lastTriggered: number | null;
    };
    regressionSpike: {
        active: boolean;
        coverageDrop: number;
        lastTriggered: number | null;
    };
    breakageChain: {
        active: boolean;
        brokenContracts: number;
        lastTriggered: number | null;
    };
    resourceLimit: {
        active: boolean;
        memoryPercent: number;
        cpuPercent: number;
        lastTriggered: number | null;
    };
    userOverride: {
        active: boolean;
        reason: string | null;
        lastTriggered: number | null;
    };
}
export interface RollbackPoint {
    id: string;
    timestamp: number;
    description: string;
    snapshot: Record<string, unknown>;
}
type TriggerName = 'loopDetection' | 'regressionSpike' | 'breakageChain' | 'resourceLimit' | 'userOverride';
export declare class SafetyCircuit extends EventEmitter {
    private loopFixCounts;
    private triggerStatus;
    private rollbackPoints;
    private paused;
    private stopped;
    private log;
    check(): {
        tripped: boolean;
        activeTriggers: TriggerName[];
    };
    private checkLoopDetection;
    private checkRegressionSpike;
    private checkBreakageChain;
    private checkResourceLimit;
    trip(trigger: TriggerName): void;
    reset(trigger?: TriggerName): void;
    getStatus(): TriggerStatus;
    recordFix(filePath: string): void;
    setCoverageDrop(dropPercent: number): void;
    recordBrokenContract(): void;
    setResourceUsage(memoryPercent: number, cpuPercent: number): void;
    userOverride(reason: string): void;
    emergencyStop(): void;
    emergencyPause(): void;
    emergencyRollback(pointId: string): RollbackPoint | null;
    saveRollbackPoint(description: string, snapshot: Record<string, unknown>): RollbackPoint;
    getRollbackPoints(): RollbackPoint[];
    isPaused(): boolean;
    isStopped(): boolean;
}
export {};
//# sourceMappingURL=safety-circuit.d.ts.map
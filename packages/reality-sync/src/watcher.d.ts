import { EventEmitter } from 'node:events';
import { SyncConfig, SyncResult } from './types';
export interface RealitySyncOptions {
    config: SyncConfig;
    debounceMs?: number;
    verbose?: boolean;
    initiativeIntervalMs?: number;
}
export declare class RealitySyncDaemon extends EventEmitter {
    private watcher;
    private running;
    private debounceTimer;
    private initiativeTimer;
    private pendingSync;
    private options;
    private knownPackages;
    private driftCount;
    private initiative;
    private studyIntensifier;
    private studyScanner;
    private techRadar;
    private autoStudyGenerator;
    constructor(opts: RealitySyncOptions);
    private log;
    private notify;
    private shouldIgnore;
    private scheduleSync;
    private runPendingSyncs;
    private scanForNewPackages;
    private detectDrift;
    private handleChange;
    private handleAdd;
    private handleUnlink;
    recovery(): void;
    start(): void;
    stop(): void;
    isRunning(): boolean;
    getDriftCount(): number;
    runInitiativeCycle(): Promise<void>;
    scanForIssues(): import('./initiative-engine').ScanResult;
    syncNow(): SyncResult[];
}
//# sourceMappingURL=watcher.d.ts.map
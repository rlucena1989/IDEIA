import { DeployEnvironment } from './types';
export type GitOpsProvider = 'github-actions' | 'argo-cd' | 'gitlab-ci' | 'manual';
export interface GitOpsConfig {
    enabled: boolean;
    provider: GitOpsProvider;
    repoPath: string;
    manifestDir: string;
    branch: string;
    autoSync: boolean;
    syncIntervalMs: number;
    autoCommit: boolean;
}
export interface GitOpsSyncResult {
    success: boolean;
    provider: GitOpsProvider;
    currentCommit: string;
    currentVersion?: string;
    driftDetected: boolean;
    lastSyncAt: string;
    error?: string;
}
export interface GitOpsManifest {
    apiVersion: string;
    kind: string;
    metadata: {
        name: string;
        labels?: Record<string, string>;
    };
    spec: {
        version: string;
        environment: DeployEnvironment;
        replicas?: number;
        image?: string;
    };
}
export declare class GitOpsManager {
    private config;
    private lastSyncResult?;
    private syncIntervalId?;
    constructor(config?: Partial<GitOpsConfig>);
    setConfig(config: Partial<GitOpsConfig>): void;
    getConfig(): GitOpsConfig;
    sync(): Promise<GitOpsSyncResult>;
    applyManifest(manifest: GitOpsManifest): Promise<boolean>;
    detectDrift(): Promise<{
        drifted: boolean;
        details: string[];
    }>;
    getLastSync(): GitOpsSyncResult | undefined;
    startAutoSync(): void;
    stopAutoSync(): void;
    private execGit;
}
export declare function createGitOpsManager(config?: Partial<GitOpsConfig>): GitOpsManager;
//# sourceMappingURL=gitops.d.ts.map
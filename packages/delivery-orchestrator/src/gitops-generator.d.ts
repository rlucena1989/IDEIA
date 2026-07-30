export interface GitHubPipelineConfig {
    name: string;
    version: string;
    environment: string;
    branches?: string[];
    deployOnPush?: boolean;
    qualityGates?: string[];
}
export declare function generateGitHubActionsWorkflow(config: GitHubPipelineConfig, cwd: string): string;
export interface GitOpsStatus {
    enabled: boolean;
    provider: 'github-actions' | 'argo-cd' | 'manual';
    workflowPath?: string;
    lastSyncAt?: string;
    currentVersion?: string;
}
export declare function createGitOpsConfig(environment: string, cwd: string, pipelineConfig?: GitHubPipelineConfig): GitOpsStatus;
//# sourceMappingURL=gitops-generator.d.ts.map
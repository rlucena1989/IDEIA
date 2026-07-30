export interface SWEBenchTask {
  id: string;
  repo: string;
  baseCommit: string;
  problemStatement: string;
  hints: string[];
  createdPatch: string;
  testCommands: string[];
  environment: string;
  instanceId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type TaskStatus =
  | 'pending' | 'setting-up-container' | 'checking-out-commit' | 'agent-solving'
  | 'applying-patch' | 'running-tests' | 'resolved' | 'unresolved' | 'error' | 'timeout';

export interface SWEBenchResult {
  taskId: string;
  resolved: boolean;
  generatedPatch: string;
  diffFromGold: string;
  resolvedBy: 'agent' | 'planner-executor' | 'fix-loop' | 'unresolved';
  attempts: number;
  durationMs: number;
  costUsd: number;
  tokensUsed: number;
  logs: string[];
  errorMessage?: string;
  finalStatus: TaskStatus;
}

export interface SWEBenchMetrics {
  totalTasks: number;
  resolved: number;
  resolveRate: number;
  avgDurationMs: number;
  medianDurationMs: number;
  p95DurationMs: number;
  totalCostUsd: number;
  avgCostPerTask: number;
  totalTokens: number;
  avgTokensPerTask: number;
  avgAttemptsPerTask: number;
  errors: number;
  timeouts: number;
}

export interface SWEBenchReport {
  reportId: string;
  runId: string;
  generatedAt: string;
  metadata: { agentVersion: string; modelName: string; maxParallelism: number; timeoutPerTaskMs: number; totalDurationMs: number; };
  metrics: SWEBenchMetrics;
  results: SWEBenchResult[];
  failures: SWEBenchResult[];
  successes: SWEBenchResult[];
}

export interface SWEBenchConfig {
  tasksFilePath: string;
  maxParallelism: number;
  timeoutPerTaskMs: number;
  modelName: string;
  agentVersion: string;
  outputDir: string;
  skipCached: boolean;
  cachePath?: string;
  filterTags?: string[];
  dryRun: boolean;
  taskLimit?: number;
}

export interface ContainerOptions {
  imageName: string; containerName: string; workingDir: string;
  memoryLimit: string; cpuLimit: number; timeoutMs: number;
  envVars: Record<string, string>; networkDisabled: boolean;
}

export interface AgentSolveResult {
  patch: string; explanation: string; tokens: number; costUsd: number; modelUsed: string;
}

export interface SolveOptions {
  repository: string; baseCommit: string; maxTokens: number; temperature: number;
}

export interface ExecResult { stdout: string; stderr: string; exitCode: number; }
export interface PatchResult { applied: boolean; stdout: string; stderr: string; }
export interface TestResult {
  command: string; passed: boolean; stdout: string; stderr: string; durationMs: number; exitCode: number;
}
export interface CommandResult {
    success: boolean;
    output: string;
    code: number;
    durationMs: number;
}
export interface CommandConfig {
    command: string;
    args?: string[];
    timeout?: number;
    cwd?: string;
}
export interface QualityGate {
    name: string;
    command: string;
    args?: string[];
    timeout?: number;
    required?: boolean;
}
export declare const DEFAULT_QUALITY_GATES: QualityGate[];
export declare function runCommand(config: CommandConfig): CommandResult;
export declare function runStep<T>(name: string, fn: () => Promise<T>): Promise<{
    step: string;
    success: boolean;
    durationMs: number;
    error?: string;
    result?: T;
}>;
export declare function runWithRetry<T>(name: string, fn: () => Promise<T>, maxRetries?: number, timeoutMs?: number): Promise<{
    success: boolean;
    result?: T;
    attempts: number;
    durationMs: number;
    error?: string;
}>;
//# sourceMappingURL=command-runner.d.ts.map
import { execFileSync } from 'node:child_process';

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

export const DEFAULT_QUALITY_GATES: QualityGate[] = [
  { name: 'lint', command: 'npx', args: ['eslint', '.', '--max-warnings=0'], timeout: 60000, required: false },
  { name: 'test', command: 'npx', args: ['jest', '--passWithNoTests'], timeout: 120000, required: false },
  { name: 'build', command: 'npx', args: ['tsc', '--noEmit'], timeout: 60000, required: true },
  { name: 'security', command: 'npm', args: ['audit', '--audit-level=high'], timeout: 30000, required: false },
  { name: 'architecture', command: 'npx', args: ['tsc', '-b', '--dry'], timeout: 60000, required: false },
];

export function runCommand(config: CommandConfig): CommandResult {
  const start = Date.now();
  try {
    const output = execFileSync(
      config.command,
      config.args ?? [],
      {
        cwd: config.cwd ?? process.cwd(),
        encoding: 'utf-8',
        timeout: config.timeout ?? 60000,
        stdio: 'pipe',
      }
    );
    return {
      success: true,
      output: output.trim(),
      code: 0,
      durationMs: Date.now() - start,
    };
  } catch (_e) {
    const err = e as { stdout?: string; stderr?: string; status?: number; message?: string };
    return {
      success: false,
      output: err.stdout?.toString().trim() || err.stderr?.toString().trim() || err.message || '',
      code: err.status ?? 1,
      durationMs: Date.now() - start,
    };
  }
}

export async function runStep<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ step: string; success: boolean; durationMs: number; error?: string; result?: T }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { step: name, success: true, durationMs: Date.now() - start, result };
  } catch (_err) {
    return { step: name, success: false, durationMs: Date.now() - start, error: String(err) };
  }
}

export async function runWithRetry<T>(
  name: string,
  fn: () => Promise<T>,
  maxRetries = 3,
  timeoutMs = 30000
): Promise<{ success: boolean; result?: T; attempts: number; durationMs: number; error?: string }> {
  const start = Date.now();
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
      return { success: true, result, attempts: attempt, durationMs: Date.now() - start };
    } catch (_err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { success: false, attempts: maxRetries, durationMs: Date.now() - start, error: lastError };
}

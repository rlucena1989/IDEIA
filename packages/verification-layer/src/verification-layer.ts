import { execFile } from 'child_process';
import { CheckOutcome, CheckType, SuiteResult, VerificationCheck, VerificationSuite } from './types';
export class VerificationLayer {
  private suites: VerificationSuite[] = [];
  private environments: Map<string, string> = new Map();
  registerSuite(suite: VerificationSuite): void { this.suites.push(suite); }
  setEnvironment(name: string, value: string): void { this.environments.set(name, value); }
  async runSuite(name: string): Promise<SuiteResult | null> {
    const suite = this.suites.find(s => s.name === name);
    if (!suite) return null;
    const start = Date.now(); const outcomes: CheckOutcome[] = [];
    if (suite.parallel) {
      const results = await Promise.all(suite.checks.map(c => this.runCheck(c)));
      outcomes.push(...results);
    } else {
      for (const check of suite.checks) outcomes.push(await this.runCheck(check));
    }
    const duration = Date.now() - start;
    const passed = outcomes.filter(o => o.passed).length;
    return { suite: name, total: outcomes.length, passed, failed: outcomes.length - passed, duration, outcomes, score: Math.round(passed / outcomes.length * 100) };
  }
  async runAll(): Promise<SuiteResult[]> {
    const results: SuiteResult[] = [];
    for (const suite of this.suites) { const r = await this.runSuite(suite.name); if (r) results.push(r); }
    return results;
  }
  resolveEnvironment(env: Record<string,string|undefined>): { filled: string[]; missing: string[] } {
    const filled: string[] = []; const missing: string[] = [];
    for (const [key, _val] of this.environments) {
      if (env[key] !== undefined && env[key] !== '') filled.push(key);
      else missing.push(key);
    }
    return { filled, missing };
  }
  async runCheck(check: VerificationCheck): Promise<CheckOutcome> {
    if (!check.command) return { check: check.name, type: check.type, passed: true, duration: 0 };
    const start = Date.now();
    try {
      const [cmd, ...args] = this.parseCommand(check.command);
      const output = await new Promise<string>((resolve, reject) => {
        execFile(cmd, args, { timeout: check.timeout || 30000, encoding: 'utf-8', maxBuffer: 1024 * 1024, windowsHide: true }, (err, stdout) => {
          if (err) reject(err); else resolve(stdout || '');
        });
      });
      const trimmed = (output || '').trim();
      return { check: check.name, type: check.type, passed: true, duration: Date.now() - start, output: trimmed || undefined };
    } catch (_e) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      return {
        check: check.name, type: check.type, passed: false, duration: Date.now() - start,
        output: err.stdout?.toString().trim() || undefined,
        error: err.stderr?.toString().trim() || err.message || String(e),
      };
    }
  }
  private parseCommand(command: string): [string, ...string[]] {
    const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [command];
    const cmd = parts[0]!.replace(/"/g, '');
    const args = parts.slice(1).map(a => a.replace(/"/g, ''));
    return [cmd, ...args];
  }
  getSuites(): VerificationSuite[] { return [...this.suites]; }
}
export function createVerificationLayer(): VerificationLayer { return new VerificationLayer(); }

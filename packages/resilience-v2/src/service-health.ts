export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ServiceHealthResult {
  name: string;
  status: HealthStatus;
  latency: number;
  lastChecked: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export abstract class ServiceHealthCheck {
  abstract readonly name: string;
  private lastResult: ServiceHealthResult | null = null;
  private readonly startTime = Date.now();

  abstract performCheck(): Promise<ServiceHealthResult>;

  async check(): Promise<ServiceHealthResult> {
    const start = Date.now();
    try {
      const result = await this.performCheck();
      result.latency = Date.now() - start;
      result.lastChecked = new Date();
      this.lastResult = result;
      return result;
    } catch (err) {
      const failed: ServiceHealthResult = {
        name: this.name,
        status: 'unhealthy',
        latency: Date.now() - start,
        lastChecked: new Date(),
        error: String(err),
      };
      this.lastResult = failed;
      return failed;
    }
  }

  getLastStatus(): ServiceHealthResult | null {
    return this.lastResult;
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }
}

export class NatsHealthCheck extends ServiceHealthCheck {
  readonly name = 'nats';

  constructor(private options?: { url?: string }) { super(); }

  async performCheck(): Promise<ServiceHealthResult> {
    const url = this.options?.url || process.env.NATS_URL || 'nats://localhost:4222';
    try {
      const mod = await import('@ideia/event-bus').catch(() => null);
      if (mod) {
        const m = mod as Record<string, unknown>;
        const hasGetStatus = typeof m.getStatus === 'function';
        const status =
          (m.status as { connected?: boolean } | undefined) ??
          (hasGetStatus ? (m.getStatus as () => { connected?: boolean })() : undefined) ??
          {};
        const connected = status?.connected;
        if (connected === false) {
          return { name: this.name, status: 'unhealthy', latency: 0, lastChecked: new Date(), error: 'NATS not connected', metadata: { url } };
        }
        return { name: this.name, status: 'healthy', latency: 0, lastChecked: new Date(), metadata: { url, connected } };
      }
      const httpUrl = url.replace('nats://', 'http://') + '/health';
      const response = await fetch(httpUrl, { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (response?.ok) {
        return { name: this.name, status: 'healthy', latency: 0, lastChecked: new Date(), metadata: { url } };
      }
      return { name: this.name, status: 'degraded', latency: 0, lastChecked: new Date(), metadata: { url }, error: 'NATS module unavailable, HTTP health inconclusive' };
    } catch (err) {
      return { name: this.name, status: 'unhealthy', latency: 0, lastChecked: new Date(), error: String(err), metadata: { url } };
    }
  }
}

export class LlmHealthCheck extends ServiceHealthCheck {
  readonly name = 'llm';

  constructor(private options?: { endpoint?: string }) { super(); }

  async performCheck(): Promise<ServiceHealthResult> {
    const endpoint = this.options?.endpoint || process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';
    try {
      const response = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) {
        return { name: this.name, status: 'degraded', latency: 0, lastChecked: new Date(), error: `LLM responded ${response.status}`, metadata: { endpoint } };
      }
      const data = await response.json() as { models?: Array<{ name: string }> };
      const modelCount = (data.models ?? []).length;
      return { name: this.name, status: 'healthy', latency: 0, lastChecked: new Date(), metadata: { endpoint, models: modelCount } };
    } catch (err) {
      return { name: this.name, status: 'unhealthy', latency: 0, lastChecked: new Date(), error: String(err), metadata: { endpoint } };
    }
  }
}

export class FileSystemHealthCheck extends ServiceHealthCheck {
  readonly name = 'filesystem';

  constructor(private paths: string[] = ['.', '.ai', 'packages']) { super(); }

  async performCheck(): Promise<ServiceHealthResult> {
    const { existsSync, accessSync, constants } = await import('fs');
    const results: Array<{ path: string; exists: boolean; writable: boolean }> = [];
    let allOk = true;
    for (const p of this.paths) {
      const exists = existsSync(p);
      let writable = false;
      if (exists) {
        try { accessSync(p, constants.W_OK); writable = true; } catch { writable = false; }
      }
      results.push({ path: p, exists, writable });
      if (!exists || !writable) allOk = false;
    }
    const status: HealthStatus = allOk ? 'healthy' : 'degraded';
    return { name: this.name, status, latency: 0, lastChecked: new Date(), metadata: { paths: results }, error: allOk ? undefined : 'Some paths inaccessible' };
  }
}

export class SearchHealthCheck extends ServiceHealthCheck {
  readonly name = 'search';

  async performCheck(): Promise<ServiceHealthResult> {
    const { execSync } = await import('child_process');
    let rgAvailable = false;
    try {
      execSync('rg --version', { stdio: 'pipe', timeout: 3000, encoding: 'utf-8' });
      rgAvailable = true;
    } catch {
      rgAvailable = false;
    }
    const { existsSync, statSync } = await import('fs');
    let indexSize = 0;
    for (const ip of ['.ai/search-index', 'node_modules/.cache/search']) {
      if (existsSync(ip)) {
        try { indexSize += statSync(ip).size; } catch {}
      }
    }
    if (!rgAvailable) {
      return { name: this.name, status: 'degraded', latency: 0, lastChecked: new Date(), error: 'ripgrep not found', metadata: { ripgrep: rgAvailable, indexSize } };
    }
    return { name: this.name, status: 'healthy', latency: 0, lastChecked: new Date(), metadata: { ripgrep: rgAvailable, indexSize } };
  }
}

export class GitHealthCheck extends ServiceHealthCheck {
  readonly name = 'git';

  async performCheck(): Promise<ServiceHealthResult> {
    const { execSync } = await import('child_process');
    try {
      const version = execSync('git --version', { stdio: 'pipe', timeout: 3000, encoding: 'utf-8' }).toString().trim();
      const { existsSync } = await import('fs');
      const isRepo = existsSync('.git');
      let branch = 'unknown';
      if (isRepo) {
        try {
          branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe', timeout: 3000, encoding: 'utf-8' }).toString().trim();
        } catch { branch = 'detached'; }
      }
      return { name: this.name, status: 'healthy', latency: 0, lastChecked: new Date(), metadata: { version, isRepo, branch } };
    } catch (err) {
      return { name: this.name, status: 'unhealthy', latency: 0, lastChecked: new Date(), error: String(err) };
    }
  }
}

export class HealthCheckRegistry {
  private checks = new Map<string, ServiceHealthCheck>();

  register(check: ServiceHealthCheck): void {
    this.checks.set(check.name, check);
  }

  unregister(name: string): void {
    this.checks.delete(name);
  }

  async runAll(): Promise<ServiceHealthResult[]> {
    return Promise.all(Array.from(this.checks.values()).map(c => c.check()));
  }

  getResults(): Map<string, ServiceHealthResult | null> {
    const results = new Map<string, ServiceHealthResult | null>();
    for (const [name, check] of this.checks) {
      results.set(name, check.getLastStatus());
    }
    return results;
  }

  getSummary(): { total: number; healthy: number; degraded: number; unhealthy: number } {
    let healthy = 0, degraded = 0, unhealthy = 0;
    for (const check of this.checks.values()) {
      const status = check.getLastStatus();
      if (!status || status.status === 'unhealthy') unhealthy++;
      else if (status.status === 'degraded') degraded++;
      else healthy++;
    }
    return { total: this.checks.size, healthy, degraded, unhealthy };
  }
}

export function createCoreServiceHealthChecks(): ServiceHealthCheck[] {
  return [
    new NatsHealthCheck(),
    new LlmHealthCheck(),
    new FileSystemHealthCheck(),
    new SearchHealthCheck(),
    new GitHealthCheck(),
  ];
}

import { createLogger } from '@ideia/logger';
import { HealthCheck, HealthCheckResult } from './types';

import { existsSync } from 'fs';

const log = createLogger('resilience-v2:core-health-checks');

export class NatsHealthCheck implements HealthCheck {
  readonly name = 'nats';

  private get clientUrl(): string {
    return process.env.NATS_URL || 'nats://localhost:4222';
  }

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      const natsMod = await import('@ideia/event-bus').catch(() => null);
      if (!natsMod) {
        return { healthy: false, name: this.name, latencyMs: Date.now() - start, error: '@ideia/event-bus not available' };
      }
      const natsAny = natsMod as Record<string, unknown>;
      const statusVal =
        (natsAny.status as { connected?: boolean } | string | undefined) ??
        ((typeof natsAny.getStatus === 'function' ? (natsAny.getStatus as () => { connected?: boolean } | string)() : undefined) as
          { connected?: boolean } | string | undefined) ??
        {};
      const connected = typeof statusVal === 'object' && statusVal.connected !== undefined ? statusVal.connected : true;
      if (connected === false) {
        return {
          healthy: false,
          name: this.name,
          latencyMs: Date.now() - start,
          error: 'NATS not connected',
          metadata: { url: this.clientUrl },
        };
      }
      return { healthy: true, name: this.name, latencyMs: Date.now() - start, metadata: { url: this.clientUrl, connected } };
    } catch (err) {
      return { healthy: false, name: this.name, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}

export class LlmHealthCheck implements HealthCheck {
  readonly name = 'llm';

  constructor(private endpoint?: string) {}

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    const url = this.endpoint || process.env.IDEIA_LLM_ENDPOINT || 'http://localhost:11434';

    try {
      const response = await fetch(`${url}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return {
          healthy: false,
          name: this.name,
          latencyMs: Date.now() - start,
          error: `LLM responded ${response.status}`,
          metadata: { endpoint: url },
        };
      }
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const availableModels = (data.models ?? []).map((m: { name: string }) => m.name);
      return {
        healthy: true,
        name: this.name,
        latencyMs: Date.now() - start,
        metadata: { endpoint: url, models: availableModels.length, modelList: availableModels.slice(0, 5) },
      };
    } catch (err) {
      return { healthy: false, name: this.name, latencyMs: Date.now() - start, error: String(err), metadata: { endpoint: url } };
    }
  }
}

export class FileSystemHealthCheck implements HealthCheck {
  readonly name = 'filesystem';

  constructor(private paths: string[] = ['.', '.ai', 'packages', 'node_modules']) {}

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    const results: Array<{ path: string; exists: boolean; writable: boolean }> = [];

    let allAccessible = true;
    for (const p of this.paths) {
      const exists = existsSync(p);
      let writable = false;
      if (exists) {
        try {
          const { accessSync, constants } = await import('fs');
          accessSync(p, constants.W_OK);
          writable = true;
        } catch {
          writable = false;
        }
      }
      results.push({ path: p, exists, writable });
      if (!exists || !writable) allAccessible = false;
    }

    const healthy = allAccessible;
    return {
      healthy,
      name: this.name,
      latencyMs: Date.now() - start,
      metadata: { paths: results },
      error: healthy ? undefined : 'Some filesystem paths are inaccessible',
    };
  }
}

export class SearchIndexHealthCheck implements HealthCheck {
  readonly name = 'search';

  private get ripgrepAvailable(): boolean {
    try {
      const { execSync } = require('child_process') as {
        execSync: (cmd: string, options?: { stdio?: string; timeout?: number; encoding?: string }) => Buffer;
      };
      execSync('rg --version', { stdio: 'pipe', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    const rgAvailable = this.ripgrepAvailable;

    let indexSize = 0;
    try {
      const { statSync } = await import('fs');
      const indexPaths = ['.ai/search-index', 'node_modules/.cache/search'];
      for (const ip of indexPaths) {
        if (existsSync(ip)) {
          const stats = statSync(ip);
          indexSize += stats.size;
        }
      }
    } catch (err) {
      log.warn('index size check failed', { error: String(err) });
    }

    const healthy = rgAvailable;
    return {
      healthy,
      name: this.name,
      latencyMs: Date.now() - start,
      metadata: { ripgrepAvailable: rgAvailable, indexSizeBytes: indexSize },
      error: healthy ? undefined : 'ripgrep not found in PATH',
    };
  }
}

export class GitHealthCheck implements HealthCheck {
  readonly name = 'git';

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      type ExecSyncFn = (cmd: string, options?: { stdio?: string; timeout?: number; encoding?: string }) => Buffer;
      const { execSync } = require('child_process') as { execSync: ExecSyncFn };
      const version = execSync('git --version', { stdio: 'pipe', timeout: 3000, encoding: 'utf-8' }).toString().trim();
      const isRepo = existsSync('.git');
      let status = 'unknown';
      if (isRepo) {
        try {
          const branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe', timeout: 3000, encoding: 'utf-8' }).toString().trim();
          status = `branch:${branch}`;
        } catch {
          status = 'detached';
        }
      }

      return {
        healthy: true,
        name: this.name,
        latencyMs: Date.now() - start,
        metadata: { version, isRepo, status },
      };
    } catch (err) {
      return { healthy: false, name: this.name, latencyMs: Date.now() - start, error: String(err) };
    }
  }
}

export function createCoreHealthChecks(): HealthCheck[] {
  return [new NatsHealthCheck(), new LlmHealthCheck(), new FileSystemHealthCheck(), new SearchIndexHealthCheck(), new GitHealthCheck()];
}

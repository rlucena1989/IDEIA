import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { createLogger } from '@ideia/logger';

const log = createLogger('docker-sandbox');

export interface SandboxConfig {
  image?: string;
  memoryLimit?: string;
  cpuLimit?: number;
  timeoutMs?: number;
  workDir?: string;
  readOnly?: boolean;
  blockNetwork?: boolean;
  maxOutputBytes?: number;
}

export interface SandboxResult {
  ok: boolean;
  output: string;
  error: string;
  exitCode: number | null;
  durationMs: number;
  containerId?: string;
}

const DEFAULT_CONFIG: SandboxConfig = {
  image: 'node:20-alpine',
  memoryLimit: '256m',
  cpuLimit: 0.5,
  timeoutMs: 30000,
  readOnly: true,
  blockNetwork: true,
  maxOutputBytes: 10 * 1024 * 1024,
};

export class DockerSandbox {
  private config: SandboxConfig;
  private available: boolean | null = null;

  constructor(config: SandboxConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      await execFilePromise('docker', ['info', '--format', '{{.ServerVersion}}'], {
        timeout: 5000,
      });
      this.available = true;
    } catch (_err) {
      log.debug('Docker not available', { error: String(err) });
      this.available = false;
    }
    return this.available;
  }

  async run(
    command: string,
    files?: Record<string, string>,
    config?: Partial<SandboxConfig>,
  ): Promise<SandboxResult> {
    const cfg = { ...this.config, ...config };
    const start = Date.now();
    const sessionId = randomUUID().slice(0, 8);
    const workDir = cfg.workDir || resolve(process.cwd(), '.sandbox', sessionId);

    if (!(await this.isAvailable())) {
      return {
        ok: false,
        output: '',
        error: 'Docker is not available. Install Docker Desktop to use the sandbox.',
        exitCode: null,
        durationMs: Date.now() - start,
      };
    }

    try {
      if (files && Object.keys(files).length > 0) {
        mkdirSync(workDir, { recursive: true });
        for (const [name, content] of Object.entries(files)) {
          writeFileSync(resolve(workDir, name), content);
        }
      }

      const _networkOpt = cfg.blockNetwork ? '--network' : '';
      const _networkVal = cfg.blockNetwork ? 'none' : '';
      const _readOnlyOpt = cfg.readOnly ? '--read-only' : '';
      const cleanUp = files ? ' && rm -rf /tmp/sandbox/* 2>/dev/null' : '';

      const dockerArgs = [
        'run', '--rm', '--init',
        `--memory=${cfg.memoryLimit}`,
        `--cpus=${cfg.cpuLimit}`,
        '--ulimit', 'nofile=1024:1024',
        '--ulimit', 'nproc=50:50',
      ];
      if (cfg.blockNetwork) {
        dockerArgs.push('--network', 'none');
      }
      if (cfg.readOnly) {
        dockerArgs.push('--read-only');
      }
      if (files) {
        dockerArgs.push('-v', `${workDir}:/tmp/sandbox:ro`);
      }
      dockerArgs.push('--workdir', files ? '/tmp/sandbox' : '/tmp');
      dockerArgs.push('--label', `ai-devkit-sandbox=${sessionId}`);
      dockerArgs.push(cfg.image ?? 'node:18-alpine');
      dockerArgs.push('/bin/sh', '-c', `${command}${cleanUp}`);

      return await new Promise((resolve_) => {
        execFile('docker', dockerArgs,
          {
            timeout: cfg.timeoutMs,
            maxBuffer: cfg.maxOutputBytes,
            encoding: 'utf8',
            windowsHide: true,
            env: { ...process.env, TERM: 'xterm-256color', HOME: '/tmp' },
          },
          (err, stdout, stderr) => {
            const duration = Date.now() - start;
            resolve_({
              ok: !err || (err as {code?: number})?.code === 0,
              output: (stdout || '').slice(0, cfg.maxOutputBytes),
              error: (stderr || '').slice(0, cfg.maxOutputBytes),
              exitCode: err ? ((err as {code?: number})?.code ?? -1) : 0,
              durationMs: duration,
              containerId: sessionId,
            });
          },
        );
      });
    } finally {
      if (files && existsSync(workDir)) {
        try { rmSync(resolve(workDir, '..'), { recursive: true, force: true }); } catch (_err) {
          log.warn('Failed to clean up sandbox directory', { error: String(err) });
        }
      }
    }
  }

  async runScript(
    script: string,
    extension: string = '.mjs',
    config?: Partial<SandboxConfig>,
  ): Promise<SandboxResult> {
    const files: Record<string, string> = {
      [`script${extension}`]: script,
    };
    const cmd = extension === '.ts'
      ? `npx tsx script${extension}`
      : `node script${extension}`;
    return this.run(cmd, files, config);
  }
}

export function createDockerSandbox(config?: SandboxConfig): DockerSandbox {
  return new DockerSandbox(config);
}

function execFilePromise(cmd: string, args: string[], options: { timeout: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { ...options, encoding: 'utf8', windowsHide: true }, (err, stdout) => {
      if (err) reject(err); else resolve(stdout);
    });
  });
}

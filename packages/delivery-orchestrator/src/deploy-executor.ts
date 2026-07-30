import { execFileSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DeployEnvironment } from './types';
const logger = createLogger('deploy-executor');

export interface DeployStep {
  name: string;
  run(): Promise<boolean>;
  timeoutMs: number;
}

export interface DeployResult {
  success: boolean;
  version: string;
  environment: DeployEnvironment;
  steps: Array<{ name: string; success: boolean; durationMs: number; error?: string }>;
  startedAt: string;
  completedAt: string;
  artifacts?: string[];
}

export class PipelineDeployer {
  private cwd: string;
  private deployDir: string;

  constructor(options?: { cwd?: string; deployDir?: string }) {
    this.cwd = options?.cwd ?? process.cwd();
    this.deployDir = options?.deployDir ?? path.join(this.cwd, '.deploy');
  }

  async execute(
    version: string,
    environment: DeployEnvironment,
    artifacts: string[],
    options?: {
      skipBuild?: boolean;
      skipTests?: boolean;
      tagPrefix?: string;
    },
  ): Promise<DeployResult> {
    const startedAt = new Date().toISOString();
    const steps: DeployResult['steps'] = [];

    const pipelineSteps: DeployStep[] = [
      { name: 'build', run: () => this.runBuild(version), timeoutMs: 120000 },
      { name: 'test', run: () => this.runTests(), timeoutMs: 120000 },
      { name: 'tag', run: () => this.runTag(version, environment, options?.tagPrefix), timeoutMs: 30000 },
      { name: 'push', run: () => this.runPush(artifacts, version), timeoutMs: 60000 },
      { name: 'deploy', run: () => this.runDeploy(version, environment, artifacts), timeoutMs: 120000 },
      { name: 'verify', run: () => this.runVerify(version, environment), timeoutMs: 30000 },
    ];

    for (const step of pipelineSteps) {
      if (step.name === 'build' && options?.skipBuild) {
        steps.push({ name: 'build', success: true, durationMs: 0 });
        continue;
      }
      if (step.name === 'test' && options?.skipTests) {
        steps.push({ name: 'test', success: true, durationMs: 0 });
        continue;
      }

      const start = Date.now();
      let success = false;
      let error: string | undefined;

      try {
        success = await Promise.race([
          step.run(),
          new Promise<boolean>((_, reject) => {
            const id = setTimeout(() => reject(new Error(`Step "${step.name}" timed out after ${step.timeoutMs}ms`)), step.timeoutMs);
            if (id.unref) id.unref();
          }),
        ]);
      } catch (__err) {
        success = false;
        error = __err instanceof Error ? __err.message : String(__err);
      }

      steps.push({ name: step.name, success, durationMs: Date.now() - start, error });

      if (!success) {
        return {
          success: false,
          version,
          environment,
          steps,
          startedAt,
          completedAt: new Date().toISOString(),
          artifacts,
        };
      }
    }

    return {
      success: true,
      version,
      environment,
      steps,
      startedAt,
      completedAt: new Date().toISOString(),
      artifacts,
    };
  }

  private async runBuild(version: string): Promise<boolean> {
    try {
      execFileSync('npm', ['run', 'build'], { cwd: this.cwd, encoding: 'utf8', timeout: 120000, stdio: 'pipe' });
      const markerPath = path.join(this.deployDir, 'builds', `${version.replace(/[^a-zA-Z0-9.-]/g, '_')}.marker`);
      fs.mkdirSync(path.dirname(markerPath), { recursive: true });
      fs.writeFileSync(markerPath, new Date().toISOString(), 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  private async runTests(): Promise<boolean> {
    try {
      execFileSync('npm', ['test'], { cwd: this.cwd, encoding: 'utf8', timeout: 120000, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  private async runTag(version: string, environment: DeployEnvironment, prefix?: string): Promise<boolean> {
    try {
      const tag = prefix ? `${prefix}/${environment}/${version}` : `${environment}/${version}`;
      execFileSync('git', ['tag', '-a', tag, '-m', `Deploy ${version} to ${environment}`], {
        cwd: this.cwd, encoding: 'utf8', timeout: 30000, stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  }

  private async runPush(artifacts: string[], version: string): Promise<boolean> {
    try {
      const archiveDir = path.join(this.deployDir, 'archives');
      fs.mkdirSync(archiveDir, { recursive: true });

      const archivePath = path.join(archiveDir, `release-${version.replace(/[^a-zA-Z0-9.-]/g, '_')}.tar`);
      const tarArgs = ['-cf', archivePath, ...artifacts];
      execFileSync('tar', tarArgs, { cwd: this.cwd, encoding: 'utf8', timeout: 60000, stdio: 'pipe' });

      const markerPath = path.join(this.deployDir, 'active-artifact.txt');
      fs.writeFileSync(markerPath, archivePath, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  private async runDeploy(version: string, environment: DeployEnvironment, artifacts: string[]): Promise<boolean> {
    try {
      const targetDir = path.join(this.deployDir, 'current');
      fs.mkdirSync(targetDir, { recursive: true });

      for (const artifact of artifacts) {
        const src = path.resolve(this.cwd, artifact);
        const dest = path.join(targetDir, path.basename(artifact));
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
        }
      }

      const markerPath = path.join(this.deployDir, 'active-version.txt');
      fs.writeFileSync(markerPath, version, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  private async runVerify(version: string, _environment: DeployEnvironment): Promise<boolean> {
    try {
      const markerPath = path.join(this.deployDir, 'active-version.txt');
      if (!fs.existsSync(markerPath)) return false;
      const activeVersion = fs.readFileSync(markerPath, 'utf-8').trim();
      return activeVersion === version;
    } catch {
      return false;
    }
  }

  rollback(version: string): boolean {
    try {
      const backupDir = path.join(this.deployDir, 'backups', version.replace(/[^a-zA-Z0-9.-]/g, '_'));
      const distBackup = path.join(backupDir, 'dist');
      if (fs.existsSync(distBackup)) {
        const targetDir = path.resolve(this.deployDir, '..');
        fs.cpSync(distBackup, path.join(targetDir, 'dist'), { recursive: true });
      }

      const archivePath = path.join(this.deployDir, 'archives', `release-${version.replace(/[^a-zA-Z0-9.-]/g, '_')}.tar`);
      if (fs.existsSync(archivePath)) {
        const targetDir = path.join(this.deployDir, 'current');
        fs.mkdirSync(targetDir, { recursive: true });
        execFileSync('tar', ['-xf', archivePath, '-C', targetDir], { encoding: 'utf8', timeout: 30000, stdio: 'pipe' });
      }

      const markerPath = path.join(this.deployDir, 'active-version.txt');
      fs.writeFileSync(markerPath, version, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }
}

export function createPipelineDeployer(options?: { cwd?: string; deployDir?: string }): PipelineDeployer {
  return new PipelineDeployer(options);
}

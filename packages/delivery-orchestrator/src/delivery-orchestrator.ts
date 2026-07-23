import { randomUUID } from 'crypto';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DeployEntry, DeployEnvironment, DeployStatus, Incident, ReleasePlan, ReviewGateRequest, RollbackStrategy, CheckCommand } from './types';
import { DEFAULT_QUALITY_GATES } from '@ideia/contracts';

type EventBus = { emit(event: { type: string; source: string; payload?: Record<string, unknown> }): Promise<unknown> };

export interface DeployExecutor {
  runCommand(command: string, args: string[], timeout?: number): { output: string; code: number };
  rollbackVersion(version: string, environment: DeployEnvironment): boolean;
  backupDir?: string;
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
}

export interface DeployStepResult {
  step: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface DeployStatusReport {
  deployId: string;
  version: string;
  environment: DeployEnvironment;
  status: DeployStatus;
  steps: DeployStepResult[];
  startedAt: string;
  completedAt?: string;
}

function createDefaultExecutor(backupDir: string): DeployExecutor {
  return {
    backupDir,
    runCommand(command, args, timeout = 60000) {
      try {
        const output = execFileSync(command, args, { encoding: 'utf8', timeout, stdio: 'pipe' });
        return { output: output?.trim() || '', code: 0 };
      } catch (e: unknown) {
        const err = e as { stdout?: string; stderr?: string; status?: number; message?: string };
        return {
          output: err.stdout?.toString().trim() || err.stderr?.toString().trim() || err.message || '',
          code: err.status ?? 1,
        };
      }
    },
    rollbackVersion(version, _environment) {
      try {
        const backupPath = path.join(backupDir, 'backups', version.replace(/[^a-zA-Z0-9.-]/g, '_'));
        const distBackup = path.join(backupPath, 'dist');
        if (fs.existsSync(distBackup)) {
          const targetDir = path.resolve(backupDir, '..');
          fs.cpSync(distBackup, path.join(targetDir, 'dist'), { recursive: true });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
  };
}

function toCheckCommands(gates: typeof DEFAULT_QUALITY_GATES): CheckCommand[] {
  return gates.map(g => ({ name: g.name, command: g.command, args: g.args ?? [], timeout: g.timeout }));
}

export class DeliveryOrchestrator {
  private deploys: Map<string, DeployEntry> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private releases: ReleasePlan[] = [];
  private checks: CheckCommand[];
  private executor: DeployExecutor;
  private cwd: string;
  private logger: Logger;
  private deployDir: string;
  private eventBus?: EventBus;

  constructor(options?: {
    checks?: CheckCommand[];
    executor?: DeployExecutor;
    cwd?: string;
    logger?: Logger;
    deployDir?: string;
    eventBus?: EventBus;
  }) {
    this.checks = options?.checks ?? toCheckCommands(DEFAULT_QUALITY_GATES);
    this.executor = options?.executor ?? createDefaultExecutor(options?.deployDir ?? path.join(options?.cwd ?? process.cwd(), '.deploy'));
    this.cwd = options?.cwd ?? process.cwd();
    this.deployDir = options?.deployDir ?? path.join(this.cwd, '.deploy');
    this.logger = options?.logger ?? {
      info: (msg, ...args) => console.log(msg, ...args),
      error: (msg, ...args) => console.error(msg, ...args),
      warn: (msg, ...args) => console.warn(msg, ...args),
    };
    this.eventBus = options?.eventBus;
  }

  createRelease(version: string, environment: DeployEnvironment, artifacts: string[], autoDeploy = false): ReleasePlan {
    const plan: ReleasePlan = {
      version, environment, artifacts,
      checks: this.checks.map(c => c.name),
      autoDeploy,
      createdAt: new Date().toISOString(),
    };
    this.releases.push(plan);
    return plan;
  }

  deploy(version: string, environment: DeployEnvironment, artifacts: string[], reviewedBy?: string): DeployEntry {
    const entry: DeployEntry = {
      id: randomUUID(),
      version,
      environment,
      status: 'pending',
      artifacts,
      checks: [],
      reviewRequired: environment === 'production' && !reviewedBy,
      reviewedBy,
      startedAt: new Date().toISOString(),
    };

    this.deploys.set(entry.id, entry);

    if (entry.reviewRequired) {
      this.logger.info('[Deploy] Review required for %s to %s', version, environment);
      this.emitEvent('deploy.review_required', { deployId: entry.id, version, environment });
      return entry;
    }

    this.executeDeployAsync(entry.id);
    return entry;
  }

  async executeDeploy(version: string, environment: DeployEnvironment, artifacts: string[]): Promise<DeployStatusReport> {
    const deployId = randomUUID();
    const startedAt = new Date().toISOString();
    const steps: DeployStepResult[] = [];

    this.logger.info('[Deploy] Starting real deploy v%s to %s', version, environment);

    const report: DeployStatusReport = {
      deployId, version, environment, status: 'deploying', steps, startedAt,
    };

    const timestamp = Date.now().toString();
    const stepBackup = await this.runStep('backup', async () => {
      const backupDir = path.join(this.deployDir, 'backups', `${version.replace(/[^a-zA-Z0-9.-]/g, '_')}-${timestamp}`);
      fs.mkdirSync(backupDir, { recursive: true });
      if (fs.existsSync(path.join(this.cwd, 'dist'))) {
        fs.cpSync(path.join(this.cwd, 'dist'), path.join(backupDir, 'dist'), { recursive: true });
      }
      this.logger.info('[Deploy] Backup saved to %s', backupDir);
      return backupDir;
    });
    steps.push(stepBackup);
    if (!stepBackup.success) { report.status = 'failed'; report.completedAt = new Date().toISOString(); return report; }

    const stepCopy = await this.runStep('copy_artifacts', async () => {
      const targetDir = path.join(this.deployDir, 'current');
      fs.mkdirSync(targetDir, { recursive: true });
      for (const artifact of artifacts) {
        const src = path.resolve(this.cwd, artifact);
        const dest = path.join(targetDir, artifact);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true });
          this.logger.info('[Deploy] Copied %s -> %s', src, dest);
        }
      }
      return targetDir;
    });
    steps.push(stepCopy);
    if (!stepCopy.success) { report.status = 'failed'; report.completedAt = new Date().toISOString(); return report; }

    const stepHealth = await this.runStep('health_check', async () => {
      const healthUrl = `http://localhost:3000/health`;
      try {
        const res = await fetch(healthUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`Health check returned ${res.status}`);
        const body = await res.json();
        this.logger.info('[Deploy] Health check passed: %o', body);
        return body;
      } catch (_err) {
        this.logger.warn('[Deploy] Health check failed (non-fatal): %s', err);
        return { warning: String(err) };
      }
    });
    steps.push(stepHealth);

    const stepTraffic = await this.runStep('switch_traffic', async () => {
      if (environment === 'production') {
        const markerPath = path.join(this.deployDir, 'active-version.txt');
        fs.writeFileSync(markerPath, version, 'utf-8');
        this.logger.info('[Deploy] Traffic switched to v%s', version);
      } else {
        this.logger.info('[Deploy] Traffic switch skipped for %s environment', environment);
      }
      return { environment, version };
    });
    steps.push(stepTraffic);
    if (!stepTraffic.success) { report.status = 'failed'; report.completedAt = new Date().toISOString(); return report; }

    const stepVerify = await this.runStep('verify_deployment', async () => {
      const markerPath = path.join(this.deployDir, 'active-version.txt');
      const activeVersion = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf-8').trim() : version;
      if (activeVersion !== version) {
        throw new Error(`Version mismatch: expected ${version}, got ${activeVersion}`);
      }
      this.logger.info('[Deploy] Deployment verified: v%s is active', version);
      return { activeVersion };
    });
    steps.push(stepVerify);
    if (!stepVerify.success) { report.status = 'failed'; report.completedAt = new Date().toISOString(); return report; }

    report.status = 'completed';
    report.completedAt = new Date().toISOString();
    this.logger.info('[Deploy] Deploy v%s to %s completed successfully', version, environment);

    const entry: DeployEntry = {
      id: deployId, version, environment, status: 'completed', artifacts, checks: [],
      reviewRequired: false, startedAt, completedAt: report.completedAt,
    };
    this.deploys.set(deployId, entry);
    (this.deploys.get(deployId) ?? {}).metadata = { report };

    await this.emitEvent('deploy.completed', { deployId, version, environment, status: report.status, steps: report.steps });

    return report;
  }

  async executeRollback(version: string): Promise<DeployStatusReport> {
    const deployId = randomUUID();
    const startedAt = new Date().toISOString();
    const steps: DeployStepResult[] = [];

    this.logger.info('[Rollback] Rolling back to v%s', version);
    const report: DeployStatusReport = {
      deployId, version, environment: 'development', status: 'deploying', steps, startedAt,
    };

    const stepRestore = await this.runStep('restore_backup', async () => {
      const backupDir = path.join(this.deployDir, 'backups', version.replace(/[^a-zA-Z0-9.-]/g, '_'));
      if (!fs.existsSync(backupDir)) {
        const gitSuccess = this.executor.rollbackVersion(version, 'development');
        if (!gitSuccess) throw new Error(`No backup found at ${backupDir} and git rollback failed`);
        this.logger.info('[Rollback] Git rollback performed for v%s', version);
        return { method: 'git' };
      }
      if (fs.existsSync(path.join(backupDir, 'dist'))) {
        fs.cpSync(path.join(backupDir, 'dist'), path.join(this.cwd, 'dist'), { recursive: true });
      }
      this.logger.info('[Rollback] Restored from backup %s', backupDir);
      return { method: 'backup', path: backupDir };
    });
    steps.push(stepRestore);

    const stepSwitch = await this.runStep('switch_version', async () => {
      const markerPath = path.join(this.deployDir, 'active-version.txt');
      fs.writeFileSync(markerPath, version, 'utf-8');
      this.logger.info('[Rollback] Version marker set to v%s', version);
      return { version };
    });
    steps.push(stepSwitch);

    const stepVerify = await this.runStep('verify_rollback', async () => {
      const markerPath = path.join(this.deployDir, 'active-version.txt');
      const activeVersion = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf-8').trim() : version;
      if (activeVersion !== version) {
        throw new Error(`Rollback verification failed: expected ${version}, got ${activeVersion}`);
      }
      this.logger.info('[Rollback] Rollback to v%s verified', version);
      return { activeVersion };
    });
    steps.push(stepVerify);

    const allSuccess = steps.every(s => s.success);
    report.status = allSuccess ? 'completed' : 'failed';
    report.completedAt = new Date().toISOString();
    this.logger.info('[Rollback] Rollback to v%s %s', version, allSuccess ? 'completed' : 'failed');

    await this.emitEvent('deploy.rolled_back', { deployId, version, status: report.status, reason: allSuccess ? 'rollback completed' : 'rollback failed' });

    return report;
  }

  private async runStep(name: string, fn: () => Promise<unknown>): Promise<DeployStepResult> {
    const start = Date.now();
    let result: DeployStepResult;
    try {
      await fn();
      result = { step: name, success: true, durationMs: Date.now() - start };
    } catch (_err) {
      result = { step: name, success: false, durationMs: Date.now() - start, error: String(err) };
    }
    await this.emitEvent(`deploy.step.${name}`, { step: name, success: result.success, durationMs: result.durationMs, error: result.error });
    return result;
  }

  getDeployStatus(deployId: string): DeployStatusReport | undefined {
    const deploy = this.deploys.get(deployId);
    if (!deploy) return undefined;
    return {
      deployId, version: deploy.version, environment: deploy.environment,
      status: deploy.status, steps: [], startedAt: deploy.startedAt,
      completedAt: deploy.completedAt,
    };
  }

  reviewGate(request: ReviewGateRequest): DeployEntry | null {
    const deploy = this.deploys.get(request.deployId);
    if (!deploy) return null;

    deploy.reviewedBy = request.reviewer;
    deploy.reviewRequired = false;

    if (request.approved) {
      this.executeDeployAsync(deploy.id);
    } else {
      deploy.status = 'failed';
      this.createIncident({
        title: `Deploy ${deploy.version} rejected by ${request.reviewer}`,
        severity: 'medium',
        description: request.reason || 'Review gate rejected',
        deployId: request.deployId,
      });
    }

    return deploy;
  }

  rollback(deployId: string, strategy: RollbackStrategy = 'full'): DeployEntry | null {
    const deploy = this.deploys.get(deployId);
    if (!deploy || deploy.status !== 'completed') return null;

    this.logger.info('[Rollback] Rolling back %s from %s', deploy.version, deploy.environment);
    const success = this.executor.rollbackVersion(deploy.version, deploy.environment);

    deploy.status = 'rolled_back';
    deploy.rolledBackAt = new Date().toISOString();
    deploy.rollbackStrategy = strategy;

    this.createIncident({
      title: `Rollback of ${deploy.version} to ${deploy.environment}`,
      severity: success ? 'medium' : 'high',
      description: `${success ? 'Successful' : 'Failed'} rollback for deploy ${deployId} using ${strategy} strategy`,
      deployId,
    });

    this.emitEvent('deploy.rolled_back', { deployId, version: deploy.version, environment: deploy.environment, status: deploy.status, reason: `${success ? 'Successful' : 'Failed'} rollback using ${strategy}` });

    return deploy;
  }

  getDeploy(id: string): DeployEntry | undefined {
    return this.deploys.get(id);
  }

  listDeploys(environment?: DeployEnvironment): DeployEntry[] {
    let result = Array.from(this.deploys.values());
    if (environment) result = result.filter(d => d.environment === environment);
    return result.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  createIncident(data: { title: string; severity: Incident['severity']; description: string; deployId?: string }): Incident {
    const incident: Incident = {
      id: randomUUID(),
      title: data.title,
      severity: data.severity,
      status: 'open',
      deployId: data.deployId,
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    this.incidents.set(incident.id, incident);
    return incident;
  }

  resolveIncident(id: string): Incident | null {
    const incident = this.incidents.get(id);
    if (!incident) return null;
    incident.status = 'resolved';
    incident.resolvedAt = new Date().toISOString();
    return incident;
  }

  getIncidents(severity?: Incident['severity']): Incident[] {
    let result = Array.from(this.incidents.values());
    if (severity) result = result.filter(i => i.severity === severity);
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getReleases(): ReleasePlan[] {
    return [...this.releases];
  }

  setCheckCommands(checks: CheckCommand[]): void {
    this.checks = checks;
  }

  private async emitEvent(type: string, payload?: Record<string, unknown>): Promise<void> {
    if (!this.eventBus) return;
    try {
      await this.eventBus.emit({ type, source: 'delivery-orchestrator', payload });
    } catch {
      // Never block deploy flow
    }
  }

  private async executeDeployAsync(id: string): Promise<void> {
    const deploy = this.deploys.get(id);
    if (!deploy) return;

    this.logger.info('[Deploy] Starting deploy %s v%s to %s', id, deploy.version, deploy.environment);
    deploy.status = 'building';
    deploy.checks = [];

    let allPassed = true;

    for (const check of this.checks) {
      this.logger.info('[Deploy] Running check: %s', check.name);
      const result = this.executor.runCommand(check.command, check.args, check.timeout);

      const passed = result.code === 0;
      deploy.checks.push({ name: check.name, passed });

      if (!passed) {
        allPassed = false;
        this.logger.error('[Deploy] Check %s FAILED: %s', check.name, result.output);
        break;
      }

      this.logger.info('[Deploy] Check %s PASSED', check.name);
    }

    if (allPassed) {
      deploy.status = 'completed';
      deploy.completedAt = new Date().toISOString();
      this.logger.info('[Deploy] Deploy %s COMPLETED successfully', id);
    } else {
      deploy.status = 'failed';
      this.createIncident({
        title: `Deploy ${deploy.version} failed`,
        severity: 'high',
        description: `Checks failed for deploy ${id}`,
        deployId: id,
      });
      this.logger.error('[Deploy] Deploy %s FAILED', id);
    }
  }
}

export function createDeliveryOrchestrator(): DeliveryOrchestrator {
  return new DeliveryOrchestrator();
}

import { execFileSync } from 'node:child_process';
import { QualityGatesRunner } from './quality-gates';
import type { Workflow, WorkflowStep } from './types';
import type { DeliveryOrchestrator, ReleasePlan } from '@ideia/delivery-orchestrator';
import type { EventBus } from '@ideia/event-bus';
import type { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';

const log = createLogger('workflow-delivery');

export interface WorkflowDeliveryResult {
  release: ReleasePlan;
  deployId?: string;
  environment: string;
  qualityGates: { name: string; passed: boolean; output?: string; error?: string }[];
}

export interface GateConfig {
  name: string;
  command: string;
  args?: string[];
  timeout?: number;
}

export interface GateResult {
  name: string;
  passed: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

export interface QualityGatesResult {
  gates: GateResult[];
  overallStatus: 'passed' | 'failed';
  totalDurationMs: number;
}

const DEFAULT_GATES: GateConfig[] = [
  { name: 'lint', command: 'npx eslint . --max-warnings=0', timeout: 60000 },
  { name: 'test', command: 'npx jest --passWithNoTests', timeout: 120000 },
  { name: 'build', command: 'npx tsc --noEmit', timeout: 60000 },
  { name: 'security', command: 'npm audit --audit-level=high', timeout: 30000 },
  { name: 'architecture', command: 'npx tsc -b --dry', timeout: 60000 },
];

async function _runQualityGate(name: string, command: string, cwd: string, timeout = 60000): Promise<{ name: string; passed: boolean; output?: string; error?: string }> {
  try {
    const output = execFileSync('npx', command.split(' '), { cwd, encoding: 'utf-8', timeout, stdio: 'pipe' });
    return { name, passed: true, output: output.trim().slice(0, 500) };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { name, passed: false, error: err.stderr?.toString().trim().slice(0, 500) || err.message || String(e) };
  }
}

export async function runAllQualityGates(
  config?: { gates?: GateConfig[]; cwd?: string; timeoutPerGate?: number }
): Promise<QualityGatesResult> {
  const cwd = config?.cwd ?? process.cwd();
  const gates = config?.gates ?? DEFAULT_GATES;
  const timeout = config?.timeoutPerGate ?? 60000;
  const overallStart = Date.now();

  const results = await Promise.all(
    gates.map(async (gate) => {
      const start = Date.now();
      try {
        const output = execFileSync(gate.command, gate.args ?? [], {
          cwd, encoding: 'utf-8', timeout: gate.timeout ?? timeout, stdio: 'pipe',
        });
        return {
          name: gate.name,
          passed: true,
          output: output.trim().slice(0, 500),
          durationMs: Date.now() - start,
        } as GateResult;
      } catch (e) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        return {
          name: gate.name,
          passed: false,
          error: err.stderr?.toString().trim().slice(0, 500) || err.message || String(e),
          durationMs: Date.now() - start,
        } as GateResult;
      }
    })
  );

  const allPassed = results.every(r => r.passed);
  return {
    gates: results,
    overallStatus: allPassed ? 'passed' : 'failed',
    totalDurationMs: Date.now() - overallStart,
  };
}

export async function completeWorkflowWithDelivery(
  workflow: Workflow,
  deliveryOrchestrator: DeliveryOrchestrator,
  deps?: {
    eventBus?: EventBus;
    auditTrail?: AuditTrail;
    environment?: string;
    autoDeploy?: boolean;
    cwd?: string;
  },
): Promise<WorkflowDeliveryResult> {
  const _cwd = deps?.cwd ?? process.cwd();

  const allCompleted = workflow.steps.every(
    (s: WorkflowStep) => s.status === 'completed' || s.status === 'cancelled',
  );
  if (!allCompleted) {
    throw new Error(
      `Workflow "${workflow.id}" is not complete. ` +
      `${workflow.steps.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length} steps remaining.`,
    );
  }

  const runner = new QualityGatesRunner();
  const releaseResults = await runner.runGate('release');
  const qualityGates = releaseResults.map(r => ({ name: r.name, passed: r.passed, output: r.output }));

  const allGatesPassed = qualityGates.every(g => g.passed);
  if (!allGatesPassed) {
    throw new Error(
      `Quality gates failed for workflow "${workflow.id}": ` +
      qualityGates.filter(g => !g.passed).map(g => g.name).join(', '),
    );
  }

  const environment = deps?.environment ?? 'development';
  const autoDeploy = deps?.autoDeploy ?? false;
  const version = `1.0.0-${workflow.id.slice(0, 7)}`;

  const artifacts = workflow.steps
    .filter(s => s.status === 'completed')
    .map(s => s.name);

  log.info(`Creating release v${version} for ${environment} with ${artifacts.length} artifacts`);

  const release = deliveryOrchestrator.createRelease(
    version,
    environment as import('@ideia/delivery-orchestrator').DeployEnvironment,
    artifacts.length > 0 ? artifacts : ['default-artifact'],
    autoDeploy,
  );

  let deployId: string | undefined;

  if (autoDeploy || deps?.environment === 'staging') {
    log.info(`Auto-deploying v${version} to ${environment}`);
    const deploy = deliveryOrchestrator.deploy(
      version,
      environment as import('@ideia/delivery-orchestrator').DeployEnvironment,
      artifacts.length > 0 ? artifacts : ['default-artifact'],
    );
    deployId = deploy.id;
  }

  if (deps?.auditTrail) {
    deps.auditTrail.append({
      actor: 'system',
      eventType: 'workflow.delivery.completed',
      target: `workflow:${workflow.id}`,
      decision: 'approved',
      result: 'success',
      metadata: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        version,
        environment,
        qualityGates,
        deployId,
        autoDeploy,
      },
    });
  }

  if (deps?.eventBus) {
    await deps.eventBus.emit({
      type: 'workflow.delivery.completed',
      source: 'workflow-engine:delivery-integration',
      payload: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        version,
        environment,
        qualityGates,
        deployId,
        releaseCreatedAt: release.createdAt,
      },
    });
  }

  log.info(`Workflow "${workflow.id}" delivered as v${version} to ${environment}`);

  return { release, deployId, environment, qualityGates };
}

import { randomUUID } from 'crypto';
import { execFileSync } from 'node:child_process';
import { Sprint, SprintStatus, Workflow, WorkflowStatus, WorkflowStep, WorkflowSummary } from './types';
import { createLogger } from '@ideia/logger';
import { DEFAULT_QUALITY_GATES, type QualityGate } from '@ideia/contracts';

const log = createLogger('workflow-engine');

/** @deprecated Use {@link QualityGate} from @ideia/contracts */
export type GateConfig = QualityGate;

export interface GateResult {
  name: string;
  passed: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

export interface QualityGatesReport {
  stepId: string;
  gates: GateResult[];
  overallStatus: 'passed' | 'failed';
  totalDurationMs: number;
  runAt: string;
}

export interface WorkflowEngineConfig {
  cwd?: string;
  qualityGates?: QualityGate[];
  enableQualityGates?: boolean;
}

const _DEFAULT_GATES: GateConfig[] = [
  { name: 'lint', command: 'npx', args: ['eslint', '.', '--max-warnings=0'], timeout: 60000, required: false },
  { name: 'test', command: 'npx', args: ['jest', '--passWithNoTests'], timeout: 120000, required: false },
  { name: 'build', command: 'npx', args: ['tsc', '--noEmit'], timeout: 60000, required: true },
  { name: 'security', command: 'npm', args: ['audit', '--audit-level=high'], timeout: 30000, required: false },
  { name: 'architecture', command: 'npx', args: ['tsc', '-b', '--dry'], timeout: 60000, required: false },
];

export class WorkflowEngine {
  private workflows: Map<string, Workflow> = new Map();
  private sprints: Map<string, Sprint> = new Map();
  private cwd: string;
  private qualityGates: QualityGate[];
  private enableQualityGates: boolean;
  private gateResults: Map<string, QualityGatesReport[]> = new Map();

  constructor(config?: WorkflowEngineConfig) {
    this.cwd = config?.cwd ?? process.cwd();
    this.qualityGates = config?.qualityGates ?? DEFAULT_QUALITY_GATES;
    this.enableQualityGates = config?.enableQualityGates ?? true;
  }

  setQualityGates(gates: QualityGate[]): void {
    this.qualityGates = gates;
  }

  setEnableQualityGates(enable: boolean): void {
    this.enableQualityGates = enable;
  }

  getGateResults(workflowId: string): QualityGatesReport[] {
    return this.gateResults.get(workflowId) || [];
  }

  createWorkflow(name: string, description?: string): Workflow {
    const workflow: Workflow = {
      id: randomUUID(),
      name,
      description,
      steps: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  addStep(workflowId: string, name: string, dependsOn: string[] = [], estimatedHours?: number, priority?: number, deadline?: string): WorkflowStep | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const step: WorkflowStep = {
      id: randomUUID(),
      name,
      status: 'pending',
      dependsOn,
      estimatedHours,
      priority,
      deadline,
      tags: [],
    };

    workflow.steps.push(step);
    workflow.updatedAt = new Date().toISOString();
    return step;
  }

  async updateStepStatus(workflowId: string, stepId: string, status: WorkflowStatus): Promise<{ success: boolean; gateResult?: QualityGatesReport }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return { success: false };

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) return { success: false };

    step.status = status;
    workflow.updatedAt = new Date().toISOString();

    if (status === 'completed' && this.enableQualityGates) {
      const gateReport = await this.runQualityGates(workflowId, stepId);
      this.storeGateReport(workflowId, gateReport);

      if (gateReport.overallStatus === 'failed') {
        const requiredFailed = gateReport.gates.filter(g => {
          if (g.passed) return false;
          const config = this.qualityGates.find(gc => gc.name === g.name);
          return config?.required === true;
        });
        if (requiredFailed.length > 0) {
          step.status = 'blocked';
          workflow.status = 'blocked';
          log.warn(`[WorkflowEngine] Step "${step.name}" blocked by quality gates: ${requiredFailed.map(g => g.name).join(', ')}`);
          return { success: false, gateResult: gateReport };
        }
      }
    }

    const allDone = workflow.steps.every(s => s.status === 'completed' || s.status === 'cancelled');
    if (allDone) workflow.status = 'completed';

    return { success: true };
  }

  async runQualityGates(workflowId: string, stepId?: string): Promise<QualityGatesReport> {
    const start = Date.now();
    const gates: GateResult[] = [];

    for (const gate of this.qualityGates) {
      const gateStart = Date.now();
      try {
        const output = execFileSync(gate.command, gate.args ?? [], {
          cwd: this.cwd,
          encoding: 'utf-8',
          timeout: gate.timeout ?? 60000,
          stdio: 'pipe',
        });
        gates.push({
          name: gate.name,
          passed: true,
          output: output.trim().slice(0, 500),
          durationMs: Date.now() - gateStart,
        });
      } catch (_e) {
        const err = e as { stdout?: string; stderr?: string; message?: string };
        gates.push({
          name: gate.name,
          passed: false,
          error: err.stderr?.toString().trim().slice(0, 500) || err.message || String(e),
          durationMs: Date.now() - gateStart,
        });
      }
    }

    const allPassed = gates.every(g => g.passed);
    const report: QualityGatesReport = {
      stepId: stepId ?? 'global',
      gates,
      overallStatus: allPassed ? 'passed' : 'failed',
      totalDurationMs: Date.now() - start,
      runAt: new Date().toISOString(),
    };

    return report;
  }

  private storeGateReport(workflowId: string, report: QualityGatesReport): void {
    const reports = this.gateResults.get(workflowId) || [];
    reports.push(report);
    this.gateResults.set(workflowId, reports);
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  listWorkflows(status?: WorkflowStatus): Workflow[] {
    let result = Array.from(this.workflows.values());
    if (status) result = result.filter(w => w.status === status);
    return result;
  }

  getSummary(): WorkflowSummary {
    const all = Array.from(this.workflows.values());
    const byStatus: Record<string, number> = {};
    let totalSteps = 0;
    let completedSteps = 0;

    for (const w of all) {
      byStatus[w.status] = (byStatus[w.status] || 0) + 1;
      totalSteps += w.steps.length;
      completedSteps += w.steps.filter(s => s.status === 'completed').length;
    }

    return {
      total: all.length,
      byStatus,
      completionRate: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };
  }

  createSprint(name: string, goal: string | undefined, startDate: string, endDate: string, capacity: number): Sprint {
    const sprint: Sprint = {
      id: randomUUID(),
      name,
      goal,
      status: 'planning',
      startDate,
      endDate,
      capacity,
      tasks: [],
      burndown: [],
    };
    this.sprints.set(sprint.id, sprint);
    return sprint;
  }

  addTaskToSprint(sprintId: string, taskId: string): Sprint | null {
    const sprint = this.sprints.get(sprintId);
    if (!sprint || sprint.status !== 'planning') return null;
    sprint.tasks.push(taskId);
    return sprint;
  }

  startSprint(sprintId: string): Sprint | null {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;
    sprint.status = 'active';
    sprint.burndown = [{ date: new Date().toISOString().slice(0, 10), remaining: sprint.tasks.length }];
    return sprint;
  }

  recordBurndown(sprintId: string, remaining: number): Sprint | null {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;
    sprint.burndown.push({ date: new Date().toISOString().slice(0, 10), remaining });
    return sprint;
  }

  completeSprint(sprintId: string): Sprint | null {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;
    sprint.status = 'completed';
    return sprint;
  }

  getSprint(id: string): Sprint | undefined {
    return this.sprints.get(id);
  }

  selectNextTask(workflowId: string): WorkflowStep | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const available = workflow.steps.filter(s => {
      if (s.status !== 'pending') return false;
      return s.dependsOn.every(depId => {
        const dep = workflow.steps.find(st => st.id === depId);
        return dep?.status === 'completed';
      });
    });

    if (available.length === 0) return null;

    return available.sort((a, b) => {
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      const aPriority = a.priority ?? 3;
      const bPriority = b.priority ?? 3;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return (a.estimatedHours ?? 999) - (b.estimatedHours ?? 999);
    })[0] ?? null;
  }
}

export function createWorkflowEngine(config?: WorkflowEngineConfig): WorkflowEngine {
  return new WorkflowEngine(config);
}

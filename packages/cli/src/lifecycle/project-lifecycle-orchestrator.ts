export type LifecyclePhase = 'idea' | 'analysis' | 'architecture' | 'implementation' | 'testing' | 'deployment' | 'monitoring';
type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

interface PhaseDefinition {
  phase: LifecyclePhase;
  label: string;
  description: string;
  agents: string[];
  estimatedMinutes: number;
}

interface PhaseState {
  phase: LifecyclePhase;
  status: PhaseStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  artifacts: string[];
  checkpoints: Checkpoint[];
}

interface Checkpoint {
  id: string;
  description: string;
  passed: boolean;
  validatedAt?: string;
}

interface LifecycleConfig {
  autoTransition: boolean;
  requireApproval: boolean;
  rollbackOnFailure: boolean;
  notifyOnPhaseChange: boolean;
}

interface LifecycleReport {
  projectName: string;
  currentPhase: LifecyclePhase;
  overallProgress: number;
  phases: PhaseState[];
  startedAt: string;
  elapsedMinutes: number;
  status: 'active' | 'completed' | 'failed' | 'rolled_back';
  errors: string[];
}

const PHASE_DEFINITIONS: PhaseDefinition[] = [
  { phase: 'idea', label: 'Idea', description: 'Conceptualize and define the project idea, goals, and scope', agents: ['Analyst'], estimatedMinutes: 5 },
  { phase: 'analysis', label: 'Analysis', description: 'Analyze requirements, constraints, dependencies, and feasibility', agents: ['Analyst'], estimatedMinutes: 10 },
  { phase: 'architecture', label: 'Architecture', description: 'Design system architecture, component breakdown, and integration points', agents: ['Architect'], estimatedMinutes: 15 },
  { phase: 'implementation', label: 'Implementation', description: 'Implement code, tests, and documentation following architecture', agents: ['Programmer'], estimatedMinutes: 30 },
  { phase: 'testing', label: 'Testing', description: 'Run automated tests, quality gates, security scans, and validation', agents: ['Tester', 'Reviewer'], estimatedMinutes: 15 },
  { phase: 'deployment', label: 'Deployment', description: 'Deploy to target environment with health checks and rollback capability', agents: ['DevOps'], estimatedMinutes: 10 },
  { phase: 'monitoring', label: 'Monitoring', description: 'Monitor system health, performance, and usage patterns', agents: ['DevOps', 'Reviewer'], estimatedMinutes: 5 },
];

const DEFAULT_CONFIG: LifecycleConfig = {
  autoTransition: true,
  requireApproval: false,
  rollbackOnFailure: true,
  notifyOnPhaseChange: true,
};

export class ProjectLifecycleOrchestrator {
  private projectName: string;
  private phases: Map<LifecyclePhase, PhaseState>;
  private config: LifecycleConfig;
  private startedAt: string;
  private status: LifecycleReport['status'] = 'active';
  private errors: string[] = [];

  constructor(projectName: string, config?: Partial<LifecycleConfig>) {
    this.projectName = projectName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startedAt = new Date().toISOString();
    this.phases = new Map();

    for (const def of PHASE_DEFINITIONS) {
      this.phases.set(def.phase, {
        phase: def.phase,
        status: 'pending',
        artifacts: [],
        checkpoints: [],
      });
    }

    const ideaPhase = this.phases.get('idea');
    if (ideaPhase) ideaPhase.status = 'in_progress';
  }

  getCurrentPhase(): PhaseState | undefined {
    for (const def of PHASE_DEFINITIONS) {
      const state = this.phases.get(def.phase);
      if (state?.status === 'in_progress') return state;
    }
    for (const def of PHASE_DEFINITIONS) {
      const state = this.phases.get(def.phase);
      if (state?.status === 'pending') return state;
    }
    return undefined;
  }

  getPhaseState(phase: LifecyclePhase): PhaseState | undefined {
    return this.phases.get(phase);
  }

  getPhaseDefinitions(): PhaseDefinition[] {
    return [...PHASE_DEFINITIONS];
  }

  advance(phase: LifecyclePhase, artifacts?: string[]): boolean {
    const current = this.phases.get(phase);
    if (!current) {
      this.errors.push(`Phase ${phase} not found`);
      return false;
    }

    if (current.status !== 'in_progress') {
      this.errors.push(`Phase ${phase} is not in progress (status: ${current.status})`);
      return false;
    }

    const defIndex = PHASE_DEFINITIONS.findIndex(d => d.phase === phase);
    if (!this.validateCheckpoints(phase)) {
      current.status = 'failed';
      current.error = 'Not all checkpoints passed';
      this.status = 'failed';
      return false;
    }

    current.status = 'completed';
    current.completedAt = new Date().toISOString();
    if (artifacts) current.artifacts.push(...artifacts);

    if (this.config.autoTransition) {
      const nextPhase = PHASE_DEFINITIONS[defIndex + 1];
      if (nextPhase) {
        const nextState = this.phases.get(nextPhase.phase);
        if (nextState) {
          nextState.status = 'in_progress';
          nextState.startedAt = new Date().toISOString();
        }
      } else {
        this.status = 'completed';
      }
    }

    return true;
  }

  fail(phase: LifecyclePhase, error: string): boolean {
    const state = this.phases.get(phase);
    if (!state) return false;

    state.status = 'failed';
    state.error = error;
    this.errors.push(error);
    this.status = 'failed';

    if (this.config.rollbackOnFailure) {
      this.rollbackTo(phase);
    }

    return true;
  }

  addArtifact(phase: LifecyclePhase, artifact: string): void {
    const state = this.phases.get(phase);
    if (state) state.artifacts.push(artifact);
  }

  addCheckpoint(phase: LifecyclePhase, description: string, passed: boolean): void {
    const state = this.phases.get(phase);
    if (state) {
      state.checkpoints.push({
        id: `cp-${state.checkpoints.length + 1}`,
        description,
        passed,
        validatedAt: new Date().toISOString(),
      });
    }
  }

  validateCheckpoints(phase: LifecyclePhase): boolean {
    const state = this.phases.get(phase);
    if (!state || state.checkpoints.length === 0) return true;
    return state.checkpoints.every(cp => cp.passed);
  }

  rollbackTo(targetPhase: LifecyclePhase): void {
    let rollbackStarted = false;
    for (const def of [...PHASE_DEFINITIONS].reverse()) {
      const state = this.phases.get(def.phase);
      if (!state) continue;
      if (def.phase === targetPhase) {
        state.status = 'in_progress';
        state.startedAt = new Date().toISOString();
        state.error = undefined;
        rollbackStarted = true;
        break;
      }
      if (rollbackStarted || state.status === 'completed' || state.status === 'in_progress') {
        state.status = 'pending';
        state.completedAt = undefined;
        state.error = undefined;
      }
    }
    this.status = 'active';
  }

  getReport(): LifecycleReport {
    const completedPhases = [...this.phases.values()].filter(p => p.status === 'completed').length;
    const totalPhases = PHASE_DEFINITIONS.length;
    const overallProgress = Math.round((completedPhases / totalPhases) * 100);
    const elapsedMinutes = Math.round((Date.now() - new Date(this.startedAt).getTime()) / 60000);

    return {
      projectName: this.projectName,
      currentPhase: this.getCurrentPhase()?.phase ?? 'monitoring',
      overallProgress,
      phases: [...this.phases.values()],
      startedAt: this.startedAt,
      elapsedMinutes,
      status: this.status,
      errors: [...this.errors],
    };
  }

  getEstimatedTimeRemaining(): number {
    const completed = [...this.phases.values()].filter(p => p.status === 'completed').length;
    const remaining = PHASE_DEFINITIONS.slice(completed);
    return remaining.reduce((sum, def) => sum + def.estimatedMinutes, 0);
  }

  formatReport(format: 'text' | 'json' = 'text'): string {
    const report = this.getReport();

    if (format === 'json') return JSON.stringify(report, null, 2);

    const lines: string[] = [
      `=== Lifecycle Report: ${report.projectName} ===`,
      `Status: ${report.status}`,
      `Current Phase: ${report.currentPhase}`,
      `Progress: ${report.overallProgress}%`,
      `Elapsed: ${report.elapsedMinutes} min`,
      `Est. Remaining: ${this.getEstimatedTimeRemaining()} min`,
      ``,
      `Phases:`,
    ];

    for (const def of PHASE_DEFINITIONS) {
      const state = this.phases.get(def.phase);
      const statusLabel = state?.status ?? 'pending';
      const icon = statusLabel === 'completed' ? '✅' : statusLabel === 'in_progress' ? '🔄' : statusLabel === 'failed' ? '❌' : '⏳';
      const time = state?.startedAt ? ` (${state.startedAt.slice(11, 19)})` : '';
      const err = state?.error ? ` — ERROR: ${state.error}` : '';
      lines.push(`  ${icon} ${def.label}${time}${err}`);
      if (state && state.checkpoints.length > 0) {
        state.checkpoints.forEach(cp => lines.push(`     ${cp.passed ? '✓' : '✗'} ${cp.description}`));
      }
    }

    if (report.errors.length > 0) {
      lines.push(``, `Errors:`, ...report.errors.map(e => `  - ${e}`));
    }

    return lines.join('\n');
  }
}

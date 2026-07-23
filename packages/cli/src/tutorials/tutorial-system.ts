type TutorialId = string;
export type TutorialLevel = 'beginner' | 'intermediate' | 'advanced';
type TutorialStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface TutorialDefinition {
  id: TutorialId;
  name: string;
  description: string;
  level: TutorialLevel;
  estimatedMinutes: number;
  prerequisites: string[];
  steps: TutorialStepDefinition[];
  tags: string[];
  badgeName?: string;
}

interface TutorialStepDefinition {
  id: string;
  order: number;
  title: string;
  description: string;
  command?: string;
  validationFn?: string;
  expectedOutput?: string;
}

interface TutorialProgress {
  tutorialId: TutorialId;
  startedAt?: string;
  completedAt?: string;
  currentStepIndex: number;
  steps: TutorialStepProgress[];
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
}

interface TutorialStepProgress {
  stepId: string;
  status: TutorialStepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  attempts: number;
}

const ZERO_TO_DEPLOY_TUTORIAL: TutorialDefinition = {
  id: 'zero-to-deploy',
  name: 'Zero to Deploy',
  description: 'Complete walkthrough from having an idea to deploying a fully functional system',
  level: 'beginner',
  estimatedMinutes: 45,
  prerequisites: [],
  steps: [
    { id: 'ztd-1', order: 1, title: 'Initialize Project', description: 'Create a new IDEIA project using the wizard', command: 'ideia init my-project', expectedOutput: 'Project initialized' },
    { id: 'ztd-2', order: 2, title: 'Define Your Idea', description: 'Describe your idea and let the Analyst agent refine it', command: 'ideia idea "describe your idea"', expectedOutput: 'Analysis complete' },
    { id: 'ztd-3', order: 3, title: 'Review Architecture', description: 'Review the proposed architecture and provide feedback', command: 'ideia architect review', expectedOutput: 'Architecture approved' },
    { id: 'ztd-4', order: 4, title: 'Generate Implementation', description: 'Let the Programmer agent generate the implementation', command: 'ideia generate', expectedOutput: 'Implementation complete' },
    { id: 'ztd-5', order: 5, title: 'Run Tests', description: 'Execute automated tests and quality gates', command: 'ideia test', expectedOutput: 'All tests passing' },
    { id: 'ztd-6', order: 6, title: 'Security Audit', description: 'Run security scans and compliance checks', command: 'ideia audit security', expectedOutput: 'No vulnerabilities found' },
    { id: 'ztd-7', order: 7, title: 'Deploy to Production', description: 'Deploy the project to the target environment', command: 'ideia deploy', expectedOutput: 'Deployment successful' },
    { id: 'ztd-8', order: 8, title: 'Verify Deployment', description: 'Verify the deployment is healthy and operational', command: 'ideia status', expectedOutput: 'System healthy' },
  ],
  tags: ['beginner', 'core', 'lifecycle'],
  badgeName: 'Zero to Deploy Champion',
};

const MULTI_AGENT_WORKFLOW_TUTORIAL: TutorialDefinition = {
  id: 'multi-agent-workflow',
  name: 'Multi-Agent Workflows',
  description: 'Learn how to leverage the full multi-agent system for complex tasks',
  level: 'intermediate',
  estimatedMinutes: 30,
  prerequisites: ['zero-to-deploy'],
  steps: [
    { id: 'maw-1', order: 1, title: 'Understanding Agents', description: 'Learn about the 6 agent types and their roles', expectedOutput: 'Agents understood' },
    { id: 'maw-2', order: 2, title: 'Define Complex Task', description: 'Create a task that requires multiple agents', command: 'ideia task create', expectedOutput: 'Task created' },
    { id: 'maw-3', order: 3, title: 'Run Agent Pipeline', description: 'Execute the multi-agent pipeline with orchestration', command: 'ideia pipeline run', expectedOutput: 'Pipeline completed' },
    { id: 'maw-4', order: 4, title: 'Review Results', description: 'Review the output from each agent', command: 'ideia pipeline review', expectedOutput: 'All outputs reviewed' },
  ],
  tags: ['intermediate', 'agents', 'orchestration'],
  badgeName: 'Multi-Agent Master',
};

const DEPLOYMENT_AUTOMATION_TUTORIAL: TutorialDefinition = {
  id: 'deployment-automation',
  name: 'Deployment Automation',
  description: 'Master automated deployment, rollback, and monitoring',
  level: 'advanced',
  estimatedMinutes: 25,
  prerequisites: ['zero-to-deploy'],
  steps: [
    { id: 'da-1', order: 1, title: 'Configure Environment', description: 'Set up deployment targets and environment variables', command: 'ideia env configure', expectedOutput: 'Environment configured' },
    { id: 'da-2', order: 2, title: 'Create Pipeline', description: 'Define a deployment pipeline with quality gates', command: 'ideia pipeline create', expectedOutput: 'Pipeline created' },
    { id: 'da-3', order: 3, title: 'Run Pipeline', description: 'Execute the deployment pipeline end-to-end', command: 'ideia pipeline run --deploy', expectedOutput: 'Deployment completed' },
    { id: 'da-4', order: 4, title: 'Rollback Simulation', description: 'Simulate a failed deployment and test rollback', command: 'ideia deploy rollback --simulate', expectedOutput: 'Rollback successful' },
    { id: 'da-5', order: 5, title: 'Monitor System', description: 'Set up monitoring and alerts for the deployed system', command: 'ideia monitor setup', expectedOutput: 'Monitoring active' },
  ],
  tags: ['advanced', 'deployment', 'devops'],
  badgeName: 'Deployment Expert',
};

const SECURITY_AUDIT_TUTORIAL: TutorialDefinition = {
  id: 'security-audit',
  name: 'Security Audit Mastery',
  description: 'Learn how to use IDEIA security tools for policy scanning, audit trail verification, hardening, compliance checks, and reporting',
  level: 'intermediate',
  estimatedMinutes: 35,
  prerequisites: ['zero-to-deploy'],
  steps: [
    { id: 'sa-1', order: 1, title: 'Understanding Security Tools', description: 'Learn about policy engine, audit trail, output validator', expectedOutput: 'Security tools understood' },
    { id: 'sa-2', order: 2, title: 'Run Policy Scan', description: 'Execute a policy scan to evaluate project policies', command: 'ideia audit policy', expectedOutput: 'Policies evaluated' },
    { id: 'sa-3', order: 3, title: 'Audit Trail Review', description: 'Verify the integrity of the audit trail chain', command: 'ideia audit-trail verify', expectedOutput: 'Chain verified' },
    { id: 'sa-4', order: 4, title: 'Security Hardening', description: 'Apply security hardening measures to the project', command: 'ideia audit security', expectedOutput: 'Vulnerabilities fixed' },
    { id: 'sa-5', order: 5, title: 'Compliance Check', description: 'Run compliance checks against defined standards', command: 'ideia audit compliance', expectedOutput: 'Compliance passed' },
    { id: 'sa-6', order: 6, title: 'Generate Report', description: 'Generate a comprehensive security audit report', command: 'ideia audit report', expectedOutput: 'Security report generated' },
  ],
  tags: ['intermediate', 'security', 'audit'],
  badgeName: 'Security Guardian',
};

const PERFORMANCE_OPTIMIZATION_TUTORIAL: TutorialDefinition = {
  id: 'performance-optimization',
  name: 'Performance Optimization',
  description: 'Master profiling, bottleneck analysis, optimization, and monitoring',
  level: 'advanced',
  estimatedMinutes: 40,
  prerequisites: ['zero-to-deploy'],
  steps: [
    { id: 'po-1', order: 1, title: 'Profile Application', description: 'Run performance benchmarks to capture baseline metrics', command: 'ideia benchmark run', expectedOutput: 'Baseline captured' },
    { id: 'po-2', order: 2, title: 'Analyze Bottlenecks', description: 'Analyze benchmark results to identify performance bottlenecks', command: 'ideia benchmark analyze', expectedOutput: 'Bottlenecks identified' },
    { id: 'po-3', order: 3, title: 'Apply Optimizations', description: 'Apply recommended performance optimizations', command: 'ideia optimize', expectedOutput: 'Optimizations applied' },
    { id: 'po-4', order: 4, title: 'Re-benchmark', description: 'Run benchmarks again to verify improvements', command: 'ideia benchmark run --compare', expectedOutput: 'Improvement verified' },
    { id: 'po-5', order: 5, title: 'Configure Monitoring', description: 'Set up performance monitoring with alerts', command: 'ideia monitor setup --alerts', expectedOutput: 'Monitoring active' },
  ],
  tags: ['advanced', 'performance', 'optimization'],
  badgeName: 'Performance Tuner',
};

const PROJECT_BLUEPRINT_TUTORIAL: TutorialDefinition = {
  id: 'project-blueprint',
  name: 'Project Blueprinting',
  description: 'Learn how to generate, review, and customize project blueprints',
  level: 'beginner',
  estimatedMinutes: 20,
  prerequisites: [],
  steps: [
    { id: 'pb-1', order: 1, title: 'Explore Blueprints', description: 'Browse available blueprint templates', command: 'ideia blueprint list', expectedOutput: 'Blueprints listed' },
    { id: 'pb-2', order: 2, title: 'Generate Blueprint', description: 'Generate a new project blueprint from a template', command: 'ideia blueprint generate --type node-api', expectedOutput: 'Blueprint generated' },
    { id: 'pb-3', order: 3, title: 'Review Contracts', description: 'View generated contracts and ADRs', expectedOutput: 'Contracts reviewed' },
    { id: 'pb-4', order: 4, title: 'Customize Blueprint', description: 'Customize the generated blueprint to fit project needs', command: 'ideia blueprint customize', expectedOutput: 'Blueprint customized' },
  ],
  tags: ['beginner', 'blueprint', 'scaffolding'],
  badgeName: 'Blueprint Architect',
};

const BUILTIN_TUTORIALS: TutorialDefinition[] = [
  ZERO_TO_DEPLOY_TUTORIAL,
  MULTI_AGENT_WORKFLOW_TUTORIAL,
  DEPLOYMENT_AUTOMATION_TUTORIAL,
  SECURITY_AUDIT_TUTORIAL,
  PERFORMANCE_OPTIMIZATION_TUTORIAL,
  PROJECT_BLUEPRINT_TUTORIAL,
];

export class TutorialSystem {
  private tutorials: Map<TutorialId, TutorialDefinition>;
  private progress: Map<TutorialId, TutorialProgress>;

  constructor(customTutorials?: TutorialDefinition[]) {
    this.tutorials = new Map();
    this.progress = new Map();

    for (const t of [...BUILTIN_TUTORIALS, ...(customTutorials ?? [])]) {
      this.tutorials.set(t.id, t);
    }
  }

  listTutorials(level?: TutorialLevel): TutorialDefinition[] {
    const all = [...this.tutorials.values()];
    if (level) return all.filter(t => t.level === level);
    return all;
  }

  getTutorial(id: TutorialId): TutorialDefinition | undefined {
    return this.tutorials.get(id);
  }

  startTutorial(id: TutorialId): TutorialProgress | { error: string } {
    const tutorial = this.tutorials.get(id);
    if (!tutorial) return { error: `Tutorial '${id}' not found` };

    if (this.progress.has(id)) {
      const existing = this.progress.get(id) ?? null;
      if (existing.status === 'in_progress') return { error: `Tutorial '${id}' is already in progress` };
      if (existing.status === 'completed') return { error: `Tutorial '${id}' is already completed` };
    }

    const progress: TutorialProgress = {
      tutorialId: id,
      startedAt: new Date().toISOString(),
      currentStepIndex: 0,
      steps: tutorial.steps.map(s => ({
        stepId: s.id,
        status: 'pending' as TutorialStepStatus,
        attempts: 0,
      })),
      status: 'in_progress',
    };

    if (progress.steps.length > 0) {
      progress.steps[0].status = 'in_progress';
      progress.steps[0].startedAt = new Date().toISOString();
    }

    this.progress.set(id, progress);
    return progress;
  }

  advanceStep(tutorialId: TutorialId, stepId: string, success: boolean, error?: string): TutorialProgress | { error: string } {
    const progress = this.progress.get(tutorialId);
    if (!progress) return { error: `Tutorial '${tutorialId}' not started` };
    if (progress.status !== 'in_progress') return { error: `Tutorial '${tutorialId}' is ${progress.status}` };

    const stepIndex = progress.steps.findIndex(s => s.stepId === stepId);
    if (stepIndex === -1) return { error: `Step '${stepId}' not found in tutorial '${tutorialId}'` };

    if (stepIndex !== progress.currentStepIndex) {
      return { error: `Step '${stepId}' is not the current step (expected step ${progress.currentStepIndex + 1})` };
    }

    const step = progress.steps[stepIndex];
    step.attempts++;

    if (success) {
      step.status = 'completed';
      step.completedAt = new Date().toISOString();

      if (stepIndex < progress.steps.length - 1) {
        progress.currentStepIndex = stepIndex + 1;
        progress.steps[stepIndex + 1].status = 'in_progress';
        progress.steps[stepIndex + 1].startedAt = new Date().toISOString();
      } else {
        progress.status = 'completed';
        progress.completedAt = new Date().toISOString();
      }
    } else {
      step.status = 'failed';
      step.error = error ?? 'Step failed';
      progress.status = 'failed';
    }

    return progress;
  }

  getProgress(tutorialId: TutorialId): TutorialProgress | undefined {
    return this.progress.get(tutorialId);
  }

  getCompletedBadges(): Array<{ tutorialId: string; badgeName: string; completedAt: string }> {
    const badges: Array<{ tutorialId: string; badgeName: string; completedAt: string }> = [];
    for (const [id, prog] of this.progress) {
      if (prog.status === 'completed') {
        const tutorial = this.tutorials.get(id);
        if (tutorial?.badgeName) {
          badges.push({ tutorialId: id, badgeName: tutorial.badgeName, completedAt: prog.completedAt ?? '' });
        }
      }
    }
    return badges;
  }

  resetTutorial(tutorialId: TutorialId): void {
    this.progress.delete(tutorialId);
  }

  getOverallStats(): { totalTutorials: number; completed: number; inProgress: number; badges: number } {
    const all = [...this.progress.values()];
    return {
      totalTutorials: this.tutorials.size,
      completed: all.filter(p => p.status === 'completed').length,
      inProgress: all.filter(p => p.status === 'in_progress').length,
      badges: this.getCompletedBadges().length,
    };
  }

  registerTutorial(definition: TutorialDefinition): void {
    this.tutorials.set(definition.id, definition);
  }
}

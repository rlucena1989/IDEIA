import { createLogger, Logger } from '@ideia/logger';
import { IssueRef, PRPlan, PRTask, CommitPlan, ChecklistItem, RiskLevel } from './types-pr';

export class PRPlanner {
  private logger: Logger;

  private readonly branchPrefixes: Record<string, string> = {
    feature: 'feature',
    bugfix: 'fix',
    refactor: 'refactor',
    chore: 'chore',
    docs: 'docs',
  };

  constructor(logger?: Logger) {
    this.logger = logger ?? createLogger('PRPlanner');
  }

  async planFromIssue(issue: IssueRef): Promise<PRPlan> {
    this.logger.info('Planning PR from issue', { issueId: issue.id, title: issue.title });
    const tasks = this.decomposeTask(issue);
    const branchName = this.generateBranchName(issue);
    const commits = this.createCommitPlan(issue, tasks);
    const description = this.generateDescription(issue);
    const checklist = this.createChecklist(issue);
    const risk = this.assessRisk(issue);
    const estimatedEffort = tasks.reduce((sum, t) => sum + t.estimatedEffort, 0);

    return {
      branchName,
      commits,
      description,
      checklist,
      tasks,
      risk,
      estimatedEffort,
    };
  }

  decomposeTask(issue: IssueRef): PRTask[] {
    const tasks: PRTask[] = [];
    const baseId = `TASK-${issue.id}`;

    tasks.push({
      id: `${baseId}-001`,
      description: `Implement ${issue.title}`,
      files: [],
      estimatedEffort: 2,
    });

    tasks.push({
      id: `${baseId}-002`,
      description: `Add tests for ${issue.title}`,
      files: [],
      estimatedEffort: 2,
    });

    return tasks;
  }

  generateBranchName(issue: IssueRef): string {
    const prefix = this.branchPrefixes[issue.type] || 'feature';
    const kebabDesc = issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${prefix}/IDEIA-${issue.id}-${kebabDesc}`;
  }

  planReviewers(_files: string[]): string[] {
    return ['tech-lead', 'senior-dev'];
  }

  private createCommitPlan(issue: IssueRef, _tasks: PRTask[]): CommitPlan[] {
    const scope = this.inferScope(issue);
    const commits: CommitPlan[] = [];

    commits.push({
      type: issue.type === 'bugfix' ? 'fix' : 'feat',
      scope,
      description: issue.title.toLowerCase(),
      files: [],
    });

    commits.push({
      type: 'test',
      scope,
      description: `add tests for ${issue.title.toLowerCase()}`,
      files: [],
    });

    return commits;
  }

  private inferScope(issue: IssueRef): string {
    const labels = issue.labels ?? [];
    if (labels.includes('api')) return 'api';
    if (labels.includes('cli')) return 'cli';
    if (labels.includes('ui')) return 'ui';
    if (labels.includes('core')) return 'core';
    return 'general';
  }

  private generateDescription(issue: IssueRef): string {
    const sections: string[] = [];

    sections.push(`## Description\n\n${issue.description}`);
    sections.push('## Related Issue\n\nCloses #' + issue.id);
    sections.push('## Type of Change\n\n' +
      (issue.type === 'feature' ? '- [x] New Feature\n' : '') +
      (issue.type === 'bugfix' ? '- [x] Bugfix\n' : '') +
      (issue.type === 'refactor' ? '- [x] Refactoring\n' : '') +
      (issue.type === 'chore' ? '- [x] Chore\n' : '') +
      (issue.type === 'docs' ? '- [x] Documentation\n' : ''));

    return sections.join('\n\n');
  }

  private createChecklist(issue: IssueRef): ChecklistItem[] {
    return [
      { label: 'Code follows project standards', required: true, applicable: true },
      { label: 'Tests added/updated', required: true, applicable: true },
      { label: 'Existing tests pass', required: true, applicable: true },
      { label: 'Lint and typecheck pass', required: true, applicable: true },
      { label: 'Documentation updated', required: false, applicable: issue.type !== 'bugfix' },
      { label: 'No secrets exposed', required: true, applicable: true },
    ];
  }

  private assessRisk(issue: IssueRef): RiskLevel {
    if (issue.priority === 'critical') return 'high';
    const labels = issue.labels ?? [];
    if (labels.includes('breaking')) return 'high';
    if (labels.includes('core') || labels.includes('security')) return 'medium';
    return 'low';
  }
}

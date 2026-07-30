import { randomUUID } from 'crypto';
import { createLogger, Logger } from '@ideia/logger';
import {
  ComplianceFramework,
  Control,
  Finding,
  Remediation,
  RemediationPlan,
  RemediationPriority,
  RemediationStatus,
  FindingSeverity,
} from './types';

interface RemediationSuggestion {
  controlId: string;
  title: string;
  description: string;
  priority: RemediationPriority;
  effortHours: number;
  owner: string;
  dependsOn: string[];
}

export class RemediationPlanner {
  private _plans: Map<string, RemediationPlan> = new Map();
  private _logger: Logger;

  constructor() {
    this._logger = createLogger('remediation-planner');
    this._suggestions = this._buildDefaultSuggestions();
  }

  private _suggestions: RemediationSuggestion[];

  createPlan(
    framework: ComplianceFramework,
    controls: Control[],
    findings: Finding[],
    title?: string,
  ): RemediationPlan {
    const items = this._generateRemediations(framework, controls, findings);
    const totalEffortHours = items.reduce((sum, r) => sum + r.effortHours, 0);

    const plan: RemediationPlan = {
      id: randomUUID(),
      framework,
      title: title ?? `${framework.toUpperCase()} Remediation Plan`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items,
      totalEffortHours,
      totalItems: items.length,
      completedItems: 0,
      targetCompletionDate: this._computeTargetDate(items),
      owner: 'ciso',
      status: 'draft',
    };

    this._plans.set(plan.id, plan);
    this._logger.info('Remediation plan created', { planId: plan.id, framework, items: items.length });
    return plan;
  }

  getPlan(id: string): RemediationPlan | undefined {
    return this._plans.get(id);
  }

  getAllPlans(): RemediationPlan[] {
    return Array.from(this._plans.values());
  }

  getPlansByFramework(framework: ComplianceFramework): RemediationPlan[] {
    return Array.from(this._plans.values()).filter((p) => p.framework === framework);
  }

  getPlansByOwner(owner: string): RemediationPlan[] {
    return Array.from(this._plans.values()).filter((p) => p.owner === owner);
  }

  getActivePlans(): RemediationPlan[] {
    return Array.from(this._plans.values()).filter((p) => p.status === 'active');
  }

  updatePlanStatus(planId: string, status: RemediationPlan['status']): boolean {
    const plan = this._plans.get(planId);
    if (plan == null) return false;
    plan.status = status;
    plan.updatedAt = new Date().toISOString();
    this._logger.info('Plan status updated', { planId, status });
    return true;
  }

  updateRemediationStatus(planId: string, remediationId: string, status: RemediationStatus): boolean {
    const plan = this._plans.get(planId);
    if (plan == null) return false;

    const item = plan.items.find((r) => r.id === remediationId);
    if (item == null) return false;

    item.status = status;
    if (status === 'resolved') {
      item.completedAt = new Date().toISOString();
      plan.completedItems = plan.items.filter((r) => r.status === 'resolved').length;
    }
    plan.updatedAt = new Date().toISOString();
    return true;
  }

  getProgress(planId: string): { percent: number; completed: number; total: number; overdue: number } {
    const plan = this._plans.get(planId);
    if (plan == null) return { percent: 0, completed: 0, total: 0, overdue: 0 };

    const completed = plan.items.filter((r) => r.status === 'resolved').length;
    const overdue = plan.items.filter((r) => {
      if (r.status === 'resolved') return false;
      return new Date(r.targetDate).getTime() < Date.now();
    }).length;

    return {
      percent: plan.totalItems > 0 ? Math.round((completed / plan.totalItems) * 100) : 0,
      completed,
      total: plan.totalItems,
      overdue,
    };
  }

  suggestRemediations(controls: Control[]): RemediationSuggestion[] {
    const failingControls = controls.filter((c) => c.status !== 'implemented');
    const suggestions: RemediationSuggestion[] = [];

    for (const ctrl of failingControls) {
      const suggestion = this._suggestions.find((s) => s.controlId === ctrl.controlId);
      if (suggestion != null) {
        suggestions.push(suggestion);
      } else {
        suggestions.push({
          controlId: ctrl.controlId,
          title: `Implement ${ctrl.title}`,
          description: ctrl.description,
          priority: this._severityToPriority(ctrl.severity),
          effortHours: ctrl.severity === 'critical' ? 40 : ctrl.severity === 'high' ? 20 : 8,
          owner: ctrl.owner,
          dependsOn: ctrl.dependsOn,
        });
      }
    }

    return suggestions;
  }

  generateReport(planId: string): string {
    const plan = this._plans.get(planId);
    if (plan == null) return 'Plan not found';

    const progress = this.getProgress(planId);
    const lines: string[] = [
      `=== REMEDIATION PLAN REPORT ===`,
      `Plan: ${plan.title}`,
      `Framework: ${plan.framework}`,
      `Status: ${plan.status}`,
      `Created: ${plan.createdAt}`,
      `Target: ${plan.targetCompletionDate}`,
      `Owner: ${plan.owner}`,
      ``,
      `Progress: ${progress.percent}% (${progress.completed}/${progress.total})`,
      `Overdue: ${progress.overdue}`,
      ``,
      `Items:`,
    ];

    for (const item of plan.items) {
      const overdue = new Date(item.targetDate).getTime() < Date.now() && item.status !== 'resolved';
      lines.push(
        `  [${item.priority}] ${item.title} (${item.status})${overdue ? ' [OVERDUE]' : ''}`,
        `    Owner: ${item.owner} | Target: ${item.targetDate} | Effort: ${item.effortHours}h`,
      );
    }

    return lines.join('\n');
  }

  private _generateRemediations(framework: ComplianceFramework, controls: Control[], findings: Finding[]): Remediation[] {
    const failingControls = controls.filter((c) => c.status !== 'implemented');
    const findingMap = new Map<string, Finding>();
    for (const f of findings) {
      findingMap.set(f.controlId, f);
    }

    return failingControls.map((ctrl) => {
      const finding = findingMap.get(ctrl.controlId);
      const suggestion = this._suggestions.find((s) => s.controlId === ctrl.controlId);

      return {
        id: randomUUID(),
        findingId: finding?.id ?? randomUUID(),
        controlId: ctrl.controlId,
        title: suggestion?.title ?? `Remediate ${ctrl.controlId}`,
        description: suggestion?.description ?? ctrl.remediationNotes ?? ctrl.description,
        priority: suggestion?.priority ?? this._severityToPriority(ctrl.severity),
        status: 'open' as RemediationStatus,
        owner: suggestion?.owner ?? ctrl.owner,
        targetDate: this._computeItemTargetDate(suggestion?.priority ?? this._severityToPriority(ctrl.severity)),
        completedAt: null,
        effortHours: suggestion?.effortHours ?? 16,
        notes: ctrl.remediationNotes,
        evidenceRefs: [],
        dependsOn: suggestion?.dependsOn ?? ctrl.dependsOn,
      };
    });
  }

  private _severityToPriority(severity: Control['severity']): RemediationPriority {
    const map: Record<string, RemediationPriority> = {
      critical: 'p0',
      high: 'p1',
      medium: 'p2',
      low: 'p3',
    };
    return map[severity] ?? 'p2';
  }

  private _computeTargetDate(items: Remediation[]): string {
    const maxDate = items.reduce((latest, item) => {
      const d = new Date(item.targetDate).getTime();
      return d > latest ? d : latest;
    }, 0);

    return maxDate > 0 ? new Date(maxDate).toISOString() : new Date(Date.now() + 90 * 86400000).toISOString();
  }

  private _computeItemTargetDate(priority: RemediationPriority): string {
    const days: Record<RemediationPriority, number> = {
      p0: 14,
      p1: 30,
      p2: 60,
      p3: 90,
    };
    const offset = days[priority] ?? 90;
    return new Date(Date.now() + offset * 86400000).toISOString();
  }

  private _buildDefaultSuggestions(): RemediationSuggestion[] {
    return [
      { controlId: 'CC6.1', title: 'Implement MFA for all user accounts', description: 'Deploy multi-factor authentication using TOTP or WebAuthn across all authentication endpoints', priority: 'p0', effortHours: 60, owner: 'security', dependsOn: [] },
      { controlId: 'CC6.2', title: 'Automate user access review process', description: 'Build monthly access review workflow with automated notifications and deprovisioning', priority: 'p1', effortHours: 30, owner: 'security', dependsOn: ['CC6.1'] },
      { controlId: 'CC7.2', title: 'Create incident response plan', description: 'Document IR plan with roles, SLAs, containment procedures, and post-mortem process', priority: 'p0', effortHours: 40, owner: 'security', dependsOn: [] },
      { controlId: 'CC7.4', title: 'Implement business continuity plan', description: 'Document BCP with backup/restore procedures, DR runbooks, and annual testing', priority: 'p1', effortHours: 30, owner: 'devops', dependsOn: [] },
      { controlId: 'CC9.1', title: 'Establish privacy program', description: 'Create privacy notice, data retention policy, and consent management system', priority: 'p1', effortHours: 40, owner: 'dpo', dependsOn: [] },
      { controlId: 'A.10', title: 'Implement encryption at rest', description: 'Deploy AES-256-GCM encryption for all data stores including SQLite, PostgreSQL, and file storage', priority: 'p0', effortHours: 60, owner: 'security', dependsOn: [] },
      { controlId: 'Art.33', title: 'Implement breach notification process', description: 'Build automated notification system for GDPR 72-hour breach reporting', priority: 'p0', effortHours: 25, owner: 'dpo', dependsOn: ['CC7.2'] },
      { controlId: 'Art.15', title: 'Provide data subject access mechanism', description: 'Build self-service portal for DSARs with automated data export', priority: 'p1', effortHours: 35, owner: 'engineering', dependsOn: [] },
      { controlId: 'Art.17', title: 'Implement data erasure pipeline', description: 'Build automated data deletion pipeline supporting right to erasure requests', priority: 'p1', effortHours: 30, owner: 'engineering', dependsOn: ['Art.15'] },
      { controlId: '164.308(b)', title: 'Create BAA templates and process', description: 'Draft BAA templates covering HIPAA 164.504(e) requirements and establish signing workflow', priority: 'p1', effortHours: 15, owner: 'legal', dependsOn: [] },
      { controlId: 'Req.1', title: 'Implement network segmentation', description: 'Deploy network security controls and segmentation for PCI DSS compliance', priority: 'p0', effortHours: 40, owner: 'devops', dependsOn: [] },
    ];
  }
}

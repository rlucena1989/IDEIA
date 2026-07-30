import { createLogger } from '@ideia/logger';
import { AuditTrail } from '@ideia/audit-trail';

const logger = createLogger('config-engine:org-policy');

export type OrgRole = 'admin' | 'tech-lead' | 'developer' | 'viewer';
export type ConstraintScope = 'autonomy' | 'features' | 'notifications' | 'integrations';

export interface OrgPolicyRule {
  id: string;
  scope: ConstraintScope;
  constraint: string;
  value: unknown;
  description: string;
  severity: 'mandatory' | 'recommended' | 'optional';
}

export interface OrgPolicyTemplate {
  id: string;
  name: string;
  description: string;
  rules: OrgPolicyRule[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface TeamMember {
  id: string;
  email: string;
  role: OrgRole;
  profiles: string[];
}

export interface OrgConfig {
  orgName: string;
  adminEmail: string;
  members: TeamMember[];
  activePolicies: string[];
  enforcementLevel: 'strict' | 'permissive' | 'advisory';
}

export interface OrgPolicyResult {
  valid: boolean;
  violations: Array<{ rule: string; member: string; message: string }>;
  warnings: Array<{ rule: string; member: string; message: string }>;
}

const DEFAULT_TEMPLATES: OrgPolicyTemplate[] = [
  {
    id: 'enterprise-base',
    name: 'Enterprise Base',
    description: 'Standard enterprise policies',
    rules: [
      { id: 'max-autonomy', scope: 'autonomy', constraint: 'maxAutonomyLevel', value: 'N2', description: 'Maximum autonomy level for developers', severity: 'mandatory' },
      { id: 'require-sandbox', scope: 'features', constraint: 'sandboxRequired', value: true, description: 'Sandbox must be enabled', severity: 'mandatory' },
      { id: 'require-audit', scope: 'features', constraint: 'auditEnabled', value: true, description: 'Audit trail must be active', severity: 'mandatory' },
      { id: 'notify-on-failure', scope: 'notifications', constraint: 'failureAlerts', value: true, description: 'Notify team on pipeline failures', severity: 'recommended' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'startup-flex',
    name: 'Startup Flexible',
    description: 'Flexible policies for small teams',
    rules: [
      { id: 'max-autonomy-startup', scope: 'autonomy', constraint: 'maxAutonomyLevel', value: 'N3', description: 'Maximum autonomy level', severity: 'recommended' },
      { id: 'require-output-validation', scope: 'features', constraint: 'outputValidation', value: true, description: 'Output validation recommended', severity: 'recommended' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'strict-compliance',
    name: 'Strict Compliance',
    description: 'Strict compliance for regulated industries',
    rules: [
      { id: 'max-autonomy-strict', scope: 'autonomy', constraint: 'maxAutonomyLevel', value: 'N1', description: 'Maximum N1 autonomy', severity: 'mandatory' },
      { id: 'require-sandbox-strict', scope: 'features', constraint: 'sandboxRequired', value: true, description: 'Sandbox mandatory', severity: 'mandatory' },
      { id: 'require-audit-strict', scope: 'features', constraint: 'auditEnabled', value: true, description: 'Audit mandatory', severity: 'mandatory' },
      { id: 'require-approval', scope: 'features', constraint: 'approvalRequired', value: true, description: 'All actions require approval', severity: 'mandatory' },
      { id: 'output-validation-strict', scope: 'features', constraint: 'outputValidation', value: true, description: 'Output validation mandatory', severity: 'mandatory' },
      { id: 'disable-advanced-models', scope: 'integrations', constraint: 'allowAdvancedModels', value: false, description: 'Disable advanced LLM models', severity: 'mandatory' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  },
];

export class OrgPolicyManager {
  private templates: OrgPolicyTemplate[] = [...DEFAULT_TEMPLATES];
  private policies: Map<string, OrgPolicyTemplate> = new Map();
  private orgConfig: OrgConfig | null = null;
  private auditTrail?: AuditTrail;

  constructor(auditTrail?: AuditTrail) {
    this.auditTrail = auditTrail;
    for (const t of DEFAULT_TEMPLATES) {
      this.policies.set(t.id, { ...t });
    }
  }

  setOrgConfig(config: OrgConfig): void {
    this.orgConfig = config;
    this.audit('org.config.set', `Organization config set: ${config.orgName}`);
  }

  getOrgConfig(): OrgConfig | null {
    return this.orgConfig;
  }

  createPolicy(name: string, rules: OrgPolicyRule[]): OrgPolicyTemplate {
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const now = new Date().toISOString();
    const policy: OrgPolicyTemplate = {
      id,
      name,
      description: '',
      rules,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.policies.set(id, policy);
    this.audit('org.policy.create', `Policy created: ${name}`);
    return policy;
  }

  listPolicies(): OrgPolicyTemplate[] {
    return Array.from(this.policies.values());
  }

  getPolicy(name: string): OrgPolicyTemplate | undefined {
    return this.policies.get(name) || this.templates.find(t => t.name === name);
  }

  updatePolicy(name: string, rules: OrgPolicyRule[]): OrgPolicyTemplate | null {
    const existing = this.policies.get(name) || this.templates.find(t => t.name === name);
    if (!existing) return null;
    const updated: OrgPolicyTemplate = {
      ...existing,
      rules,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };
    this.policies.set(updated.id, updated);
    this.audit('org.policy.update', `Policy updated: ${name}`);
    return updated;
  }

  deletePolicy(name: string): boolean {
    const id = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const deleted = this.policies.delete(id);
    this.audit('org.policy.delete', `Policy deleted: ${name}`);
    return deleted;
  }

  validatePolicy(policy: OrgPolicyTemplate): string[] {
    const errors: string[] = [];
    if (!policy.name) errors.push('Policy must have a name');
    if (!policy.rules || policy.rules.length === 0) errors.push('Policy must have at least one rule');
    for (const rule of policy.rules) {
      if (!rule.id) errors.push('Each rule must have an id');
      if (!rule.scope) errors.push(`Rule ${rule.id}: scope is required`);
      if (!rule.constraint) errors.push(`Rule ${rule.id}: constraint is required`);
      if (!['mandatory', 'recommended', 'optional'].includes(rule.severity)) errors.push(`Rule ${rule.id}: severity must be mandatory, recommended, or optional`);
    }
    return errors;
  }

  getComplianceReport(policy: OrgPolicyTemplate, config: Record<string, unknown>): { compliant: boolean; violations: Array<{ rule: string; message: string }> } {
    const violations: Array<{ rule: string; message: string }> = [];
    for (const rule of policy.rules) {
      if (rule.scope === 'autonomy' && rule.constraint === 'maxAutonomyLevel') {
        const currentLevel = config['autonomy'] ? (config['autonomy'] as Record<string, unknown>)['level'] : undefined;
        if (currentLevel && String(currentLevel) > String(rule.value)) {
          violations.push({ rule: rule.id, message: `Autonomy ${currentLevel} exceeds max ${rule.value}` });
        }
      }
      if (rule.scope === 'features' && rule.constraint === 'sandboxRequired' && rule.value === true) {
        const sandbox = config['safety'] ? (config['safety'] as Record<string, unknown>)['sandboxLevel'] : undefined;
        if (!sandbox || sandbox === 'none') {
          violations.push({ rule: rule.id, message: 'Sandbox must be enabled' });
        }
      }
    }
    return { compliant: violations.length === 0, violations };
  }

  addTemplate(template: OrgPolicyTemplate): void {
    const idx = this.templates.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = { ...template, updatedAt: new Date().toISOString(), version: this.templates[idx].version + 1 };
    } else {
      this.templates.push(template);
    }
    this.audit('org.template.add', `Policy template added/updated: ${template.name}`);
  }

  getTemplates(): OrgPolicyTemplate[] {
    return [...this.templates];
  }

  getTemplate(id: string): OrgPolicyTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  activatePolicy(templateId: string): boolean {
    if (!this.orgConfig) {
      logger.warn('No org config set');
      return false;
    }
    const template = this.getTemplate(templateId);
    if (!template) {
      logger.warn('Template not found', { templateId });
      return false;
    }
    if (!this.orgConfig.activePolicies.includes(templateId)) {
      this.orgConfig.activePolicies.push(templateId);
    }
    this.audit('org.policy.activate', `Policy activated: ${template.name}`);
    return true;
  }

  deactivatePolicy(templateId: string): boolean {
    if (!this.orgConfig) return false;
    const idx = this.orgConfig.activePolicies.indexOf(templateId);
    if (idx >= 0) {
      this.orgConfig.activePolicies.splice(idx, 1);
      this.audit('org.policy.deactivate', `Policy deactivated: ${templateId}`);
      return true;
    }
    return false;
  }

  getActivePolicies(): OrgPolicyTemplate[] {
    if (!this.orgConfig) return [];
    return this.orgConfig.activePolicies
      .map(id => this.getTemplate(id))
      .filter((t): t is OrgPolicyTemplate => t !== undefined);
  }

  addMember(member: TeamMember): void {
    if (!this.orgConfig) return;
    const idx = this.orgConfig.members.findIndex(m => m.id === member.id);
    if (idx >= 0) {
      this.orgConfig.members[idx] = member;
    } else {
      this.orgConfig.members.push(member);
    }
    this.audit('org.member.add', `Member added/updated: ${member.email}`);
  }

  removeMember(memberId: string): void {
    if (!this.orgConfig) return;
    this.orgConfig.members = this.orgConfig.members.filter(m => m.id !== memberId);
    this.audit('org.member.remove', `Member removed: ${memberId}`);
  }

  getMembers(): TeamMember[] {
    return this.orgConfig?.members ?? [];
  }

  getMember(memberId: string): TeamMember | undefined {
    return this.orgConfig?.members.find(m => m.id === memberId);
  }

  validateMemberCompliance(memberId: string): OrgPolicyResult {
    const result: OrgPolicyResult = { valid: true, violations: [], warnings: [] };
    const member = this.getMember(memberId);
    if (!member) {
      result.valid = false;
      result.violations.push({ rule: 'member-exists', member: memberId, message: 'Member not found' });
      return result;
    }

    const policies = this.getActivePolicies();
    for (const policy of policies) {
      for (const rule of policy.rules) {
        if (rule.scope === 'autonomy' && rule.constraint === 'maxAutonomyLevel') {
          const maxLevel = String(rule.value);
          const memberHasHigher = member.profiles.some(p => {
            const levelMatch = p.match(/N(\d)/);
            return levelMatch && parseInt(levelMatch[1]) > parseInt(maxLevel.replace('N', ''));
          });
          if (memberHasHigher) {
            const entry = { rule: rule.id, member: memberId, message: `Member autonomy exceeds max level ${maxLevel}` };
            if (rule.severity === 'mandatory') {
              result.violations.push(entry);
              result.valid = false;
            } else {
              result.warnings.push(entry);
            }
          }
        }
      }
    }

    return result;
  }

  validateAllCompliance(): OrgPolicyResult {
    const result: OrgPolicyResult = { valid: true, violations: [], warnings: [] };
    if (!this.orgConfig) {
      result.valid = false;
      result.violations.push({ rule: 'org-configured', member: 'system', message: 'Organization not configured' });
      return result;
    }
    for (const member of this.orgConfig.members) {
      const memberResult = this.validateMemberCompliance(member.id);
      result.violations.push(...memberResult.violations);
      result.warnings.push(...memberResult.warnings);
      if (!memberResult.valid) result.valid = false;
    }
    return result;
  }

  private audit(eventType: string, description: string): void {
    if (this.auditTrail) {
      try {
        this.auditTrail.append({
          actor: 'system',
          eventType,
          target: `org:${this.orgConfig?.orgName ?? 'unknown'}`,
          decision: 'auto',
          result: 'success',
          metadata: { description },
        });
      } catch (_err) { logger.warn('audit trail append failed', { error: String(_err) }); }
    }
    logger.info(`[${eventType}] ${description}`);
  }
}

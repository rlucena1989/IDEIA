import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { createLogger } from '@ideia/logger';

export interface TeamPolicyRule {
  id: string;
  description: string;
  action: 'block' | 'ask' | 'auto';
  appliesTo: string[];
  override: 'team' | 'local';
}

export interface TeamPolicyDocument {
  version: string;
  metadata: {
    name: string;
    team: string;
    description: string;
    updatedAt: string;
  };
  rules: TeamPolicyRule[];
}

export const BUILT_IN_RULES: TeamPolicyRule[] = [
  {
    id: 'autonomy-limit',
    description: "Devs can't change autonomy > N2 — requires tech lead approval",
    action: 'ask',
    appliesTo: ['dev', 'developer', 'contributor'],
    override: 'team',
  },
  {
    id: 'audit-mandatory',
    description: 'Everyone must have audit active — cannot be disabled',
    action: 'block',
    appliesTo: ['*'],
    override: 'team',
  },
];

export class TeamPolicyManager {
  private policy: TeamPolicyDocument | null = null;
  private policies: Map<string, TeamPolicyDocument> = new Map();
  private logger = createLogger('team-policy');

  constructor(private policyPath?: string) {}

  load(filePath?: string): TeamPolicyDocument {
    const resolvedPath = filePath || this.policyPath || path.resolve(process.cwd(), '.ai', 'team-policy.yaml');
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const doc = yaml.load(raw) as TeamPolicyDocument;

    if (!doc.version || !doc.rules || !Array.isArray(doc.rules)) {
      throw new Error(`Invalid team policy file: ${resolvedPath}`);
    }

    this.policy = doc;
    this.policies.set(doc.metadata.team, doc);
    this.logger.info(`Team policy loaded: ${doc.metadata.name} (team: ${doc.metadata.team})`);
    return doc;
  }

  createTeamPolicy(teamId: string, rules: TeamPolicyRule[]): TeamPolicyDocument {
    const now = new Date().toISOString();
    const doc: TeamPolicyDocument = {
      version: '1.0',
      metadata: {
        name: `Team Policy - ${teamId}`,
        team: teamId,
        description: `Auto-generated policy for team ${teamId}`,
        updatedAt: now,
      },
      rules,
    };
    this.policies.set(teamId, doc);
    if (!this.policy) this.policy = doc;
    this.logger.info(`Team policy created for: ${teamId}`);
    return doc;
  }

  getTeamPolicy(teamId: string): TeamPolicyDocument | undefined {
    return this.policies.get(teamId);
  }

  updateTeamPolicy(teamId: string, rules: TeamPolicyRule[]): TeamPolicyDocument | null {
    const existing = this.policies.get(teamId);
    if (!existing) return null;
    const updated: TeamPolicyDocument = {
      ...existing,
      rules,
      metadata: {
        ...existing.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
    this.policies.set(teamId, updated);
    if (this.policy?.metadata.team === teamId) this.policy = updated;
    this.logger.info(`Team policy updated for: ${teamId}`);
    return updated;
  }

  deleteTeamPolicy(teamId: string): boolean {
    const deleted = this.policies.delete(teamId);
    if (this.policy?.metadata.team === teamId) this.policy = null;
    if (deleted) this.logger.info(`Team policy deleted for: ${teamId}`);
    return deleted;
  }

  validateTeamConfig(policyId: string, config: Record<string, unknown>): { valid: boolean; violations: Array<{ rule: string; message: string }> } {
    const policy = this.policies.get(policyId);
    if (!policy) return { valid: false, violations: [{ rule: 'policy-not-found', message: `Policy ${policyId} not found` }] };
    const violations: Array<{ rule: string; message: string }> = [];
    for (const rule of policy.rules) {
      const configValue = config[rule.id];
      if (rule.action === 'block' && configValue !== undefined) {
        violations.push({ rule: rule.id, message: `Config key ${rule.id} is blocked by team policy: ${rule.description}` });
      }
    }
    return { valid: violations.length === 0, violations };
  }

  getTeamComplianceReport(teamId: string): { teamId: string; policyExists: boolean; ruleCount: number; compliant: boolean; issues: string[] } {
    const policy = this.policies.get(teamId);
    const issues: string[] = [];
    if (!policy) {
      return { teamId, policyExists: false, ruleCount: 0, compliant: false, issues: ['No policy defined'] };
    }
    for (const rule of policy.rules) {
      if (rule.action === 'block') {
        issues.push(`Rule "${rule.id}": ${rule.description} (applies to: ${rule.appliesTo.join(', ')})`);
      }
    }
    return {
      teamId,
      policyExists: true,
      ruleCount: policy.rules.length,
      compliant: issues.length === 0,
      issues,
    };
  }

  listTeamPolicies(): Array<{ teamId: string; name: string; ruleCount: number }> {
    return Array.from(this.policies.entries()).map(([teamId, doc]) => ({
      teamId,
      name: doc.metadata.name,
      ruleCount: doc.rules.length,
    }));
  }

  evaluate(action: string, userRole: string): { allowed: boolean; reason: string } {
    const builtInResult = this.evaluateBuiltIn(action, userRole);
    if (!builtInResult.allowed || builtInResult.reason.startsWith('Requires approval')) {
      return builtInResult;
    }

    if (!this.policy) {
      return { allowed: true, reason: 'No team policy loaded' };
    }

    for (const rule of this.policy.rules) {
      if (rule.appliesTo.includes(userRole) || rule.appliesTo.includes('*')) {
        if (typeof action === 'string' && action.toLowerCase().includes(rule.id.toLowerCase())) {
          if (rule.action === 'block') {
            return { allowed: false, reason: `Blocked by team policy: ${rule.description}` };
          }
          if (rule.action === 'ask') {
            return { allowed: true, reason: `Requires approval: ${rule.description}` };
          }
        }
      }
    }

    return { allowed: true, reason: 'No matching team policy rule' };
  }

  private evaluateBuiltIn(action: string, userRole: string): { allowed: boolean; reason: string } {
    const actionLower = action.toLowerCase();

    const autonomyRule = BUILT_IN_RULES[0];
    if (
      (autonomyRule.appliesTo.includes(userRole) || autonomyRule.appliesTo.includes('*')) &&
      (actionLower.includes('autonomy') || actionLower.includes('set-autonomy')) &&
      (actionLower.includes('n3') || actionLower.includes('n4'))
    ) {
      return { allowed: true, reason: `Requires approval: ${autonomyRule.description}` };
    }

    const auditRule = BUILT_IN_RULES[1];
    if (
      (auditRule.appliesTo.includes('*') || auditRule.appliesTo.includes(userRole)) &&
      (actionLower.includes('audit') || actionLower.includes('disable-audit') || actionLower.includes('audit:disable'))
    ) {
      return { allowed: false, reason: `Blocked by team policy: ${auditRule.description}` };
    }

    return { allowed: true, reason: 'No built-in rule matched' };
  }

  checkNoLocalOverride(ruleId: string): boolean {
    if (!this.policy) return true;
    const rule = this.policy.rules.find(r => r.id === ruleId);
    return rule ? rule.override === 'team' : true;
  }

  getPolicy(): TeamPolicyDocument | null {
    return this.policy;
  }

  getRule(ruleId: string): TeamPolicyRule | undefined {
    return this.policy?.rules.find(r => r.id === ruleId);
  }

  listRules(): TeamPolicyRule[] {
    return this.policy?.rules ?? [];
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.policy) {
      errors.push('No policy loaded');
      return errors;
    }
    if (!this.policy.version) errors.push('Missing version');
    if (!this.policy.metadata?.name) errors.push('Missing metadata.name');
    if (!this.policy.metadata?.team) errors.push('Missing metadata.team');
    if (!this.policy.rules || this.policy.rules.length === 0) errors.push('No rules defined');
    return errors;
  }
}

export function createTeamPolicyManager(policyPath?: string): TeamPolicyManager {
  return new TeamPolicyManager(policyPath);
}

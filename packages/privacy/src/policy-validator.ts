import type { PrivacyPolicy, PrivacyConfig } from './privacy-layer';
import { createLogger } from '@ideia/logger';
import type { PIIPattern } from './pii-detector';
import type { RetentionRule } from './retention';
const logger = createLogger('policy-validator');

export interface PolicyValidationResult {
  valid: boolean;
  policyId: string;
  errors: PolicyValidationError[];
  warnings: PolicyValidationWarning[];
}

export interface PolicyValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface PolicyValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ConfigValidationReport {
  valid: boolean;
  totalPolicies: number;
  totalRetentionRules: number;
  policyResults: PolicyValidationResult[];
  retentionRuleErrors: string[];
  globalErrors: string[];
}

const VALID_ACTIONS = ['mask', 'redact', 'hash', 'block'] as const;
const VALID_RETENTION_ACTIONS = ['archive', 'purge', 'anonymize'] as const;

export class PrivacyPolicyValidator {
  validatePolicy(policy: PrivacyPolicy): PolicyValidationResult {
    const errors: PolicyValidationError[] = [];
    const warnings: PolicyValidationWarning[] = [];

    if (!policy.id || policy.id.trim().length === 0) {
      errors.push({ code: 'MISSING_ID', message: 'Policy must have a non-empty id', field: 'id' });
    } else if (!/^[a-z0-9][a-z0-9_-]*$/.test(policy.id)) {
      errors.push({ code: 'INVALID_ID', message: `Policy id "${policy.id}" must match pattern [a-z0-9][a-z0-9_-]*`, field: 'id' });
    }

    if (!policy.name || policy.name.trim().length === 0) {
      errors.push({ code: 'MISSING_NAME', message: 'Policy must have a non-empty name', field: 'name' });
    }

    if (!VALID_ACTIONS.includes(policy.action as typeof VALID_ACTIONS[number])) {
      errors.push({ code: 'INVALID_ACTION', message: `Action "${policy.action}" is not valid. Must be one of: ${VALID_ACTIONS.join(', ')}`, field: 'action' });
    }

    if (!policy.patterns || policy.patterns.length === 0) {
      errors.push({ code: 'NO_PATTERNS', message: 'Policy must have at least one PII pattern', field: 'patterns' });
    } else {
      for (let i = 0; i < policy.patterns.length; i++) {
        const patternErrors = this.validatePattern(policy.patterns[i], i);
        errors.push(...patternErrors);
      }
    }

    if (!policy.appliesTo || policy.appliesTo.length === 0) {
      errors.push({ code: 'NO_APPLIES_TO', message: 'Policy must have at least one "appliesTo" target', field: 'appliesTo' });
    }

    const severityLevels = policy.patterns.map(p => p.severity);
    if (severityLevels.includes('critical') && policy.action === 'mask') {
      warnings.push({ code: 'LOW_ACTION_FOR_CRITICAL', message: `Policy "${policy.id}" uses "mask" action for critical severity patterns; consider "hash" or "redact"`, field: 'action' });
    }

    if (policy.patterns.length > 10) {
      warnings.push({ code: 'MANY_PATTERNS', message: `Policy "${policy.id}" has ${policy.patterns.length} patterns; consider splitting into multiple policies`, field: 'patterns' });
    }

    return {
      valid: errors.length === 0,
      policyId: policy.id,
      errors,
      warnings,
    };
  }

  validateRetentionRule(rule: RetentionRule): string[] {
    const errors: string[] = [];

    if (!rule.id || rule.id.trim().length === 0) {
      errors.push('Retention rule must have a non-empty id');
    }

    if (!rule.domain || rule.domain.trim().length === 0) {
      errors.push('Retention rule must have a non-empty domain');
    }

    if (rule.maxAgeDays <= 0) {
      errors.push(`Retention rule "${rule.id}" has invalid maxAgeDays: ${rule.maxAgeDays} (must be > 0)`);
    }

    if (!VALID_RETENTION_ACTIONS.includes(rule.action as typeof VALID_RETENTION_ACTIONS[number])) {
      errors.push(`Retention rule "${rule.id}" has invalid action "${rule.action}". Must be one of: ${VALID_RETENTION_ACTIONS.join(', ')}`);
    }

    return errors;
  }

  private validatePattern(pattern: PIIPattern, index: number): PolicyValidationError[] {
    const errors: PolicyValidationError[] = [];

    if (!pattern.name || pattern.name.trim().length === 0) {
      errors.push({ code: 'INVALID_PATTERN_NAME', message: `Pattern at index ${index} has no name`, field: `patterns[${index}].name` });
    }

    if (!pattern.regex || !(pattern.regex instanceof RegExp)) {
      errors.push({ code: 'INVALID_PATTERN_REGEX', message: `Pattern "${pattern.name}" at index ${index} has no valid regex`, field: `patterns[${index}].regex` });
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(pattern.severity)) {
      errors.push({ code: 'INVALID_SEVERITY', message: `Pattern "${pattern.name}" has invalid severity "${pattern.severity}"`, field: `patterns[${index}].severity` });
    }

    if (!pattern.category || pattern.category.trim().length === 0) {
      errors.push({ code: 'INVALID_CATEGORY', message: `Pattern "${pattern.name}" has no category`, field: `patterns[${index}].category` });
    }

    return errors;
  }

  validateConfig(config: PrivacyConfig): ConfigValidationReport {
    const globalErrors: string[] = [];
    const policyResults: PolicyValidationResult[] = [];
    const retentionRuleErrors: string[] = [];

    if (!config.enabled && config.policies.length > 0) {
      globalErrors.push('Privacy is disabled but policies are defined. Policies will not be enforced.');
    }

    const policyIds = new Set<string>();
    for (const policy of config.policies) {
      if (policyIds.has(policy.id)) {
        globalErrors.push(`Duplicate policy id: "${policy.id}"`);
      }
      policyIds.add(policy.id);
      policyResults.push(this.validatePolicy(policy));
    }

    const ruleIds = new Set<string>();
    for (const rule of config.retentionRules) {
      if (ruleIds.has(rule.id)) {
        globalErrors.push(`Duplicate retention rule id: "${rule.id}"`);
      }
      ruleIds.add(rule.id);
      retentionRuleErrors.push(...this.validateRetentionRule(rule));
    }

    const validPolicies = policyResults.filter(r => r.valid).length;
    if (validPolicies < config.policies.length) {
      globalErrors.push(`${config.policies.length - validPolicies} of ${config.policies.length} policies have validation errors`);
    }

    const allErrors = [
      ...policyResults.flatMap(r => r.errors),
      ...globalErrors.map(e => ({ code: 'GLOBAL', message: e, field: undefined } as PolicyValidationError)),
    ];

    return {
      valid: allErrors.length === 0 && retentionRuleErrors.length === 0,
      totalPolicies: config.policies.length,
      totalRetentionRules: config.retentionRules.length,
      policyResults,
      retentionRuleErrors,
      globalErrors,
    };
  }
}

export function createPolicyValidator(): PrivacyPolicyValidator {
  return new PrivacyPolicyValidator();
}

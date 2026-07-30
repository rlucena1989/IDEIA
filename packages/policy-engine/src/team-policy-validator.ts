import { TeamPolicyDocument, TeamPolicyRule } from './team-policy';
import { createLogger } from '@ideia/logger';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_ACTIONS = ['block', 'ask', 'auto'] as const;
const VALID_OVERRIDES = ['team', 'local'] as const;

export function validateTeamPolicy(doc: TeamPolicyDocument): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!doc.version) {
    errors.push('version is required');
  } else if (!/^\d+\.\d+\.\d+$/.test(doc.version)) {
    errors.push(`version must be semver, got: ${doc.version}`);
  }

  if (!doc.metadata) {
    errors.push('metadata is required');
  } else {
    if (!doc.metadata.name) errors.push('metadata.name is required');
    if (!doc.metadata.team) errors.push('metadata.team is required');
    if (!doc.metadata.description) warnings.push('metadata.description is recommended');
    if (!doc.metadata.updatedAt) warnings.push('metadata.updatedAt is recommended');
  }

  if (!doc.rules || !Array.isArray(doc.rules)) {
    errors.push('rules must be an array');
  } else {
    if (doc.rules.length === 0) warnings.push('no rules defined');
    const ids = new Set<string>();
    for (let i = 0; i < doc.rules.length; i++) {
      const rule = doc.rules[i];
      const prefix = `rules[${i}]`;

      if (!rule.id) {
        errors.push(`${prefix}.id is required`);
      } else if (ids.has(rule.id)) {
        errors.push(`${prefix}.id "${rule.id}" is duplicate`);
      }
      ids.add(rule.id);

      if (!rule.description) {
        warnings.push(`${prefix}.description is recommended`);
      }

      if (!VALID_ACTIONS.includes(rule.action as typeof VALID_ACTIONS[number])) {
        errors.push(`${prefix}.action must be one of: ${VALID_ACTIONS.join(', ')}, got: ${rule.action}`);
      }

      if (!rule.appliesTo || !Array.isArray(rule.appliesTo) || rule.appliesTo.length === 0) {
        errors.push(`${prefix}.appliesTo must be a non-empty array`);
      }

      if (rule.override && !VALID_OVERRIDES.includes(rule.override as typeof VALID_OVERRIDES[number])) {
        errors.push(`${prefix}.override must be one of: ${VALID_OVERRIDES.join(', ')}, got: ${rule.override}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateRule(rule: TeamPolicyRule): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rule.id) errors.push('id is required');
  if (!VALID_ACTIONS.includes(rule.action as typeof VALID_ACTIONS[number])) {
    errors.push(`action must be one of: ${VALID_ACTIONS.join(', ')}`);
  }
  if (!rule.appliesTo || rule.appliesTo.length === 0) {
    errors.push('appliesTo must be a non-empty array');
  }
  if (rule.override && !VALID_OVERRIDES.includes(rule.override as typeof VALID_OVERRIDES[number])) {
    errors.push(`override must be one of: ${VALID_OVERRIDES.join(', ')}`);
  }
  if (!rule.description) warnings.push('description is recommended');

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTeamPolicyFile(filePath: string): ValidationResult {
  try {
    const fs = require('node:fs') as typeof import('node:fs');
    const yaml = require('js-yaml') as typeof import('js-yaml');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const doc = yaml.load(raw) as TeamPolicyDocument;

    if (!doc || typeof doc !== 'object') {
      return { valid: false, errors: ['File must contain a YAML object'], warnings: [] };
    }

    return validateTeamPolicy(doc);
  } catch (error) {
    return { valid: false, errors: [String(error)], warnings: [] };
  }
}


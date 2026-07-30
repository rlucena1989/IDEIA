import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import yaml from 'js-yaml';
const logger = createLogger('policy-autonomy');

export interface AutonomyDecision {
  decision: 'auto' | 'ask' | 'block';
  rule: string;
}

interface AutonomyOverride {
  path?: string;
  command?: string;
  message?: string;
  environment?: string;
  provider?: string;
  level: 'auto' | 'ask' | 'block';
}

interface AutonomyRule {
  action: string;
  default: 'auto' | 'ask' | 'block';
  overrides?: AutonomyOverride[];
}

interface AutonomyPolicyDoc {
  rules: AutonomyRule[];
}

function matchGlob(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`).test(value);
}

function evaluateOverride(override: AutonomyOverride, context: Record<string, string>): boolean {
  if (override.path !== undefined && 'path' in context) {
    return matchGlob(override.path, context.path ?? '');
  }
  if (override.command !== undefined && 'command' in context) {
    return matchGlob(override.command, context.command ?? '');
  }
  if (override.message !== undefined && 'message' in context) {
    return matchGlob(override.message, context.message ?? '');
  }
  if (override.environment !== undefined && 'environment' in context) {
    return context.environment === override.environment;
  }
  if (override.provider !== undefined && 'provider' in context) {
    return context.provider === override.provider;
  }
  return false;
}

export class AutonomyPolicy {
  private doc: AutonomyPolicyDoc;

  constructor(yamlPath?: string) {
    const resolvedPath = yamlPath || path.resolve(process.cwd(), '.ai', 'autonomy-policy.yaml');
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    this.doc = yaml.load(raw) as AutonomyPolicyDoc;
  }

  evaluate(action: string, context: Record<string, string> = {}): AutonomyDecision {
    const rule = this.doc.rules.find(r => r.action === action);
    if (!rule) {
      return { decision: 'ask', rule: `default:action:${action}:not_found` };
    }
    if (rule.overrides) {
      for (const override of rule.overrides) {
        if (evaluateOverride(override, context)) {
          return { decision: override.level, rule: `override:${rule.action}:${override.level}` };
        }
      }
    }
    return { decision: rule.default, rule: `default:${rule.action}:${rule.default}` };
  }
}

export function createAutonomyPolicy(yamlPath?: string): AutonomyPolicy {
  return new AutonomyPolicy(yamlPath);
}

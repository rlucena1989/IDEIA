import type { CliCommandResult } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
const logger = createLogger('safety-use-case');

export interface SafetyRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  action: 'block' | 'warn' | 'allow';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface SafetyCheckResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  action: SafetyRule['action'];
  message?: string;
}

export interface SafetyReport {
  checks: SafetyCheckResult[];
  blocked: number;
  warned: number;
  passed: number;
  timestamp: string;
}

export class SafetyUseCase {
  private rules: Map<string, SafetyRule> = new Map();

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    const defaultRules: SafetyRule[] = [
      {
        id: 'safety-1',
        name: 'No rm -rf /',
        description: 'Blocks recursive delete of root directory',
        pattern: 'rm\\s+-rf\\s+/',
        action: 'block',
        enabled: true,
        severity: 'critical',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'safety-2',
        name: 'No eval on untrusted input',
        description: 'Warns against eval with unsanitized input',
        pattern: 'eval\\(',
        action: 'warn',
        enabled: true,
        severity: 'high',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'safety-3',
        name: 'No process.exit',
        description: 'Blocks process.exit in production code',
        pattern: 'process\\.exit\\(',
        action: 'warn',
        enabled: true,
        severity: 'medium',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }
  }

  addRule(name: string, description: string, pattern: string, action: SafetyRule['action'], severity: SafetyRule['severity']): CliCommandResult<SafetyRule> {
    const rule: SafetyRule = {
      id: `safety_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      description,
      pattern,
      action,
      enabled: true,
      severity,
      createdAt: new Date().toISOString(),
    };
    this.rules.set(rule.id, rule);
    return success(`Safety rule "${name}" created`, rule);
  }

  toggleRule(ruleId: string, enabled: boolean): CliCommandResult<SafetyRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) return failure(`Safety rule not found: ${ruleId}`, 1) as CliCommandResult<SafetyRule>;

    rule.enabled = enabled;
    this.rules.set(ruleId, rule);
    return success(`Safety rule "${rule.name}" ${enabled ? 'enabled' : 'disabled'}`, rule);
  }

  checkInput(input: string): CliCommandResult<SafetyReport> {
    const results: SafetyCheckResult[] = [];
    let blocked = 0;
    let warned = 0;
    let passed = 0;

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const triggered = new RegExp(rule.pattern, 'i').test(input);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        triggered,
        action: triggered ? rule.action : 'allow',
        message: triggered ? `Pattern matched: ${rule.pattern}` : undefined,
      });

      if (triggered && rule.action === 'block') blocked++;
      else if (triggered && rule.action === 'warn') warned++;
      else passed++;
    }

    const report: SafetyReport = {
      checks: results,
      blocked,
      warned,
      passed,
      timestamp: new Date().toISOString(),
    };

    return success(`Safety check: ${blocked} blocked, ${warned} warned, ${passed} passed`, report);
  }

  listRules(): CliCommandResult<SafetyRule[]> {
    return success(`Found ${this.rules.size} safety rules`, Array.from(this.rules.values()));
  }

  removeRule(ruleId: string): CliCommandResult<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) return failure(`Safety rule not found: ${ruleId}`, 1) as CliCommandResult<void>;

    this.rules.delete(ruleId);
    return success(`Safety rule "${rule.name}" removed`);
  }
}

export function createSafetyUseCase(): SafetyUseCase {
  return new SafetyUseCase();
}

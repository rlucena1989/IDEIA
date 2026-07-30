import type { FullConfig, SecurityCheckResult, SecurityRuleResult } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('security-rules');

interface SecurityRuleDef {
  id: string;
  description: string;
  check: (config: FullConfig) => { passed: boolean; message?: string };
}

function getValue(config: FullConfig, dottedPath: string): unknown {
  const parts = dottedPath.split('.');
  let current: unknown = config;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function getValueMulti(config: FullConfig, ...paths: string[]): unknown {
  for (const p of paths) {
    const v = getValue(config, p);
    if (v !== undefined) return v;
  }
  return undefined;
}

function isHighAutonomy(autonomy: unknown): boolean {
  if (typeof autonomy === 'string') {
    const num = parseInt(autonomy.replace('N', ''), 10);
    return !isNaN(num) && num > 2;
  }
  if (typeof autonomy === 'number') return autonomy > 2;
  return false;
}

const RULES: SecurityRuleDef[] = [
  {
    id: 'R1',
    description: 'No autonomy > N2 without safety-circuit active',
    check: (config) => {
      const autonomy = getValueMulti(config, 'autonomy.level', 'security.autonomyLevel');
      const safetyCircuit = getValueMulti(config, 'safetyCircuit.enabled', 'security.safetyCircuit.enabled');
      if (isHighAutonomy(autonomy) && safetyCircuit !== true) {
        return { passed: false, message: `Autonomy level '${autonomy}' requires safety-circuit to be active` };
      }
      return { passed: true };
    },
  },
  {
    id: 'R2',
    description: 'No sandbox: false allowed',
    check: (config) => {
      const sandbox = getValueMulti(config, 'sandbox.enabled', 'security.sandbox.enabled');
      if (sandbox === false) {
        return { passed: false, message: 'Sandbox cannot be disabled' };
      }
      return { passed: true };
    },
  },
  {
    id: 'R3',
    description: 'No audit: disabled',
    check: (config) => {
      const audit = getValueMulti(config, 'audit.enabled', 'security.audit.enabled');
      if (audit === false) {
        return { passed: false, message: 'Audit trail cannot be disabled' };
      }
      return { passed: true };
    },
  },
  {
    id: 'R4',
    description: 'Alert if policy-engine disabled',
    check: (config) => {
      const policyEngine = getValueMulti(config, 'policyEngine.enabled', 'security.policyEngine.enabled');
      if (policyEngine === false) {
        return { passed: false, message: 'Policy engine is disabled — security policies will not be enforced' };
      }
      return { passed: true };
    },
  },
  {
    id: 'R5',
    description: 'Require output-validation active',
    check: (config) => {
      const outputValidation = getValueMulti(config, 'outputValidation.enabled', 'security.outputValidation.enabled');
      if (outputValidation === false || outputValidation === undefined) {
        return { passed: false, message: 'Output validation must be active to prevent data leakage' };
      }
      return { passed: true };
    },
  },
  {
    id: 'R6',
    description: 'Verify checkpoint-interval minimum',
    check: (config) => {
      const interval = getValueMulti(config, 'checkpoint.interval', 'security.checkpointInterval');
      if (typeof interval === 'number' && interval < 10) {
        return { passed: false, message: `Checkpoint interval ${interval}s is below minimum of 10s` };
      }
      if (interval === undefined) {
        return { passed: false, message: 'Checkpoint interval is not configured (minimum 10s required)' };
      }
      return { passed: true };
    },
  },
  {
    id: 'R7',
    description: 'Validate isolation-policy syntax',
    check: (config) => {
      const isolation = getValueMulti(config, 'isolationPolicy', 'security.isolationPolicy');
      if (isolation === undefined || isolation === null) {
        return { passed: true };
      }
      if (typeof isolation !== 'string') {
        return { passed: false, message: 'Isolation policy must be a string' };
      }
      if (!isolation.trim()) {
        return { passed: false, message: 'Isolation policy cannot be empty' };
      }
      const validDirectives = ['namespace', 'network', 'filesystem', 'process', 'capability'];
      const lines = isolation.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      for (const line of lines) {
        const directive = line.trim().split(/\s+/)[0];
        if (directive && !validDirectives.includes(directive)) {
          return { passed: false, message: `Unknown isolation policy directive '${directive}'. Valid: ${validDirectives.join(', ')}` };
        }
      }
      return { passed: true };
    },
  },
  {
    id: 'R8',
    description: 'Secret rotation must be enabled when secrets are configured',
    check: (config) => {
      const rotation = getValueMulti(config, 'secretRotation.enabled', 'security.secretRotation.enabled');
      const hasSecrets = getValueMulti(config, 'secrets', 'security.secrets');
      if (hasSecrets !== undefined && hasSecrets !== null && rotation !== true) {
        return { passed: false, message: 'Secret rotation must be enabled when secrets are present' };
      }
      return { passed: true };
    },
  },
  {
    id: 'R9',
    description: 'Rate limiting must be configured',
    check: (config) => {
      const rateLimit = getValueMulti(config, 'rateLimit.maxRequests', 'security.rateLimit.maxRequests');
      if (rateLimit === undefined || rateLimit === null) {
        return { passed: true };
      }
      if (typeof rateLimit === 'number' && rateLimit > 1000) {
        return { passed: false, message: `Rate limit ${rateLimit} exceeds maximum of 1000 requests` };
      }
      return { passed: true };
    },
  },
  {
    id: 'R10',
    description: 'Audit retention must be at least 90 days in production',
    check: (config) => {
      const retention = getValueMulti(config, 'audit.retentionDays', 'security.audit.retentionDays');
      const env = getValueMulti(config, 'environment', 'env');
      if (retention !== undefined && typeof retention === 'number' && (env === 'production' || env === undefined) && retention < 90) {
        return { passed: false, message: `Audit retention ${retention} days is below minimum 90 days for production` };
      }
      return { passed: true };
    },
  },
];

export class SecurityRules {
  check(config: FullConfig): SecurityCheckResult {
    const results: SecurityRuleResult[] = RULES.map(r => {
      const outcome = r.check(config);
      return {
        rule: r.id,
        description: r.description,
        passed: outcome.passed,
        message: outcome.message,
      };
    });

    return {
      passed: results.every(r => r.passed),
      rules: results,
    };
  }

  evaluateAll(config: FullConfig): { passed: boolean; rules: SecurityRuleResult[]; summary: { total: number; passed: number; failed: number } } {
    const result = this.check(config);
    const passed = result.rules.filter(r => r.passed).length;
    const failed = result.rules.filter(r => !r.passed).length;
    return {
      ...result,
      summary: { total: result.rules.length, passed, failed },
    };
  }

  getRuleDescription(id: string): string | undefined {
    return RULES.find(r => r.id === id)?.description;
  }

  getRules(): SecurityRuleDef[] {
    return RULES;
  }
}

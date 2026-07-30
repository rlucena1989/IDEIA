import type { FullConfig } from './config-types';
import { createLogger } from '@ideia/logger';
import type { ProfileConfig } from './config-types';
import type { ValidationResult, ValidationError, ValidationWarning } from './types';
const logger = createLogger('config-validator');

type RuleFn = (config: FullConfig) => (ValidationError | ValidationWarning)[];

export const MAX_AUTO_FIX_CATEGORIES = 20;
export const MAX_CONSECUTIVE_ACTIONS = 50;
export const MAX_TOKENS_PER_ACTION = 1_000_000;
export const MAX_SESSION_DURATION = 86_400;
export const MAX_CONCURRENT_OPS = 20;
export const MAX_RETRIES = 10;
export const MAX_RETRY_DELAY = 300_000;
export const MAX_LEARNING_RATE = 1.0;
export const MIN_AUTO_CONTINUE = 0;
export const MAX_AUTO_CONTINUE = 100;
export const MIN_AUTO_DECIDE = 0;
export const MAX_AUTO_DECIDE = 100;

const REQUIRED_SECTIONS: (keyof FullConfig)[] = [
  'autonomy',
  'scanners',
  'bhp',
  'continuity',
  'safety',
  'ui',
  'notifications',
  'telemetry',
  'advanced',
];

function schemaStep(config: FullConfig): (ValidationError | ValidationWarning)[] {
  const errors: (ValidationError | ValidationWarning)[] = [];
  for (const section of REQUIRED_SECTIONS) {
    if (config[section] == null || typeof config[section] !== 'object') {
      errors.push({ field: section, message: `Missing required section: ${section}`, code: 'SCHEMA_MISSING_SECTION', severity: 'error' });
    }
  }
  if (config.autonomy) {
    if (typeof config.autonomy.autoContinueAfter !== 'number')
      errors.push({ field: 'autonomy.autoContinueAfter', message: 'Must be a number', code: 'SCHEMA_TYPE', severity: 'error' });
    if (typeof config.autonomy.autoDecideOnMatch !== 'number')
      errors.push({ field: 'autonomy.autoDecideOnMatch', message: 'Must be a number', code: 'SCHEMA_TYPE', severity: 'error' });
    if (!['passive', 'assisted', 'autonomous'].includes(config.autonomy.level))
      errors.push({ field: 'autonomy.level', message: 'Must be passive, assisted, or autonomous', code: 'SCHEMA_ENUM', severity: 'error' });
    if (!['low', 'medium', 'high'].includes(config.autonomy.riskThreshold))
      errors.push({ field: 'autonomy.riskThreshold', message: 'Must be low, medium, or high', code: 'SCHEMA_ENUM', severity: 'error' });
    if (!Array.isArray(config.autonomy.autoFixCategories))
      errors.push({ field: 'autonomy.autoFixCategories', message: 'Must be an array', code: 'SCHEMA_TYPE', severity: 'error' });
    if (typeof config.autonomy.confirmBeforeWrite !== 'boolean')
      errors.push({ field: 'autonomy.confirmBeforeWrite', message: 'Must be boolean', code: 'SCHEMA_TYPE', severity: 'error' });
  }
  if (config.safety) {
    if (!['none', 'minimal', 'basic', 'standard', 'strict', 'isolated'].includes(config.safety.sandboxLevel))
      errors.push({
        field: 'safety.sandboxLevel',
        message: 'Must be none, minimal, basic, standard, strict, or isolated',
        code: 'SCHEMA_ENUM',
        severity: 'error',
      });
    if (!Array.isArray(config.safety.requireApprovalFor))
      errors.push({ field: 'safety.requireApprovalFor', message: 'Must be an array', code: 'SCHEMA_TYPE', severity: 'error' });
    if (!Array.isArray(config.safety.allowedPaths))
      errors.push({ field: 'safety.allowedPaths', message: 'Must be an array', code: 'SCHEMA_TYPE', severity: 'error' });
    if (!Array.isArray(config.safety.blockedCommands))
      errors.push({ field: 'safety.blockedCommands', message: 'Must be an array', code: 'SCHEMA_TYPE', severity: 'error' });
  }
  if (config.advanced) {
    if (!['debug', 'info', 'warn', 'error', 'silent'].includes(config.advanced.logLevel))
      errors.push({
        field: 'advanced.logLevel',
        message: 'Must be debug, info, warn, error, or silent',
        code: 'SCHEMA_ENUM',
        severity: 'error',
      });
    if (typeof config.advanced.experimentalFeatures !== 'boolean')
      errors.push({ field: 'advanced.experimentalFeatures', message: 'Must be boolean', code: 'SCHEMA_TYPE', severity: 'error' });
    if (typeof config.advanced.debugMode !== 'boolean')
      errors.push({ field: 'advanced.debugMode', message: 'Must be boolean', code: 'SCHEMA_TYPE', severity: 'error' });
    if (!Array.isArray(config.advanced.pluginAllowList))
      errors.push({ field: 'advanced.pluginAllowList', message: 'Must be an array', code: 'SCHEMA_TYPE', severity: 'error' });
  }
  if (config.telemetry) {
    if (!['minimal', 'standard', 'verbose', 'full'].includes(config.telemetry.level))
      errors.push({
        field: 'telemetry.level',
        message: 'Must be minimal, standard, verbose, or full',
        code: 'SCHEMA_ENUM',
        severity: 'error',
      });
    if (typeof config.telemetry.enabled !== 'boolean')
      errors.push({ field: 'telemetry.enabled', message: 'Must be boolean', code: 'SCHEMA_TYPE', severity: 'error' });
    if (typeof config.telemetry.anonymize !== 'boolean')
      errors.push({ field: 'telemetry.anonymize', message: 'Must be boolean', code: 'SCHEMA_TYPE', severity: 'error' });
  }
  if (config.ui) {
    if (!['light', 'dark', 'system'].includes(config.ui.theme))
      errors.push({ field: 'ui.theme', message: 'Must be light, dark, or system', code: 'SCHEMA_ENUM', severity: 'error' });
    if (typeof config.ui.fontSize !== 'number' || config.ui.fontSize < 8 || config.ui.fontSize > 72)
      errors.push({ field: 'ui.fontSize', message: 'Must be between 8 and 72', code: 'SCHEMA_RANGE', severity: 'error' });
  }
  if (config.notifications) {
    if (!Array.isArray(config.notifications.channels))
      errors.push({ field: 'notifications.channels', message: 'Must be an array', code: 'SCHEMA_TYPE', severity: 'error' });
    if (
      config.notifications.quietHours &&
      (typeof config.notifications.quietHours.start !== 'string' || typeof config.notifications.quietHours.end !== 'string')
    )
      errors.push({
        field: 'notifications.quietHours',
        message: 'Must have start and end strings',
        code: 'SCHEMA_TYPE',
        severity: 'error',
      });
  }
  return errors;
}

function boundaryStep(config: FullConfig): (ValidationError | ValidationWarning)[] {
  const errors: (ValidationError | ValidationWarning)[] = [];
  if (config.autonomy) {
    if (config.autonomy.autoContinueAfter < MIN_AUTO_CONTINUE || config.autonomy.autoContinueAfter > MAX_AUTO_CONTINUE)
      errors.push({
        field: 'autonomy.autoContinueAfter',
        message: `Must be between ${MIN_AUTO_CONTINUE} and ${MAX_AUTO_CONTINUE}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
    if (config.autonomy.autoDecideOnMatch < MIN_AUTO_DECIDE || config.autonomy.autoDecideOnMatch > MAX_AUTO_DECIDE)
      errors.push({
        field: 'autonomy.autoDecideOnMatch',
        message: `Must be between ${MIN_AUTO_DECIDE} and ${MAX_AUTO_DECIDE}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
    if (config.autonomy.autoFixCategories.length > MAX_AUTO_FIX_CATEGORIES)
      errors.push({
        field: 'autonomy.autoFixCategories',
        message: `Max ${MAX_AUTO_FIX_CATEGORIES} categories allowed`,
        code: 'BOUNDARY_LENGTH',
        severity: 'error',
      });
    if (config.autonomy.maxConsecutiveActions < 1 || config.autonomy.maxConsecutiveActions > MAX_CONSECUTIVE_ACTIONS)
      errors.push({
        field: 'autonomy.maxConsecutiveActions',
        message: `Must be between 1 and ${MAX_CONSECUTIVE_ACTIONS}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
  }
  if (config.safety) {
    if (config.safety.maxTokensPerAction < 1 || config.safety.maxTokensPerAction > MAX_TOKENS_PER_ACTION)
      errors.push({
        field: 'safety.maxTokensPerAction',
        message: `Must be between 1 and ${MAX_TOKENS_PER_ACTION}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
    if (config.safety.maxConcurrentOps < 1 || config.safety.maxConcurrentOps > MAX_CONCURRENT_OPS)
      errors.push({
        field: 'safety.maxConcurrentOps',
        message: `Must be between 1 and ${MAX_CONCURRENT_OPS}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
  }
  if (config.continuity) {
    if (config.continuity.maxSessionDuration < 60 || config.continuity.maxSessionDuration > MAX_SESSION_DURATION)
      errors.push({
        field: 'continuity.maxSessionDuration',
        message: `Must be between 60 and ${MAX_SESSION_DURATION}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
    if (config.continuity.idleTimeout < 30 || config.continuity.idleTimeout > 3600)
      errors.push({ field: 'continuity.idleTimeout', message: 'Must be between 30 and 3600', code: 'BOUNDARY_RANGE', severity: 'error' });
    if (config.continuity.saveInterval < 5 || config.continuity.saveInterval > 600)
      errors.push({ field: 'continuity.saveInterval', message: 'Must be between 5 and 600', code: 'BOUNDARY_RANGE', severity: 'error' });
  }
  if (config.bhp) {
    if (config.bhp.learningRate < 0 || config.bhp.learningRate > MAX_LEARNING_RATE)
      errors.push({
        field: 'bhp.learningRate',
        message: `Must be between 0 and ${MAX_LEARNING_RATE}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
    if (config.bhp.feedbackThreshold < 0 || config.bhp.feedbackThreshold > 1)
      errors.push({ field: 'bhp.feedbackThreshold', message: 'Must be between 0 and 1', code: 'BOUNDARY_RANGE', severity: 'error' });
    if (config.bhp.patternMemorySize < 10 || config.bhp.patternMemorySize > 10000)
      errors.push({ field: 'bhp.patternMemorySize', message: 'Must be between 10 and 10000', code: 'BOUNDARY_RANGE', severity: 'error' });
  }
  if (config.advanced) {
    if (config.advanced.maxRetries < 0 || config.advanced.maxRetries > MAX_RETRIES)
      errors.push({
        field: 'advanced.maxRetries',
        message: `Must be between 0 and ${MAX_RETRIES}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
    if (config.advanced.retryDelayMs < 0 || config.advanced.retryDelayMs > MAX_RETRY_DELAY)
      errors.push({
        field: 'advanced.retryDelayMs',
        message: `Must be between 0 and ${MAX_RETRY_DELAY}`,
        code: 'BOUNDARY_RANGE',
        severity: 'error',
      });
  }
  if (config.telemetry) {
    if (config.telemetry.retentionDays < 1 || config.telemetry.retentionDays > 365)
      errors.push({ field: 'telemetry.retentionDays', message: 'Must be between 1 and 365', code: 'BOUNDARY_RANGE', severity: 'error' });
  }
  return errors;
}

function securityPolicyStep(config: FullConfig): (ValidationError | ValidationWarning)[] {
  const errors: (ValidationError | ValidationWarning)[] = [];
  const _riskyPatterns = ['rm -rf', 'format C:', 'del /f', '> /dev/sda', 'chmod 777', 'DROP TABLE', 'shutdown', 'reboot'];
  const dangerousCommands = ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'];

  if (config.safety) {
    const r1_blockedSet = new Set(config.safety.blockedCommands.map((c) => c.toLowerCase()));
    for (const dc of dangerousCommands) {
      if (!r1_blockedSet.has(dc)) {
        errors.push({
          field: 'safety.blockedCommands',
          message: `R1: Dangerous command '${dc}' must be blocked`,
          code: 'SEC_R1',
          severity: 'error',
        });
      }
    }
  }

  if (config.safety) {
    if (!config.safety.outputValidation) {
      errors.push({
        field: 'safety.outputValidation',
        message: 'R2: Output validation must be enabled',
        code: 'SEC_R2',
        severity: 'error',
      });
    }
    if (!config.safety.promptGuardrails) {
      errors.push({
        field: 'safety.promptGuardrails',
        message: 'R3: Prompt guardrails must be enabled',
        code: 'SEC_R3',
        severity: 'error',
      });
    }
  }

  if (config.autonomy) {
    if (config.autonomy.riskThreshold === 'high' && config.autonomy.level !== 'autonomous') {
      errors.push({
        field: 'autonomy.riskThreshold',
        message: 'R4: High risk threshold requires autonomous level',
        code: 'SEC_R4',
        severity: 'error',
      });
    }
    if (config.autonomy.level === 'passive' && config.autonomy.confirmBeforeWrite === false) {
      errors.push({
        field: 'autonomy.confirmBeforeWrite',
        message: 'R5: Passive level must have confirmBeforeWrite enabled',
        code: 'SEC_R5',
        severity: 'error',
      });
    }
  }

  if (config.advanced) {
    if (config.advanced.experimentalFeatures && config.advanced.debugMode) {
      errors.push({
        field: 'advanced.experimentalFeatures',
        message: 'R6: Experimental features and debug mode together increase risk',
        code: 'SEC_R6',
        severity: 'warning',
      });
    }
  }

  if (config.telemetry) {
    if (config.telemetry.enabled && !config.telemetry.anonymize) {
      errors.push({
        field: 'telemetry.anonymize',
        message: 'R7: Telemetry must be anonymized when enabled',
        code: 'SEC_R7',
        severity: 'warning',
      });
    }
  }

  if (config.advanced) {
    const customEnvKeys = Object.keys(config.advanced.customEnv || {});
    for (const key of customEnvKeys) {
      const upper = key.toUpperCase();
      if (
        upper.includes('TOKEN') ||
        upper.includes('SECRET') ||
        upper.includes('KEY') ||
        upper.includes('PASSWORD') ||
        upper.includes('CREDENTIAL')
      ) {
        errors.push({
          field: `advanced.customEnv.${key}`,
          message: `Security risk: sensitive key name detected: ${key}`,
          code: 'SEC_SENSITIVE_KEY',
          severity: 'error',
        });
      }
    }
  }

  return errors;
}

function contextStep(config: FullConfig): (ValidationError | ValidationWarning)[] {
  const errors: (ValidationError | ValidationWarning)[] = [];
  if (config.autonomy) {
    if (config.autonomy.autoContinueAfter > config.autonomy.autoDecideOnMatch) {
      errors.push({
        field: 'autonomy.autoContinueAfter',
        message: 'autoContinueAfter must not exceed autoDecideOnMatch',
        code: 'CONTEXT_INCONSISTENT',
        severity: 'warning',
      });
    }
  }
  if (config.notifications?.rateLimit) {
    if (config.notifications.rateLimit < 1 || config.notifications.rateLimit > 1000) {
      errors.push({
        field: 'notifications.rateLimit',
        message: 'rateLimit must be between 1 and 1000',
        code: 'CONTEXT_RANGE',
        severity: 'error',
      });
    }
  }
  if (config.scanners) {
    const scannerKeys = Object.keys(config.scanners) as (keyof typeof config.scanners)[];
    let enabledCount = 0;
    for (const key of scannerKeys) {
      if (config.scanners[key]?.enabled) enabledCount++;
    }
    if (enabledCount === 0) {
      errors.push({ field: 'scanners', message: 'At least one scanner must be enabled', code: 'CONTEXT_EMPTY', severity: 'warning' });
    }
  }
  return errors;
}

function compatibilityStep(config: FullConfig): (ValidationError | ValidationWarning)[] {
  const errors: (ValidationError | ValidationWarning)[] = [];
  if (config.continuity?.checkpointStrategy === 'git' && !config.continuity?.sessionPersistence) {
    errors.push({
      field: 'continuity.checkpointStrategy',
      message: 'Git checkpoint strategy requires session persistence',
      code: 'COMPAT_DEPENDENCY',
      severity: 'error',
    });
  }
  if (config.safety?.sandboxLevel === 'isolated' && config.autonomy?.level === 'passive') {
    errors.push({
      field: 'safety.sandboxLevel',
      message: 'Isolated sandbox is unnecessarily restrictive for passive level',
      code: 'COMPAT_MISMATCH',
      severity: 'warning',
    });
  }
  if (config.safety?.maxConcurrentOps > 1 && config.safety?.sandboxLevel === 'none') {
    errors.push({
      field: 'safety.maxConcurrentOps',
      message: 'Concurrent ops require at least basic sandbox',
      code: 'COMPAT_REQUIREMENT',
      severity: 'warning',
    });
  }
  if (config.bhp?.learningRate > 0.5 && config.autonomy?.riskThreshold === 'low') {
    errors.push({
      field: 'bhp.learningRate',
      message: 'High learning rate conflicts with low risk threshold',
      code: 'COMPAT_CONFLICT',
      severity: 'warning',
    });
  }
  return errors;
}

function dryRunStep(config: FullConfig): (ValidationError | ValidationWarning)[] {
  const warnings: (ValidationError | ValidationWarning)[] = [];
  if (config.advanced?.experimentalFeatures) {
    warnings.push({
      field: 'advanced.experimentalFeatures',
      message: 'Experimental features enabled — not production ready',
      code: 'DRYRUN_EXPERIMENTAL',
      severity: 'warning',
    });
  }
  if (config.advanced?.debugMode) {
    warnings.push({
      field: 'advanced.debugMode',
      message: 'Debug mode enabled — may expose sensitive data in logs',
      code: 'DRYRUN_DEBUG',
      severity: 'warning',
    });
  }
  if (config.autonomy?.level === 'autonomous' && config.autonomy?.riskThreshold === 'high') {
    warnings.push({
      field: 'autonomy',
      message: 'Autonomous + high risk — maximum autonomy with minimal guardrails',
      code: 'DRYRUN_HIGH_RISK',
      severity: 'warning',
    });
  }
  if (config.safety?.sandboxLevel === 'none') {
    warnings.push({
      field: 'safety.sandboxLevel',
      message: 'No sandbox — running without isolation',
      code: 'DRYRUN_NO_SANDBOX',
      severity: 'warning',
    });
  }
  return warnings;
}

const VALIDATION_STEPS: { name: string; fn: RuleFn }[] = [
  { name: 'schema', fn: schemaStep },
  { name: 'boundary', fn: boundaryStep },
  { name: 'security-policy', fn: securityPolicyStep },
  { name: 'context', fn: contextStep },
  { name: 'compatibility', fn: compatibilityStep },
  { name: 'dry-run', fn: dryRunStep },
];

export function validate(config: Partial<FullConfig>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const steps: string[] = [];

  for (const step of VALIDATION_STEPS) {
    const issues = step.fn(config as FullConfig);
    let stepOk = true;
    for (const issue of issues) {
      if (issue.severity === 'error') {
        errors.push(issue as ValidationError);
        stepOk = false;
      } else {
        warnings.push(issue as ValidationWarning);
      }
    }
    steps.push(stepOk ? `${step.name}: ok` : `${step.name}: ${issues.filter((i) => i.severity === 'error').length} error(s)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    steps,
  };
}

export function validateProfile(profile: ProfileConfig): ValidationResult {
  return validate(profile.config);
}

export function isConfigValid(config: Partial<FullConfig>): boolean {
  return validate(config).valid;
}

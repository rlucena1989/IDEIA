import * as fs from 'node:fs';
import * as _path from 'node:path';

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigError[];
}

export interface ConfigError {
  rule: string;
  field: string;
  message: string;
}

export interface ConfigData {
  level?: string;
  riskThreshold?: string;
  autoFixCategories?: string[];
  confirmBeforeWrite?: boolean;
  scanners?: Record<string, boolean>;
  [key: string]: unknown;
}

export function validate(config: ConfigData, options?: { globalConfig?: ConfigData; isMember?: boolean; context?: string }): ConfigValidationResult {
  const errors: ConfigError[] = [];

  const result = checkR1(config, options?.globalConfig);
  if (result) errors.push(result);

  const r2Error = checkR2(config);
  if (r2Error) errors.push(r2Error);

  const r3Error = checkR3(options?.context);
  if (r3Error) errors.push(r3Error);

  const r4Error = checkR4(config);
  if (r4Error) errors.push(r4Error);

  const r5Error = checkR5(config);
  if (r5Error) errors.push(r5Error);

  const r6Error = checkR6(config);
  if (r6Error) errors.push(r6Error);

  const r7Error = checkR7(config, options?.isMember);
  if (r7Error) errors.push(r7Error);

  return { valid: errors.length === 0, errors };
}

function checkR1(config: ConfigData, globalConfig?: ConfigData): ConfigError | null {
  if (!globalConfig) return null;

  const levels = ['passive', 'assisted', 'autonomous'];
  const projectLevel = config['level'] as string | undefined;
  const globalLevel = globalConfig['level'] as string | undefined;

  if (projectLevel && globalLevel) {
    if (levels.indexOf(projectLevel) > levels.indexOf(globalLevel)) {
      return {
        rule: 'R1',
        field: 'level',
        message: `R1: Project config level (${projectLevel}) is more permissive than global (${globalLevel})`,
      };
    }
  }

  const projectRisk = config['riskThreshold'] as string | undefined;
  const globalRisk = globalConfig['riskThreshold'] as string | undefined;
  const risks = ['low', 'medium', 'high'];

  if (projectRisk && globalRisk) {
    if (risks.indexOf(projectRisk) > risks.indexOf(globalRisk)) {
      return {
        rule: 'R1',
        field: 'riskThreshold',
        message: `R1: Project risk threshold (${projectRisk}) is more permissive than global (${globalRisk})`,
      };
    }
  }

  return null;
}

function checkR2(config: ConfigData): ConfigError | null {
  const categories = config['autoFixCategories'] as string[] | undefined;
  if (categories && (categories.includes('security') || categories.includes('legal'))) {
    return {
      rule: 'R2',
      field: 'autoFixCategories',
      message: 'R2: Security and legal categories must never be auto-fixed without explicit approval',
    };
  }
  return null;
}

function checkR3(context?: string): ConfigError | null {
  if (context && (context.includes('..') || context.includes('~') || context.startsWith('/'))) {
    return {
      rule: 'R3',
      field: 'context',
      message: `R3: Cross-space operations blocked: ${context}`,
    };
  }
  return null;
}

function checkR4(config: ConfigData): ConfigError | null {
  if (config['level'] && !config['levelConfirmed']) {
    return {
      rule: 'R4',
      field: 'level',
      message: 'R4: Level change requires explicit confirmation. Set levelConfirmed: true to confirm.',
    };
  }
  return null;
}

function checkR5(config: ConfigData): ConfigError | null {
  if (!config['version']) {
    return {
      rule: 'R5',
      field: 'version',
      message: 'R5: Every config change must be versioned. Set version field.',
    };
  }
  return null;
}

function checkR6(config: ConfigData): ConfigError | null {
  if (config['approvalLevel'] === undefined) {
    return null;
  }
  const securityFields = ['approvalLevel', 'securityPolicy', 'encryptionKey', 'auditLevel'];
  const hasSecurityConfig = securityFields.some(f => config[f] !== undefined);

  if (hasSecurityConfig && config['techLeadApproved'] !== true) {
    return {
      rule: 'R6',
      field: 'securityPolicy',
      message: 'R6: Security configuration changes require tech-lead approval. Set techLeadApproved: true.',
    };
  }
  return null;
}

function checkR7(config: ConfigData, isMember?: boolean): ConfigError | null {
  if (isMember && config['profile'] === 'enterprise') {
    return {
      rule: 'R7',
      field: 'profile',
      message: 'R7: Enterprise profile is immutable by team members.',
    };
  }
  return null;
}

export function validateConfigFile(configPath: string, options?: { globalConfigPath?: string; isMember?: boolean }): ConfigValidationResult {
  if (!fs.existsSync(configPath)) {
    return { valid: false, errors: [{ rule: 'FILE', field: 'configPath', message: `Config file not found: ${configPath}` }] };
  }

  let config: ConfigData;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return { valid: false, errors: [{ rule: 'PARSE', field: 'configPath', message: `Failed to parse config: ${configPath}` }] };
  }

  let globalConfig: ConfigData | undefined;
  if (options?.globalConfigPath && fs.existsSync(options.globalConfigPath)) {
    try {
      globalConfig = JSON.parse(fs.readFileSync(options.globalConfigPath, 'utf-8'));
    } catch { /* ignore */ }
  }

  return validate(config, { globalConfig, isMember: options?.isMember });
}

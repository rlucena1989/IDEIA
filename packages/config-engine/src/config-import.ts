import { createLogger } from '@ideia/logger';
import * as fs from 'fs';

const log = createLogger('config-engine:import');

export interface ImportResult {
  success: boolean;
  config: Record<string, unknown> | null;
  warnings: string[];
  errors: string[];
  format: 'json' | 'yaml';
}

export function importConfig(filePath: string): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, config: null, warnings, errors: [`File not found: ${filePath}`], format: 'json' };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const format: 'json' | 'yaml' = filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json';
    let config: Record<string, unknown>;
    if (format === 'yaml') {
      try {
        const yaml = require('yaml');
        config = yaml.parse(content);
      } catch {
        errors.push('Failed to parse YAML file');
        return { success: false, config: null, warnings, errors, format };
      }
    } else {
      try {
        config = JSON.parse(content);
      } catch {
        errors.push('Failed to parse JSON file');
        return { success: false, config: null, warnings, errors, format };
      }
    }
    if (typeof config !== 'object' || config === null) {
      errors.push('Config must be a JSON object');
      return { success: false, config: null, warnings, errors, format };
    }
    const validKeys = ['autonomy', 'scanners', 'safety', 'ui', 'notifications', 'telemetry', 'advanced', 'continuity', 'bhp'];
    for (const key of Object.keys(config)) {
      if (!validKeys.includes(key)) warnings.push(`Unknown config key: "${key}"`);
    }
    log.info(`Config imported from ${filePath} (${format})`);
    return { success: true, config, warnings, errors: [], format };
  } catch (_err) {
    errors.push(`Import error: ${_err instanceof Error ? _err.message : String(_err)}`);
    return { success: false, config: null, warnings, errors, format: 'json' };
  }
}

export function importConfigFromString(content: string, format: 'json' | 'yaml' = 'json'): ImportResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  try {
    let config: Record<string, unknown>;
    if (format === 'yaml') {
      try {
        const yaml = require('yaml');
        config = yaml.parse(content);
      } catch {
        errors.push('Failed to parse YAML');
        return { success: false, config: null, warnings, errors, format };
      }
    } else {
      try {
        config = JSON.parse(content);
      } catch {
        errors.push('Failed to parse JSON');
        return { success: false, config: null, warnings, errors, format };
      }
    }
    return { success: true, config, warnings, errors: [], format };
  } catch (_err) {
    errors.push(`Import error: ${_err instanceof Error ? _err.message : String(_err)}`);
    return { success: false, config: null, warnings, errors, format };
  }
}

export function importFromFile(filePath: string): ImportResult {
  return importConfig(filePath);
}

export function importDryRun(filePath: string): ImportResult & { wouldChange: number } {
  const result = importConfig(filePath);
  return {
    ...result,
    wouldChange: result.success && result.config ? Object.keys(result.config).length : 0,
  };
}

export function importValidate(filePath: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const result = importConfig(filePath);
  return {
    valid: result.success,
    errors: result.errors,
    warnings: result.warnings,
  };
}

export function getImportReport(result: ImportResult): string {
  const lines: string[] = [];
  lines.push('=== Import Report ===');
  lines.push(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push(`Format: ${result.format}`);
  if (result.config) {
    lines.push(`Keys: ${Object.keys(result.config).length}`);
  }
  if (result.warnings.length > 0) {
    lines.push(`Warnings (${result.warnings.length}):`);
    for (const w of result.warnings) lines.push(`  - ${w}`);
  }
  if (result.errors.length > 0) {
    lines.push(`Errors (${result.errors.length}):`);
    for (const e of result.errors) lines.push(`  - ${e}`);
  }
  return lines.join('\n');
}

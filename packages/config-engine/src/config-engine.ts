import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import type { ConfigValue, FullConfig, SecurityRule } from './types';

const log = createLogger('config-engine');

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.ideia');
const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, 'config.json');
const PROJECT_CONFIG_DIR = '.ideia';
const PROJECT_CONFIG_PATH = path.join(PROJECT_CONFIG_DIR, 'config.json');

const SECURITY_RULES: SecurityRule[] = [
  { path: 'security.minRetries', minValue: 1, description: 'Minimum retry count must be at least 1' },
  { path: 'security.maxRetries', maxValue: 10, description: 'Maximum retry count cannot exceed 10' },
  { path: 'security.logLevel', allowedValues: ['error', 'warn', 'info', 'debug'], description: 'Log level must be one of: error, warn, info, debug' },
  { path: 'security.sandbox.enabled', allowedValues: [true], description: 'Sandbox cannot be disabled by project config' },
  { path: 'security.audit.enabled', allowedValues: [true], description: 'Audit trail cannot be disabled by project config' },
];

function resolveNested(obj: Record<string, unknown>, dottedPath: string): { parent: Record<string, unknown>; key: string; fullValue: unknown } | undefined {
  const parts = dottedPath.split('.');
  let current: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[parts[i] ?? ''];
  }
  if (typeof current !== 'object' || current === null) return undefined;
  const parent = current as Record<string, unknown>;
  const key = parts[parts.length - 1] ?? '';
  return { parent, key, fullValue: parent[key] };
}

function setNested(obj: Record<string, unknown>, dottedPath: string, value: unknown): void {
  const parts = dottedPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i] ?? '';
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1] ?? ''] = value;
}

function deleteNested(obj: Record<string, unknown>, dottedPath: string): boolean {
  const resolved = resolveNested(obj, dottedPath);
  if (!resolved) return false;
  delete resolved.parent[resolved.key];
  return true;
}

function getNested(obj: Record<string, unknown>, dottedPath: string): ConfigValue | undefined {
  const resolved = resolveNested(obj, dottedPath);
  if (!resolved) return undefined;
  return resolved.fullValue as ConfigValue;
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) &&
        key in result && result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function checkSecurityRuleViolation(path: string, value: unknown, rules: SecurityRule[]): string | null {
  for (const rule of rules) {
    const globPattern = rule.path.replace(/\*\*/g, '.*').replace(/\*/g, '[^.]*');
    const re = new RegExp(`^${globPattern}$`);
    if (!re.test(path)) continue;
    if (rule.allowedValues !== undefined && !rule.allowedValues.includes(value as ConfigValue)) {
      return `Security violation at '${path}': value ${JSON.stringify(value)} not in allowed values ${JSON.stringify(rule.allowedValues)}. ${rule.description || ''}`;
    }
    if (rule.minValue !== undefined && typeof value === 'number' && value < rule.minValue) {
      return `Security violation at '${path}': ${value} < minimum ${rule.minValue}. ${rule.description || ''}`;
    }
    if (rule.maxValue !== undefined && typeof value === 'number' && value > rule.maxValue) {
      return `Security violation at '${path}': ${value} > maximum ${rule.maxValue}. ${rule.description || ''}`;
    }
  }
  return null;
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

async function readJsonFile(filePath: string): Promise<Record<string, unknown>> {
  try {
    const content = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeJsonFile(filePath: string, data: Record<string, unknown>): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export class ConfigEngine {
  private globalConfig: Record<string, unknown> = {};
  private projectConfig: Record<string, unknown> = {};
  private securityRules: SecurityRule[] = [...SECURITY_RULES];
  private loaded = false;

  constructor(
    private eventBus?: EventBus,
    private auditTrail?: AuditTrail,
    customRules?: SecurityRule[],
  ) {
    if (customRules) this.securityRules.push(...customRules);
  }

  async load(): Promise<void> {
    this.globalConfig = await readJsonFile(GLOBAL_CONFIG_PATH);
    this.projectConfig = await readJsonFile(PROJECT_CONFIG_PATH);
    this.loaded = true;
    log.info('Config loaded', { globalKeys: Object.keys(this.globalConfig).length, projectKeys: Object.keys(this.projectConfig).length });
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      try {
        const raw = fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8');
        this.globalConfig = JSON.parse(raw);
      } catch {
        this.globalConfig = {};
      }
      try {
        const raw = fs.readFileSync(PROJECT_CONFIG_PATH, 'utf-8');
        this.projectConfig = JSON.parse(raw);
      } catch {
        this.projectConfig = {};
      }
      this.loaded = true;
    }
  }

  private getMerged(): Record<string, unknown> {
    this.ensureLoaded();
    const merged = deepMerge(this.globalConfig, this.projectConfig);
    return merged;
  }

  get(path?: string): ConfigValue | undefined {
    this.ensureLoaded();
    if (path === undefined || path === '') return this.getMerged() as ConfigValue;
    return getNested(this.getMerged(), path);
  }

  async set(path: string, value: unknown): Promise<void> {
    this.ensureLoaded();
    const violation = checkSecurityRuleViolation(path, value, this.securityRules);
    if (violation) {
      log.warn(violation);
      await this.audit('config.set.rejected', path, { value, reason: violation });
      throw new Error(violation);
    }
    const oldValue = getNested(this.projectConfig, path);
    setNested(this.projectConfig, path, value);
    await writeJsonFile(PROJECT_CONFIG_PATH, this.projectConfig);
    await this.audit('config.set', path, { oldValue, newValue: value });
    if (this.eventBus) {
      await this.eventBus.emit({ type: 'config.changed', source: 'config-engine', payload: { path, oldValue, newValue: value } });
    }
  }

  async setGlobal(path: string, value: unknown): Promise<void> {
    this.ensureLoaded();
    const oldValue = getNested(this.globalConfig, path);
    setNested(this.globalConfig, path, value);
    await writeJsonFile(GLOBAL_CONFIG_PATH, this.globalConfig);
    await this.audit('config.set.global', path, { oldValue, newValue: value });
    if (this.eventBus) {
      await this.eventBus.emit({ type: 'config.changed', source: 'config-engine', payload: { scope: 'global', path, oldValue, newValue: value } });
    }
  }

  async reset(path?: string): Promise<void> {
    this.ensureLoaded();
    if (path === undefined || path === '') {
      this.projectConfig = {};
      await writeJsonFile(PROJECT_CONFIG_PATH, {});
      await this.audit('config.reset.all', '*', {});
      if (this.eventBus) {
        await this.eventBus.emit({ type: 'config.reset', source: 'config-engine', payload: { scope: 'project', path: '*' } });
      }
      return;
    }
    const oldValue = getNested(this.projectConfig, path);
    const removed = deleteNested(this.projectConfig, path);
    if (removed) {
      await writeJsonFile(PROJECT_CONFIG_PATH, this.projectConfig);
      await this.audit('config.reset', path, { oldValue });
      if (this.eventBus) {
        await this.eventBus.emit({ type: 'config.reset', source: 'config-engine', payload: { path, oldValue } });
      }
    }
  }

  getFull(): FullConfig {
    return this.getMerged() as FullConfig;
  }

  getGlobal(): FullConfig {
    this.ensureLoaded();
    return { ...this.globalConfig } as FullConfig;
  }

  getProject(): FullConfig {
    this.ensureLoaded();
    return { ...this.projectConfig } as FullConfig;
  }

  getValidationErrors(): string[] {
    this.ensureLoaded();
    const errors: string[] = [];
    const merged = this.getMerged();
    const keys = flattenKeys(merged);
    for (const key of keys) {
      const value = getNested(merged, key);
      for (const rule of this.securityRules) {
        const globPattern = rule.path.replace(/\*\*/g, '.*').replace(/\*/g, '[^.]*');
        const re = new RegExp(`^${globPattern}$`);
        if (!re.test(key)) continue;
        if (rule.required && value === undefined) {
          errors.push(`Required config '${key}' is missing`);
        }
        if (value !== undefined) {
          const violation = checkSecurityRuleViolation(key, value, this.securityRules);
          if (violation) errors.push(violation);
        }
      }
    }
    return errors;
  }

  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors = this.getValidationErrors();
    return { valid: errors.length === 0, errors };
  }

  private async audit(action: string, target: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.auditTrail) return;
    try {
      this.auditTrail.append({
        actor: 'system',
        eventType: action,
        target,
        decision: 'approved',
        result: 'success',
        metadata,
      });
    } catch (_err) {
      log.error('Audit append failed', { error: String(_err) });
    }
  }
}

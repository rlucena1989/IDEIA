import { join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { Scope, AllowedPaths, ScopeViolationEvent } from './types';
import { createLogger } from '@ideia/logger';
import { PolicyParser, ParsedIsolationPolicy } from './policy-parser';
import { PolicyEnforcer } from './policy-enforcer';

export type IoOperation = 'read' | 'write' | 'delete' | 'list' | 'mkdir' | 'exists';

export interface IoRequest {
  operation: IoOperation;
  scope: Scope;
  targetPath: string;
  content?: string;
}

export interface IoResult {
  operation: IoOperation;
  allowed: boolean;
  resolvedPath: string;
  data?: unknown;
  error?: string;
  violation?: ScopeViolationEvent;
}

export interface IsolationBoundaryConfig {
  selfSpace: string[];
  projectSpace: string[];
  allowList?: string[];
  blockList?: string[];
  readOnlyPaths?: string[];
  dryRun?: boolean;
}

const DEFAULT_SELF_SPACE = [
  join(process.env.HOME || process.env.USERPROFILE || '~', '.ideia'),
  '.ai',
];

const DEFAULT_PROJECT_SPACE = [process.cwd()];

const log = createLogger('scope-isolation:isolation-boundary');

export class IsolationBoundary {
  private allowedPaths: AllowedPaths;
  private allowList: string[];
  private blockList: string[];
  private readOnlyPaths: string[];
  private dryRun: boolean;
  private violations: ScopeViolationEvent[] = [];

  constructor(config?: Partial<IsolationBoundaryConfig>) {
    this.allowedPaths = {
      selfSpace: (config?.selfSpace ?? DEFAULT_SELF_SPACE).map(p => resolve(p)),
      projectSpace: (config?.projectSpace ?? DEFAULT_PROJECT_SPACE).map(p => resolve(p)),
    };
    this.allowList = (config?.allowList ?? []).map(p => resolve(p));
    this.blockList = (config?.blockList ?? []).map(p => resolve(p));
    this.readOnlyPaths = (config?.readOnlyPaths ?? []).map(p => resolve(p));
    this.dryRun = config?.dryRun ?? false;
  }

  get allowedPathsConfig(): AllowedPaths {
    return { ...this.allowedPaths };
  }

  checkAccess(operation: IoOperation, targetPath: string): IoResult {
    const resolved = resolve(targetPath);
    const normalized = resolved.replace(/\\/g, '/');

    if (this.isBlocked(normalized)) {
      return this.blocked(operation, targetPath, resolved, 'Path is in block list');
    }

    if (this.isAllowed(normalized)) {
      return { operation, allowed: true, resolvedPath: resolved };
    }

    const inSelf = this.isInSelfSpace(normalized);
    const inProject = this.isInProjectSpace(normalized);

    if (inSelf || inProject) {
      return { operation, allowed: true, resolvedPath: resolved };
    }

    return this.blocked(operation, targetPath, resolved, 'Path outside allowed spaces');
  }

  validate(scope: Scope, targetPath: string): IoResult {
    return this.checkAccess('read', targetPath);
  }

  read(scope: Scope, targetPath: string): IoResult {
    const validation = this.validate(scope, targetPath);
    if (!validation.allowed) return validation;

    try {
      const content = readFileSync(validation.resolvedPath, 'utf-8');
      return { operation: 'read', allowed: true, resolvedPath: validation.resolvedPath, data: content };
    } catch (err) {
      return { operation: 'read', allowed: false, resolvedPath: validation.resolvedPath, error: String(err) };
    }
  }

  write(scope: Scope, targetPath: string, content: string): IoResult {
    const validation = this.validate(scope, targetPath);
    if (!validation.allowed) return validation;

    if (this.isReadOnly(validation.resolvedPath)) {
      return this.blocked('write', targetPath, validation.resolvedPath, 'Path is read-only');
    }

    if (this.dryRun) {
      return { operation: 'write', allowed: true, resolvedPath: validation.resolvedPath };
    }

    try {
      mkdirSync(resolve(validation.resolvedPath, '..'), { recursive: true });
      writeFileSync(validation.resolvedPath, content, 'utf-8');
      return { operation: 'write', allowed: true, resolvedPath: validation.resolvedPath };
    } catch (err) {
      return { operation: 'write', allowed: false, resolvedPath: validation.resolvedPath, error: String(err) };
    }
  }

  delete(scope: Scope, targetPath: string): IoResult {
    const validation = this.validate(scope, targetPath);
    if (!validation.allowed) return validation;

    if (this.isReadOnly(validation.resolvedPath)) {
      return this.blocked('delete', targetPath, validation.resolvedPath, 'Path is read-only');
    }

    if (this.dryRun) {
      return { operation: 'delete', allowed: true, resolvedPath: validation.resolvedPath };
    }

    try {
      const stat = statSync(validation.resolvedPath);
      if (stat.isDirectory()) {
        rmdirSync(validation.resolvedPath, { recursive: true });
      } else {
        unlinkSync(validation.resolvedPath);
      }
      return { operation: 'delete', allowed: true, resolvedPath: validation.resolvedPath };
    } catch (err) {
      return { operation: 'delete', allowed: false, resolvedPath: validation.resolvedPath, error: String(err) };
    }
  }

  list(scope: Scope, targetPath: string): IoResult {
    const validation = this.validate(scope, targetPath);
    if (!validation.allowed) return validation;

    try {
      const entries = readdirSync(validation.resolvedPath);
      return { operation: 'list', allowed: true, resolvedPath: validation.resolvedPath, data: entries };
    } catch (err) {
      return { operation: 'list', allowed: false, resolvedPath: validation.resolvedPath, error: String(err) };
    }
  }

  exists(scope: Scope, targetPath: string): IoResult {
    const validation = this.validate(scope, targetPath);
    if (!validation.allowed) return validation;

    try {
      const result = existsSync(validation.resolvedPath);
      return { operation: 'exists', allowed: true, resolvedPath: validation.resolvedPath, data: result };
    } catch (err) {
      return { operation: 'exists', allowed: false, resolvedPath: validation.resolvedPath, error: String(err) };
    }
  }

  getAuditLog(): ScopeViolationEvent[] {
    return [...this.violations];
  }

  clearAuditLog(): void {
    this.violations = [];
  }

  getViolations(): ScopeViolationEvent[] {
    return [...this.violations];
  }

  private isInSelfSpace(normalized: string): boolean {
    return this.allowedPaths.selfSpace.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
  }

  private isInProjectSpace(normalized: string): boolean {
    return this.allowedPaths.projectSpace.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
  }

  private isBlocked(normalized: string): boolean {
    return this.blockList.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
  }

  private isAllowed(normalized: string): boolean {
    return this.allowList.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
  }

  private isReadOnly(resolvedPath: string): boolean {
    const normalized = resolvedPath.replace(/\\/g, '/');
    return this.readOnlyPaths.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
  }

  private block(scope: Scope, targetPath: string, resolvedPath: string, reason: string): ScopeViolationEvent {
    const event: ScopeViolationEvent = {
      id: `violation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      fromScope: scope,
      targetPath,
      resolvedPath,
      policyAction: 'blocked',
      reason,
    };
    this.violations.push(event);
    if (this.violations.length > 500) this.violations.shift();
    return event;
  }

  private blocked(operation: IoOperation, targetPath: string, resolvedPath: string, reason: string): IoResult {
    const event = this.block('project' as Scope, targetPath, resolvedPath, reason);
    log.warn(`[IsolationBoundary] Violation: ${resolvedPath} (${reason})`);
    return {
      operation,
      allowed: false,
      resolvedPath,
      error: reason,
      violation: event,
    };
  }
}

export function createBoundary(
  config: Partial<IsolationBoundaryConfig>,
  policyYaml?: string,
): { boundary: IsolationBoundary; enforcer: PolicyEnforcer } {
  const boundary = new IsolationBoundary(config);
  const enforcer = new PolicyEnforcer();

  if (policyYaml) {
    try {
      const parsed = PolicyParser.parse(policyYaml);
      enforcer.load(parsed);
    } catch {
      log.warn('Failed to parse policy YAML for boundary');
    }
  }

  return { boundary, enforcer };
}

export function createIsolationBoundary(config?: Partial<IsolationBoundaryConfig>): IsolationBoundary {
  return new IsolationBoundary(config);
}

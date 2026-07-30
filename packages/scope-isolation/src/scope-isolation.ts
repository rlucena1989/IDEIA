import path from 'path';
import { createLogger } from '@ideia/logger';
import { Scope, AllowedPaths, ResolveResult } from './types';
import { PolicyEnforcer } from './policy-enforcer';
import { PolicyParser, ParsedIsolationPolicy } from './policy-parser';
import { IsolationPolicy } from './isolation-policy';
import { ValidationResult } from './path-validator';
const logger = createLogger('scope-isolation');

export class ScopeViolationError extends Error {
  public readonly fromScope: Scope;
  public readonly targetPath: string;
  public readonly resolvedPath: string;

  constructor(fromScope: Scope, targetPath: string, resolvedPath: string, message?: string) {
    super(message || `Cross-scope access blocked: ${fromScope} → ${targetPath}`);
    this.name = 'ScopeViolationError';
    this.fromScope = fromScope;
    this.targetPath = targetPath;
    this.resolvedPath = resolvedPath;
  }
}

export class PathValidator {
  private allowedPaths: AllowedPaths;

  constructor(allowedPaths: AllowedPaths) {
    if (!allowedPaths.selfSpace || !allowedPaths.projectSpace) {
      throw new Error('PathValidator requires both selfSpace and projectSpace path lists');
    }
    this.allowedPaths = {
      selfSpace: allowedPaths.selfSpace.map(p => path.resolve(p)),
      projectSpace: allowedPaths.projectSpace.map(p => path.resolve(p)),
    };
  }

  resolvePath(scope: Scope, target: string): ResolveResult {
    const resolved = path.resolve(target);
    const normalized = resolved.replace(/\\/g, '/');

    const inSelf = this.allowedPaths.selfSpace.some(p =>
      normalized.startsWith(p.replace(/\\/g, '/')),
    );
    const inProject = this.allowedPaths.projectSpace.some(p =>
      normalized.startsWith(p.replace(/\\/g, '/')),
    );

    if (scope === 'self' && !inSelf && inProject) {
      return {
        resolvedPath: resolved,
        crossScope: true,
        blocked: true,
        reason: `Self-scope attempted to access project space: ${target}`,
      };
    }

    if (scope === 'project' && !inProject && inSelf) {
      return {
        resolvedPath: resolved,
        crossScope: true,
        blocked: true,
        reason: `Project-scope attempted to access self space: ${target}`,
      };
    }

    return {
      resolvedPath: resolved,
      crossScope: false,
      blocked: false,
    };
  }

  resolvePathOrThrow(scope: Scope, target: string): string {
    const result = this.resolvePath(scope, target);
    if (result.blocked) {
      throw new ScopeViolationError(scope, target, result.resolvedPath, result.reason);
    }
    return result.resolvedPath;
  }

  isWithinScope(scope: Scope, target: string): boolean {
    const result = this.resolvePath(scope, target);
    return !result.crossScope && !result.blocked;
  }

  getAllowedList(scope: Scope): string[] {
    return scope === 'self'
      ? [...this.allowedPaths.selfSpace]
      : [...this.allowedPaths.projectSpace];
  }

  validate(targetPath: string, scope: Scope, _operation?: string): ValidationResult {
    const resolved = path.resolve(targetPath);
    const hasTraversal = targetPath.includes('..');
    const normalized = resolved.replace(/\\/g, '/');

    if (hasTraversal) {
      return {
        allowed: false,
        reason: `Path traversal detected: ${targetPath}`,
        resolvedPath: resolved,
      };
    }

    const inSelf = this.allowedPaths.selfSpace.some(p =>
      normalized.startsWith(p.replace(/\\/g, '/')),
    );
    const inProject = this.allowedPaths.projectSpace.some(p =>
      normalized.startsWith(p.replace(/\\/g, '/')),
    );

    if (scope === 'self' && inSelf) {
      return { allowed: true, reason: 'Valid self-scope path', resolvedPath: resolved };
    }
    if (scope === 'project' && inProject) {
      return { allowed: true, reason: 'Valid project-scope path', resolvedPath: resolved };
    }

    return {
      allowed: false,
      reason: `Path ${targetPath} not in allowed scope '${scope}'`,
      resolvedPath: resolved,
    };
  }

  getWorkspaceRoot(): string {
    return path.resolve(process.cwd());
  }

  getWorkspaceRelativePath(absolutePath: string): string {
    const root = this.getWorkspaceRoot();
    return path.relative(root, absolutePath);
  }
}

export class ScopeIsolation {
  public readonly validator: PathValidator;
  public readonly enforcer: PolicyEnforcer;
  private isolationPolicy: IsolationPolicy;

  constructor(allowedPaths: AllowedPaths, policyConfig?: Partial<import('./types').IsolationPolicyConfig>) {
    this.validator = new PathValidator(allowedPaths);
    this.enforcer = new PolicyEnforcer();
    this.isolationPolicy = new IsolationPolicy(policyConfig);
  }

  resolvePath(scope: Scope, target: string): string {
    return this.validator.resolvePathOrThrow(scope, target);
  }

  resolveScope(scope: Scope, target: string): ResolveResult {
    const result = this.validator.resolvePath(scope, target);
    return result;
  }

  loadPolicyFromYaml(yamlContent: string): void {
    const parsed = PolicyParser.parse(yamlContent);
    this.enforcer.load(parsed);
  }

  loadPolicyFromFile(filePath: string): void {
    const parsed = PolicyParser.parseFile(filePath);
    this.enforcer.load(parsed);
  }

  getIsolationPolicy(): IsolationPolicy {
    return this.isolationPolicy;
  }

  evaluateAccess(fromScope: Scope, toScope: Scope): {
    allowed: boolean;
    bypassRequired: boolean;
    approvalLevel: string;
    reason: string;
  } {
    return this.isolationPolicy.evaluate(fromScope, toScope);
  }
}

export function createPathValidator(allowedPaths: AllowedPaths): PathValidator {
  return new PathValidator(allowedPaths);
}

export function createScopeIsolation(allowedPaths: AllowedPaths): ScopeIsolation {
  return new ScopeIsolation(allowedPaths);
}

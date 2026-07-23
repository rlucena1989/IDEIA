import path from 'path';
import { Scope, AllowedPaths, ResolveResult } from './types';

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
}

export class ScopeIsolation {
  public readonly validator: PathValidator;

  constructor(allowedPaths: AllowedPaths) {
    this.validator = new PathValidator(allowedPaths);
  }

  resolvePath(scope: Scope, target: string): string {
    return this.validator.resolvePathOrThrow(scope, target);
  }
}

export function createPathValidator(allowedPaths: AllowedPaths): PathValidator {
  return new PathValidator(allowedPaths);
}

export function createScopeIsolation(allowedPaths: AllowedPaths): ScopeIsolation {
  return new ScopeIsolation(allowedPaths);
}

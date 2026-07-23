import * as path from 'node:path';

export class ScopeViolationError extends Error {
  public scope: string;
  public target: string;
  public allowedPaths: string[];
  public violationType: 'outside_scope' | 'path_traversal' | 'not_allowed';

  constructor(scope: string, target: string, allowedPaths: string[], violationType: 'outside_scope' | 'path_traversal' | 'not_allowed') {
    const msg = `Scope violation: "${target}" is not allowed in scope "${scope}". Allowed paths: ${allowedPaths.join(', ')}`;
    super(msg);
    this.name = 'ScopeViolationError';
    this.scope = scope;
    this.target = target;
    this.allowedPaths = allowedPaths;
    this.violationType = violationType;
  }
}

export class PathValidator {
  private scopes: Map<string, string[]> = new Map();

  registerScope(scope: string, allowedPaths: string[]): void {
    const normalized = allowedPaths.map(p => path.resolve(p));
    this.scopes.set(scope, normalized);
  }

  validatePath(scope: string, target: string): { allowed: boolean; resolvedPath: string; error?: ScopeViolationError } {
    const allowedPaths = this.scopes.get(scope);
    if (!allowedPaths) {
      const err = new ScopeViolationError(scope, target, [], 'not_allowed');
      return { allowed: false, resolvedPath: target, error: err };
    }

    const resolvedTarget = path.resolve(target);

    const traversalRisk = resolvedTarget.includes('..') || target.includes('..');
    if (traversalRisk) {
      const err = new ScopeViolationError(scope, target, allowedPaths, 'path_traversal');
      return { allowed: false, resolvedPath: resolvedTarget, error: err };
    }

    const isAllowed = allowedPaths.some(allowed => {
      const relative = path.relative(allowed, resolvedTarget);
      return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
    });

    if (!isAllowed) {
      const err = new ScopeViolationError(scope, target, allowedPaths, 'outside_scope');
      return { allowed: false, resolvedPath: resolvedTarget, error: err };
    }

    return { allowed: true, resolvedPath: resolvedTarget };
  }

  getAllowedPaths(scope: string): string[] {
    return this.scopes.get(scope) ?? [];
  }

  removeScope(scope: string): boolean {
    return this.scopes.delete(scope);
  }

  listScopes(): string[] {
    return Array.from(this.scopes.keys());
  }
}

export function expectViolation(fn: () => void): ScopeViolationError {
  try {
    fn();
    throw new Error('Expected ScopeViolationError but no error was thrown');
  } catch (_err) {
    if (err instanceof ScopeViolationError) return err;
    throw err;
  }
}

export function expectAllowed(fn: () => void): true {
  try {
    fn();
    return true;
  } catch (_err) {
    throw new Error(`Expected no violation but got: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function createPathValidator(): PathValidator {
  return new PathValidator();
}

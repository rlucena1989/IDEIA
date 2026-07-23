import { Scope, AllowedPaths, ResolveResult } from './types';
export declare class ScopeViolationError extends Error {
    readonly fromScope: Scope;
    readonly targetPath: string;
    readonly resolvedPath: string;
    constructor(fromScope: Scope, targetPath: string, resolvedPath: string, message?: string);
}
export declare class PathValidator {
    private allowedPaths;
    constructor(allowedPaths: AllowedPaths);
    resolvePath(scope: Scope, target: string): ResolveResult;
    resolvePathOrThrow(scope: Scope, target: string): string;
    isWithinScope(scope: Scope, target: string): boolean;
    getAllowedList(scope: Scope): string[];
}
export declare class ScopeIsolation {
    readonly validator: PathValidator;
    constructor(allowedPaths: AllowedPaths);
    resolvePath(scope: Scope, target: string): string;
}
export declare function createPathValidator(allowedPaths: AllowedPaths): PathValidator;
export declare function createScopeIsolation(allowedPaths: AllowedPaths): ScopeIsolation;
//# sourceMappingURL=scope-isolation.d.ts.map
export declare class ScopeViolationError extends Error {
    scope: string;
    target: string;
    allowedPaths: string[];
    violationType: 'outside_scope' | 'path_traversal' | 'not_allowed';
    constructor(scope: string, target: string, allowedPaths: string[], violationType: 'outside_scope' | 'path_traversal' | 'not_allowed');
}
export declare class PathValidator {
    private scopes;
    registerScope(scope: string, allowedPaths: string[]): void;
    validatePath(scope: string, target: string): {
        allowed: boolean;
        resolvedPath: string;
        error?: ScopeViolationError;
    };
    getAllowedPaths(scope: string): string[];
    removeScope(scope: string): boolean;
    listScopes(): string[];
}
export declare function expectViolation(fn: () => void): ScopeViolationError;
export declare function expectAllowed(fn: () => void): true;
export declare function createPathValidator(): PathValidator;
//# sourceMappingURL=path-validator.d.ts.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopeIsolation = exports.PathValidator = exports.ScopeViolationError = void 0;
exports.createPathValidator = createPathValidator;
exports.createScopeIsolation = createScopeIsolation;
const path_1 = __importDefault(require("path"));
class ScopeViolationError extends Error {
    fromScope;
    targetPath;
    resolvedPath;
    constructor(fromScope, targetPath, resolvedPath, message) {
        super(message || `Cross-scope access blocked: ${fromScope} → ${targetPath}`);
        this.name = 'ScopeViolationError';
        this.fromScope = fromScope;
        this.targetPath = targetPath;
        this.resolvedPath = resolvedPath;
    }
}
exports.ScopeViolationError = ScopeViolationError;
class PathValidator {
    allowedPaths;
    constructor(allowedPaths) {
        if (!allowedPaths.selfSpace || !allowedPaths.projectSpace) {
            throw new Error('PathValidator requires both selfSpace and projectSpace path lists');
        }
        this.allowedPaths = {
            selfSpace: allowedPaths.selfSpace.map(p => path_1.default.resolve(p)),
            projectSpace: allowedPaths.projectSpace.map(p => path_1.default.resolve(p)),
        };
    }
    resolvePath(scope, target) {
        const resolved = path_1.default.resolve(target);
        const normalized = resolved.replace(/\\/g, '/');
        const inSelf = this.allowedPaths.selfSpace.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
        const inProject = this.allowedPaths.projectSpace.some(p => normalized.startsWith(p.replace(/\\/g, '/')));
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
    resolvePathOrThrow(scope, target) {
        const result = this.resolvePath(scope, target);
        if (result.blocked) {
            throw new ScopeViolationError(scope, target, result.resolvedPath, result.reason);
        }
        return result.resolvedPath;
    }
    isWithinScope(scope, target) {
        const result = this.resolvePath(scope, target);
        return !result.crossScope && !result.blocked;
    }
    getAllowedList(scope) {
        return scope === 'self'
            ? [...this.allowedPaths.selfSpace]
            : [...this.allowedPaths.projectSpace];
    }
}
exports.PathValidator = PathValidator;
class ScopeIsolation {
    validator;
    constructor(allowedPaths) {
        this.validator = new PathValidator(allowedPaths);
    }
    resolvePath(scope, target) {
        return this.validator.resolvePathOrThrow(scope, target);
    }
}
exports.ScopeIsolation = ScopeIsolation;
function createPathValidator(allowedPaths) {
    return new PathValidator(allowedPaths);
}
function createScopeIsolation(allowedPaths) {
    return new ScopeIsolation(allowedPaths);
}
//# sourceMappingURL=scope-isolation.js.map
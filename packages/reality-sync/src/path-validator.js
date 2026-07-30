"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathValidator = exports.ScopeViolationError = void 0;
exports.expectViolation = expectViolation;
exports.expectAllowed = expectAllowed;
exports.createPathValidator = createPathValidator;
const path = __importStar(require("node:path"));
class ScopeViolationError extends Error {
    scope;
    target;
    allowedPaths;
    violationType;
    constructor(scope, target, allowedPaths, violationType) {
        const msg = `Scope violation: "${target}" is not allowed in scope "${scope}". Allowed paths: ${allowedPaths.join(', ')}`;
        super(msg);
        this.name = 'ScopeViolationError';
        this.scope = scope;
        this.target = target;
        this.allowedPaths = allowedPaths;
        this.violationType = violationType;
    }
}
exports.ScopeViolationError = ScopeViolationError;
class PathValidator {
    scopes = new Map();
    registerScope(scope, allowedPaths) {
        const normalized = allowedPaths.map(p => path.resolve(p));
        this.scopes.set(scope, normalized);
    }
    validatePath(scope, target) {
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
    getAllowedPaths(scope) {
        return this.scopes.get(scope) ?? [];
    }
    removeScope(scope) {
        return this.scopes.delete(scope);
    }
    listScopes() {
        return Array.from(this.scopes.keys());
    }
}
exports.PathValidator = PathValidator;
function expectViolation(fn) {
    try {
        fn();
        throw new Error('Expected ScopeViolationError but no error was thrown');
    }
    catch (_err) {
        if (_err instanceof ScopeViolationError)
            return _err;
        throw _err;
    }
}
function expectAllowed(fn) {
    try {
        fn();
        return true;
    }
    catch (_err) {
        throw new Error(`Expected no violation but got: ${_err instanceof Error ? _err.message : String(_err)}`);
    }
}
function createPathValidator() {
    return new PathValidator();
}
//# sourceMappingURL=path-validator.js.map
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createViolationAudit = exports.ViolationAudit = exports.createIsolationPolicy = exports.IsolationPolicy = exports.ScopeViolationError = exports.createPathValidator = exports.PathValidator = exports.createScopeIsolation = exports.ScopeIsolation = void 0;
var scope_isolation_1 = require("./scope-isolation");
Object.defineProperty(exports, "ScopeIsolation", { enumerable: true, get: function () { return scope_isolation_1.ScopeIsolation; } });
Object.defineProperty(exports, "createScopeIsolation", { enumerable: true, get: function () { return scope_isolation_1.createScopeIsolation; } });
Object.defineProperty(exports, "PathValidator", { enumerable: true, get: function () { return scope_isolation_1.PathValidator; } });
Object.defineProperty(exports, "createPathValidator", { enumerable: true, get: function () { return scope_isolation_1.createPathValidator; } });
Object.defineProperty(exports, "ScopeViolationError", { enumerable: true, get: function () { return scope_isolation_1.ScopeViolationError; } });
var isolation_policy_1 = require("./isolation-policy");
Object.defineProperty(exports, "IsolationPolicy", { enumerable: true, get: function () { return isolation_policy_1.IsolationPolicy; } });
Object.defineProperty(exports, "createIsolationPolicy", { enumerable: true, get: function () { return isolation_policy_1.createIsolationPolicy; } });
var violation_audit_1 = require("./violation-audit");
Object.defineProperty(exports, "ViolationAudit", { enumerable: true, get: function () { return violation_audit_1.ViolationAudit; } });
Object.defineProperty(exports, "createViolationAudit", { enumerable: true, get: function () { return violation_audit_1.createViolationAudit; } });
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map
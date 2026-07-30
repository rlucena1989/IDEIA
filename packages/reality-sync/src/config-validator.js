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
exports.validate = validate;
exports.validateConfigFile = validateConfigFile;
const fs = __importStar(require("node:fs"));
function validate(config, options) {
    const errors = [];
    const result = checkR1(config, options?.globalConfig);
    if (result)
        errors.push(result);
    const r2Error = checkR2(config);
    if (r2Error)
        errors.push(r2Error);
    const r3Error = checkR3(options?.context);
    if (r3Error)
        errors.push(r3Error);
    const r4Error = checkR4(config);
    if (r4Error)
        errors.push(r4Error);
    const r5Error = checkR5(config);
    if (r5Error)
        errors.push(r5Error);
    const r6Error = checkR6(config);
    if (r6Error)
        errors.push(r6Error);
    const r7Error = checkR7(config, options?.isMember);
    if (r7Error)
        errors.push(r7Error);
    return { valid: errors.length === 0, errors };
}
function checkR1(config, globalConfig) {
    if (!globalConfig)
        return null;
    const levels = ['passive', 'assisted', 'autonomous'];
    const projectLevel = config['level'];
    const globalLevel = globalConfig['level'];
    if (projectLevel && globalLevel) {
        if (levels.indexOf(projectLevel) > levels.indexOf(globalLevel)) {
            return {
                rule: 'R1',
                field: 'level',
                message: `R1: Project config level (${projectLevel}) is more permissive than global (${globalLevel})`,
            };
        }
    }
    const projectRisk = config['riskThreshold'];
    const globalRisk = globalConfig['riskThreshold'];
    const risks = ['low', 'medium', 'high'];
    if (projectRisk && globalRisk) {
        if (risks.indexOf(projectRisk) > risks.indexOf(globalRisk)) {
            return {
                rule: 'R1',
                field: 'riskThreshold',
                message: `R1: Project risk threshold (${projectRisk}) is more permissive than global (${globalRisk})`,
            };
        }
    }
    return null;
}
function checkR2(config) {
    const categories = config['autoFixCategories'];
    if (categories && (categories.includes('security') || categories.includes('legal'))) {
        return {
            rule: 'R2',
            field: 'autoFixCategories',
            message: 'R2: Security and legal categories must never be auto-fixed without explicit approval',
        };
    }
    return null;
}
function checkR3(context) {
    if (context && (context.includes('..') || context.includes('~') || context.startsWith('/'))) {
        return {
            rule: 'R3',
            field: 'context',
            message: `R3: Cross-space operations blocked: ${context}`,
        };
    }
    return null;
}
function checkR4(config) {
    if (config['level'] && !config['levelConfirmed']) {
        return {
            rule: 'R4',
            field: 'level',
            message: 'R4: Level change requires explicit confirmation. Set levelConfirmed: true to confirm.',
        };
    }
    return null;
}
function checkR5(config) {
    if (!config['version']) {
        return {
            rule: 'R5',
            field: 'version',
            message: 'R5: Every config change must be versioned. Set version field.',
        };
    }
    return null;
}
function checkR6(config) {
    if (config['approvalLevel'] === undefined) {
        return null;
    }
    const securityFields = ['approvalLevel', 'securityPolicy', 'encryptionKey', 'auditLevel'];
    const hasSecurityConfig = securityFields.some(f => config[f] !== undefined);
    if (hasSecurityConfig && config['techLeadApproved'] !== true) {
        return {
            rule: 'R6',
            field: 'securityPolicy',
            message: 'R6: Security configuration changes require tech-lead approval. Set techLeadApproved: true.',
        };
    }
    return null;
}
function checkR7(config, isMember) {
    if (isMember && config['profile'] === 'enterprise') {
        return {
            rule: 'R7',
            field: 'profile',
            message: 'R7: Enterprise profile is immutable by team members.',
        };
    }
    return null;
}
function validateConfigFile(configPath, options) {
    if (!fs.existsSync(configPath)) {
        return { valid: false, errors: [{ rule: 'FILE', field: 'configPath', message: `Config file not found: ${configPath}` }] };
    }
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    catch {
        return { valid: false, errors: [{ rule: 'PARSE', field: 'configPath', message: `Failed to parse config: ${configPath}` }] };
    }
    let globalConfig;
    if (options?.globalConfigPath && fs.existsSync(options.globalConfigPath)) {
        try {
            globalConfig = JSON.parse(fs.readFileSync(options.globalConfigPath, 'utf-8'));
        }
        catch { /* ignore */ }
    }
    return validate(config, { globalConfig, isMember: options?.isMember });
}
//# sourceMappingURL=config-validator.js.map
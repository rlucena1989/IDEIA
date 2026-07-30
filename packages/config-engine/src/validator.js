"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidator = void 0;
const logger_1 = require("@ideia/logger");
const security_rules_1 = require("./security-rules");
const logger = (0, logger_1.createLogger)('validator');
function getNestedValue(obj, dottedPath) {
    const parts = dottedPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || typeof current !== 'object')
            return undefined;
        current = current[part];
    }
    return current;
}
function validateField(field, value, errors) {
    if (field.required && (value === undefined || value === null)) {
        errors.push({
            field: field.path,
            message: field.description || `Required field '${field.path}' is missing`,
            code: 'REQUIRED_FIELD_MISSING',
            severity: 'error',
        });
        return;
    }
    if (value === undefined || value === null)
        return;
    if (field.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== field.type) {
            errors.push({
                field: field.path,
                message: `Expected type '${field.type}', got '${actualType}'`,
                code: 'TYPE_MISMATCH',
                severity: 'error',
            });
            return;
        }
    }
    if (field.minValue !== undefined && typeof value === 'number' && value < field.minValue) {
        errors.push({
            field: field.path,
            message: `Value ${value} is less than minimum ${field.minValue}`,
            code: 'VALUE_TOO_LOW',
            severity: 'error',
        });
    }
    if (field.maxValue !== undefined && typeof value === 'number' && value > field.maxValue) {
        errors.push({
            field: field.path,
            message: `Value ${value} exceeds maximum ${field.maxValue}`,
            code: 'VALUE_TOO_HIGH',
            severity: 'error',
        });
    }
    if (field.minLength !== undefined && typeof value === 'string' && value.length < field.minLength) {
        errors.push({
            field: field.path,
            message: `String length ${value.length} is less than minimum ${field.minLength}`,
            code: 'STRING_TOO_SHORT',
            severity: 'error',
        });
    }
    if (field.maxLength !== undefined && typeof value === 'string' && value.length > field.maxLength) {
        errors.push({
            field: field.path,
            message: `String length ${value.length} exceeds maximum ${field.maxLength}`,
            code: 'STRING_TOO_LONG',
            severity: 'error',
        });
    }
    if (field.allowedValues !== undefined && !field.allowedValues.includes(value)) {
        errors.push({
            field: field.path,
            message: `Value ${JSON.stringify(value)} is not in allowed values ${JSON.stringify(field.allowedValues)}`,
            code: 'VALUE_NOT_ALLOWED',
            severity: 'error',
        });
    }
    if (field.pattern !== undefined && typeof value === 'string' && !field.pattern.test(value)) {
        errors.push({
            field: field.path,
            message: `Value '${value}' does not match pattern ${field.pattern}`,
            code: 'PATTERN_MISMATCH',
            severity: 'error',
        });
    }
}
class ConfigValidator {
    schema;
    constructor(schema = []) {
        this.schema = schema;
    }
    validate(config) {
        const errors = [];
        const warnings = [];
        for (const field of this.schema) {
            const value = getNestedValue(config, field.path);
            validateField(field, value, errors);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    validateSection(section, config) {
        const errors = [];
        const warnings = [];
        for (const field of this.schema) {
            if (!field.path.startsWith(section + '.') && field.path !== section)
                continue;
            const value = getNestedValue(config, field.path);
            validateField(field, value, errors);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    validateSecurityCompliance(config) {
        const securityRules = new security_rules_1.SecurityRules();
        const checkResult = securityRules.evaluateAll(config);
        const errors = [];
        const warnings = [];
        for (const rule of checkResult.rules) {
            if (!rule.passed) {
                errors.push({
                    field: `security.${rule.rule}`,
                    message: rule.message ?? rule.description,
                    code: `SEC_${rule.rule}`,
                    severity: 'error',
                });
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    validateAll(config) {
        const schema = this.validate(config);
        const security = this.validateSecurityCompliance(config);
        return {
            schema,
            security,
            combined: {
                valid: schema.valid && security.valid,
                errors: [...schema.errors, ...security.errors],
                warnings: [...schema.warnings, ...security.warnings],
            },
        };
    }
    getValidationSummary(results) {
        const categories = {
            schema: { errors: results.schema.errors.length, warnings: results.schema.warnings.length },
            security: { errors: results.security.errors.length, warnings: results.security.warnings.length },
        };
        return {
            totalErrors: results.combined.errors.length,
            totalWarnings: results.combined.warnings.length,
            categories,
        };
    }
}
exports.ConfigValidator = ConfigValidator;
//# sourceMappingURL=validator.js.map
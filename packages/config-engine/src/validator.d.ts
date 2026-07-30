import type { FullConfig, ValidationResult, SchemaField } from './types';
export declare class ConfigValidator {
    private schema;
    constructor(schema?: SchemaField[]);
    validate(config: FullConfig): ValidationResult;
    validateSection(section: string, config: unknown): ValidationResult;
    validateSecurityCompliance(config: FullConfig): ValidationResult;
    validateAll(config: FullConfig): {
        schema: ValidationResult;
        security: ValidationResult;
        combined: ValidationResult;
    };
    getValidationSummary(results: {
        schema: ValidationResult;
        security: ValidationResult;
        combined: ValidationResult;
    }): {
        totalErrors: number;
        totalWarnings: number;
        categories: Record<string, {
            errors: number;
            warnings: number;
        }>;
    };
}
//# sourceMappingURL=validator.d.ts.map
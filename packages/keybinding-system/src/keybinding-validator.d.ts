export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    code: string;
    message: string;
}
export interface ValidationWarning {
    code: string;
    message: string;
}
export declare class KeybindingValidator {
    validate(keybinding: string): ValidationResult;
    findConflicts(keybinding: string, existing: string[]): string[];
    isReserved(keybinding: string): boolean;
    private doConflict;
}
//# sourceMappingURL=keybinding-validator.d.ts.map
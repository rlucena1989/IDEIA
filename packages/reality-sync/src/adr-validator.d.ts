export interface ADRValidationResult {
    file: string;
    number: number;
    valid: boolean;
    missingSections: string[];
    errors: string[];
    warnings: string[];
}
export declare const REQUIRED_SECTIONS: string[];
export declare const SECTION_PATTERNS: {
    Status: RegExp;
    Date: RegExp;
    Context: RegExp;
    Decision: RegExp;
    Consequences: RegExp;
};
export declare class ADRValidator {
    private docsAdrDir;
    constructor(docsAdrDir?: string);
    validateAll(): ADRValidationResult[];
    validateOne(filename: string): ADRValidationResult;
    getStatusSummary(): {
        total: number;
        valid: number;
        invalid: number;
        warnings: number;
    };
}
export declare function createADRValidator(docsAdrDir?: string): ADRValidator;
//# sourceMappingURL=adr-validator.d.ts.map
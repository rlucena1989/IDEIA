export interface ADRInput {
    title: string;
    context: string;
    decision: string;
    consequences: string;
    status?: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
}
export interface ADRResult {
    number: number;
    title: string;
    filePath: string;
    fullPath: string;
}
export declare class ADRGenerator {
    private docsAdrDir;
    constructor(docsAdrDir?: string);
    private ensureDir;
    private getNextNumber;
    private sanitizeTitle;
    generateADR(input: ADRInput): ADRResult;
    listADRs(): ADRResult[];
    getADR(number: number): string | null;
    getADRTemplates(): string[];
    generateFromTemplate(templateName: string, variables: Record<string, string>): ADRResult;
    validateADR(number: number): {
        valid: boolean;
        missingSections: string[];
        errors: string[];
    };
    validateAllADRs(): Array<{
        number: number;
        title: string;
        valid: boolean;
        errors: string[];
    }>;
}
export declare function createADRGenerator(docsAdrDir?: string): ADRGenerator;
//# sourceMappingURL=adr-generator.d.ts.map
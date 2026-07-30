export interface AutoStudyInput {
    title: string;
    topic: string;
    technologies: string[];
}
export interface AutoStudyDraft {
    title: string;
    topic: string;
    technologies: string[];
    summary: string;
    sections: StudySection[];
    viabilityScore: number;
    generatedAt: string;
}
export interface StudySection {
    title: string;
    content: string;
}
export interface ViabilityScore {
    technology: string;
    overall: number;
    dimensions: {
        value: number;
        differentiation: number;
        synergy: number;
        costBenefit: number;
        maturity: number;
    };
    recommendation: 'FAZER' | 'AGENDAR' | 'INVESTIGAR' | 'NAO_FAZER';
}
export declare class AutoStudyGenerator {
    private workspaceRoot;
    private estudosDir;
    constructor(workspaceRoot: string);
    generateStudy(title: string, topic: string, technologies: string[]): Promise<AutoStudyDraft>;
    researchTechnology(name: string): Promise<ViabilityScore | null>;
    createStudyDocument(study: AutoStudyDraft): Promise<string>;
    estimateViability(technology: string): ViabilityScore;
    private getOverallRecommendation;
    private generateTechAnalysis;
    private generateViabilityMatrix;
    private generateRiskSection;
    private generateRecommendation;
}
export declare function createAutoStudyGenerator(workspaceRoot: string): AutoStudyGenerator;
//# sourceMappingURL=auto-study.d.ts.map
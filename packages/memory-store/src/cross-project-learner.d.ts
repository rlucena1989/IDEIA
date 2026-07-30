export interface ProjectProfile {
    projectPath: string;
    language: string;
    frameworks: string[];
    directoryStructure: string[];
    conventions: string[];
    decisions: ProjectDecision[];
    detectedAt: string;
}
export interface ProjectDecision {
    title: string;
    context: string;
    decision: string;
    rationale: string;
    timestamp: string;
}
export interface CrossProjectInsight {
    pattern: string;
    frequency: number;
    projects: string[];
    confidence: number;
    recommendation?: string;
    category?: 'framework' | 'structure' | 'convention' | 'decision';
}
export interface CrossProjectRecommendation {
    context: string;
    suggestedPatterns: Array<{
        pattern: string;
        confidence: number;
        projects: string[];
    }>;
    source: string;
}
export declare class CrossProjectLearner {
    private profiles;
    private persistencePath?;
    constructor(persistencePath?: string);
    learn(projectName: string, patterns: string[], decisions: ProjectDecision[]): void;
    getCrossProjectInsights(): CrossProjectInsight[];
    getRecommendation(context: string): CrossProjectRecommendation;
    getProjectSimilarity(projectA: string, projectB: string): number;
    getProfileCount(): number;
    listProjectNames(): string[];
    private detectLanguage;
    private isFramework;
    private load;
    private save;
}
export declare function createCrossProjectLearner(persistencePath?: string): CrossProjectLearner;
//# sourceMappingURL=cross-project-learner.d.ts.map
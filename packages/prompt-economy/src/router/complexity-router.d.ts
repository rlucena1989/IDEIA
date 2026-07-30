import { ComplexityLevel, ComplexityClassification, PipelineConfig, TaskType } from '../types';
export interface ComplexityCriteria {
    fileCount: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    estimatedSteps: number;
    requiresHistoricalContext: boolean;
    environmentSensitivity: 'dev' | 'staging' | 'production';
    dependencies: number;
}
export declare class ComplexityRouter {
    private levelOverrides;
    classify(criteria: ComplexityCriteria): ComplexityClassification;
    getPipeline(level: ComplexityLevel): PipelineConfig;
    setLevelOverride(taskType: TaskType, level: ComplexityLevel): void;
    removeLevelOverride(taskType: TaskType): void;
    getAllPipelineConfigs(): Record<ComplexityLevel, PipelineConfig>;
    private calculateConfidence;
}
//# sourceMappingURL=complexity-router.d.ts.map
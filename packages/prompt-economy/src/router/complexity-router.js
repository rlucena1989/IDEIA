"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexityRouter = void 0;
const PIPELINE_CONFIGS = {
    N0: {
        requirePlan: false,
        requireVerification: false,
        requireApproval: false,
        parallelAgents: false,
        maxSteps: 1,
        tokenBudget: 500,
        stages: ['classify', 'respond'],
    },
    N1: {
        requirePlan: true,
        requireVerification: false,
        requireApproval: false,
        parallelAgents: false,
        maxSteps: 3,
        tokenBudget: 2000,
        stages: ['classify', 'plan', 'execute'],
    },
    N2: {
        requirePlan: true,
        requireVerification: true,
        requireApproval: false,
        parallelAgents: false,
        maxSteps: 5,
        tokenBudget: 4000,
        stages: ['classify', 'plan', 'execute', 'verify', 'deliver'],
    },
    N3: {
        requirePlan: true,
        requireVerification: true,
        requireApproval: false,
        parallelAgents: false,
        maxSteps: 10,
        tokenBudget: 8000,
        stages: ['classify', 'plan', 'execute', 'verify', 'repair', 'deliver'],
    },
    N4: {
        requirePlan: true,
        requireVerification: true,
        requireApproval: false,
        parallelAgents: true,
        maxSteps: 15,
        tokenBudget: 15000,
        stages: ['classify', 'plan', 'execute_parallel', 'verify', 'repair', 'merge', 'deliver'],
    },
    N5: {
        requirePlan: true,
        requireVerification: true,
        requireApproval: true,
        parallelAgents: true,
        maxSteps: 20,
        tokenBudget: 25000,
        stages: ['classify', 'plan', 'approve', 'execute_parallel', 'verify', 'repair', 'merge', 'deliver'],
    },
};
class ComplexityRouter {
    levelOverrides = new Map();
    classify(criteria) {
        const reasons = [];
        let level = 'N0';
        if (criteria.fileCount >= 20 || criteria.estimatedSteps >= 15) {
            level = 'N5';
            reasons.push('Muitos arquivos/passos');
        }
        else if (criteria.riskLevel === 'critical' || criteria.environmentSensitivity === 'production') {
            level = 'N5';
            reasons.push('Risk critical ou produção');
        }
        else if (criteria.fileCount >= 10 || criteria.estimatedSteps >= 10) {
            level = 'N4';
            reasons.push('Multi-arquivo com múltiplos passos');
        }
        else if (criteria.riskLevel === 'high') {
            level = 'N4';
            reasons.push('Alto risco');
        }
        else if (criteria.fileCount >= 5 || criteria.estimatedSteps >= 6) {
            level = 'N3';
            reasons.push('Diversos arquivos ou passos');
        }
        else if (criteria.requiresHistoricalContext) {
            level = 'N3';
            reasons.push('Requer contexto histórico');
        }
        else if (criteria.fileCount >= 3 || criteria.estimatedSteps >= 3) {
            level = 'N2';
            reasons.push('Moderado');
        }
        else if (criteria.fileCount >= 1 || criteria.estimatedSteps >= 1) {
            level = 'N1';
            reasons.push('Tarefa simples');
        }
        const confidence = this.calculateConfidence(criteria, reasons);
        return {
            level,
            reasons,
            confidence,
            estimatedTokens: PIPELINE_CONFIGS[level].tokenBudget,
        };
    }
    getPipeline(level) {
        return { ...PIPELINE_CONFIGS[level] };
    }
    setLevelOverride(taskType, level) {
        this.levelOverrides.set(taskType, level);
    }
    removeLevelOverride(taskType) {
        this.levelOverrides.delete(taskType);
    }
    getAllPipelineConfigs() {
        return { ...PIPELINE_CONFIGS };
    }
    calculateConfidence(criteria, reasons) {
        let confidence = 0.85;
        if (reasons.length === 0)
            confidence -= 0.2;
        if (criteria.riskLevel === 'low')
            confidence += 0.05;
        if (criteria.riskLevel === 'critical')
            confidence -= 0.1;
        if (criteria.environmentSensitivity === 'production')
            confidence -= 0.05;
        if (criteria.dependencies > 5)
            confidence -= 0.1;
        return Math.max(0, Math.min(1, confidence));
    }
}
exports.ComplexityRouter = ComplexityRouter;
//# sourceMappingURL=complexity-router.js.map
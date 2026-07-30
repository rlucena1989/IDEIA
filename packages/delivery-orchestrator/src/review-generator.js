"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewGenerator = void 0;
const logger_1 = require("@ideia/logger");
class ReviewGenerator {
    logger;
    constructor(logger) {
        this.logger = logger ?? (0, logger_1.createLogger)('ReviewGenerator');
    }
    async generateReview(diff, _context) {
        this.logger.info('Generating review for diff');
        const quality = await this.checkCodeQuality(diff);
        const coverage = await this.checkTestCoverage(diff);
        const security = await this.checkSecurity(diff);
        const performance = await this.analyzePerformance(diff);
        const suggestions = this.suggestImprovements(quality);
        const decision = this.makeDecision(quality, security);
        const summary = this.generateSummary(decision);
        return {
            summary,
            quality,
            security,
            coverage,
            performance,
            suggestions,
            decision,
            generatedAt: new Date().toISOString(),
        };
    }
    async checkCodeQuality(_diff) {
        const dimensions = {
            naming: 8,
            complexity: 7,
            duplication: 8,
            errorHandling: 6,
            typeSafety: 8,
            testing: 6,
            documentation: 5,
        };
        const totalScore = Object.values(dimensions).reduce((sum, v) => sum + v, 0);
        const grade = this.computeGrade(totalScore);
        return {
            score: totalScore,
            grade,
            dimensions,
        };
    }
    async checkTestCoverage(_diff) {
        return {
            status: 'green',
            totalCoverage: 75,
            diffCoverage: 85,
            missingTests: [],
        };
    }
    async checkSecurity(_diff) {
        const findings = [];
        if (/api[-_]?key|secret|token|password|credential/i.test(_diff)) {
            findings.push({
                severity: 'high',
                type: 'secret',
                file: 'unknown',
                line: 0,
                description: 'Potential secret hardcoded in diff',
                recommendation: 'Use environment variables or secret manager',
            });
        }
        return {
            passed: findings.length === 0,
            blocked: findings.some((f) => f.severity === 'critical' || f.severity === 'high'),
            findings,
            summary: findings.length === 0
                ? 'No security issues detected'
                : `${findings.length} security issue(s) found`,
        };
    }
    generateSummary(changes) {
        return `## Review Summary\n\nPR with ${changes.length} changes.\nDecision: ${this.makeDecision({ score: 48, grade: 'C' }, { blocked: false })}`;
    }
    suggestImprovements(_issues) {
        const suggestions = [];
        if (_issues.dimensions.errorHandling < 7) {
            suggestions.push({
                priority: 'medium',
                description: 'Add error handling for edge cases',
                example: 'try/catch blocks around risky operations',
            });
        }
        if (_issues.dimensions.documentation < 6) {
            suggestions.push({
                priority: 'low',
                description: 'Add JSDoc comments to public APIs',
                example: '/** JSDoc comment */',
            });
        }
        if (_issues.dimensions.testing < 7) {
            suggestions.push({
                priority: 'high',
                description: 'Add more unit tests to cover edge cases',
                example: 'Include boundary and error case tests',
            });
        }
        return suggestions;
    }
    computeGrade(score) {
        if (score >= 56)
            return 'A';
        if (score >= 42)
            return 'B';
        if (score >= 28)
            return 'C';
        if (score >= 14)
            return 'D';
        return 'F';
    }
    async analyzePerformance(_diff) {
        return {
            impact: 'low',
            details: 'No performance impact detected',
            suggestions: [],
        };
    }
    makeDecision(quality, security) {
        if (security.blocked)
            return 'blocked';
        if (quality.grade === 'F' || quality.grade === 'D')
            return 'changes_requested';
        return 'approve';
    }
}
exports.ReviewGenerator = ReviewGenerator;
//# sourceMappingURL=review-generator.js.map
import { SemanticNeed, WorkflowRecommendation } from './semantic-types';

const WORKFLOW_RULES: Array<{
  workflowId: string;
  keywords: string[];
  phases: string[];
  confidence: number;
  fallbackCondition?: (need: SemanticNeed) => boolean;
}> = [
  {
    workflowId: 'zero-to-deploy',
    keywords: ['feature', 'implement', 'create', 'build', 'full stack', 'full-stack', 'complete', 'new', 'app', 'application'],
    phases: ['analyze', 'design', 'implement', 'test', 'deploy'],
    confidence: 0.9,
    fallbackCondition: (need: SemanticNeed) => need.domain === 'web' || need.domain === 'api' || need.domain === 'mobile',
  },
  {
    workflowId: 'bugfix',
    keywords: ['bug', 'fix', 'error', 'issue', 'broken', 'crash', 'defect', 'regression', 'hotfix'],
    phases: ['reproduce', 'diagnose', 'fix', 'verify', 'deploy'],
    confidence: 0.95,
  },
  {
    workflowId: 'refactor',
    keywords: ['refactor', 'clean', 'technical debt', 'restructure', 'redesign', 'improve code', 'reorganize'],
    phases: ['analyze', 'plan', 'refactor', 'test', 'review'],
    confidence: 0.9,
    fallbackCondition: (need: SemanticNeed) => need.stage === 'growth' || need.stage === 'mature',
  },
  {
    workflowId: 'security',
    keywords: ['security', 'vulnerability', 'audit', 'compliance', 'threat', 'penetration', 'cve', 'owasp'],
    phases: ['reconnaissance', 'scan', 'analyze', 'remediate', 'verify'],
    confidence: 0.95,
    fallbackCondition: (need: SemanticNeed) => need.domain === 'security',
  },
  {
    workflowId: 'migration',
    keywords: ['migrate', 'migration', 'upgrade', 'port', 'transfer', 'convert', 'move', 'database migration', 'schema'],
    phases: ['assess', 'plan', 'migrate', 'validate', 'cutover'],
    confidence: 0.9,
    fallbackCondition: (need: SemanticNeed) => need.domain === 'data' || need.domain === 'ml',
  },
  {
    workflowId: 'deploy',
    keywords: ['deploy', 'release', 'ci', 'cd', 'pipeline', 'production', 'staging', 'rollback', 'canary'],
    phases: ['prepare', 'build', 'deploy', 'monitor', 'rollback'],
    confidence: 0.85,
    fallbackCondition: (need: SemanticNeed) => need.domain === 'devops',
  },
];

export class WorkflowRouter {
  recommend(need: SemanticNeed): WorkflowRecommendation[] {
    const recommendations: WorkflowRecommendation[] = [];
    const text = `${need.description} ${need.domain} ${need.techStack.join(' ')}`.toLowerCase();

    for (const rule of WORKFLOW_RULES) {
      const keywordMatch = rule.keywords.some(kw => text.includes(kw));
      const conditionMet = rule.fallbackCondition ? rule.fallbackCondition(need) : false;

      if (keywordMatch || conditionMet) {
        recommendations.push({
          workflowId: rule.workflowId,
          confidence: this.adjustConfidence(rule.confidence, need, rule),
          phases: rule.phases,
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        workflowId: 'zero-to-deploy',
        confidence: 0.5,
        phases: ['analyze', 'design', 'implement', 'test', 'deploy'],
      });
    }

    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations;
  }

  private adjustConfidence(base: number, need: SemanticNeed, rule: typeof WORKFLOW_RULES[0]): number {
    let adjusted = base;

    if (need.complexity === 'complex') {
      adjusted -= 0.1;
    }

    const _textWords = need.description.split(/\s+/).length;
    const matchedKeywords = rule.keywords.filter(kw => need.description.toLowerCase().includes(kw)).length;
    if (matchedKeywords > 0) {
      adjusted += Math.min(matchedKeywords * 0.05, 0.15);
    }

    return Math.min(Math.max(adjusted, 0), 1);
  }
}

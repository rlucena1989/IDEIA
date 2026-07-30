import { SemanticNeed, ContextPackRecommendation } from './semantic-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('context-router');

const CONTEXT_RULES: Record<string, { packId: string; priority: number; keywords: string[]; condition?: (need: SemanticNeed) => boolean }> = {
  bugfix: {
    packId: 'bugfix',
    priority: 10,
    keywords: ['bug', 'fix', 'issue', 'error', 'broken', 'crash', 'exception', 'defect'],
  },
  feature: {
    packId: 'fullstack-feature',
    priority: 9,
    keywords: ['feature', 'implement', 'create', 'new', 'add', 'build', 'develop', 'functionality'],
  },
  refactor: {
    packId: 'refactor',
    priority: 8,
    keywords: ['refactor', 'clean', 'restructure', 'reorganize', 'redesign', 'improve', 'technical debt'],
  },
  documentation: {
    packId: 'documentation',
    priority: 7,
    keywords: ['document', 'docs', 'readme', 'wiki', 'api docs', 'comment', 'explain'],
  },
  security: {
    packId: 'security-review',
    priority: 9,
    keywords: ['security', 'vulnerability', 'audit', 'compliance', 'threat', 'penetration', 'cve'],
  },
  performance: {
    packId: 'performance',
    priority: 7,
    keywords: ['performance', 'optimize', 'slow', 'latency', 'throughput', 'bottleneck', 'profiling'],
  },
  migration: {
    packId: 'migration',
    priority: 8,
    keywords: ['migrate', 'migration', 'upgrade', 'port', 'transfer', 'convert', 'move'],
  },
  testing: {
    packId: 'testing',
    priority: 8,
    keywords: ['test', 'testing', 'coverage', 'spec', 'e2e', 'unit test', 'integration test', 'mock'],
  },
  deployment: {
    packId: 'deployment',
    priority: 7,
    keywords: ['deploy', 'ci', 'cd', 'pipeline', 'release', 'production', 'staging', 'rollback'],
  },
  onboarding: {
    packId: 'onboarding',
    priority: 5,
    keywords: ['onboard', 'new', 'start', 'beginner', 'setup', 'getting started', 'tutorial'],
    condition: (need: SemanticNeed) => need.stage === 'idea' || need.description.toLowerCase().includes('onboard'),
  },
};

const ALWAYS_INCLUDE = ['ideia-introduction'];

export class ContextPackRouter {
  recommend(need: SemanticNeed): ContextPackRecommendation[] {
    const recommendations: ContextPackRecommendation[] = [];
    const text = `${need.description} ${need.domain} ${need.techStack.join(' ')}`.toLowerCase();
    const matchedPacks = new Set<string>();

    for (const [, config] of Object.entries(CONTEXT_RULES)) {
      if (matchedPacks.has(config.packId)) continue;

      const keywordMatch = config.keywords.some(kw => text.includes(kw));
      const conditionMet = config.condition ? config.condition(need) : true;

      if (keywordMatch || conditionMet) {
        recommendations.push({
          packId: config.packId,
          priority: config.priority,
          reason: this.buildContextReason(config.packId, config.keywords, text),
        });
        matchedPacks.add(config.packId);
      }
    }

    const complexityLevel = need.complexity === 'complex' ? 3 : need.complexity === 'moderate' ? 2 : 1;
    if (complexityLevel >= 2 && !matchedPacks.has('ideia-core')) {
      recommendations.push({
        packId: 'ideia-core',
        priority: 4,
        reason: `Recommended for ${need.complexity} complexity projects`,
      });
    }

    for (const packId of ALWAYS_INCLUDE) {
      if (!matchedPacks.has(packId)) {
        recommendations.push({
          packId,
          priority: 1,
          reason: 'Always included for all projects',
        });
      }
    }

    recommendations.sort((a, b) => b.priority - a.priority);
    return recommendations;
  }

  private buildContextReason(packId: string, keywords: string[], text: string): string {
    const matched = keywords.filter(kw => text.includes(kw));
    if (matched.length > 0) {
      return `Matched context keywords: ${matched.slice(0, 4).join(', ')}`;
    }
    return `Recommended ${packId} pack based on project profile`;
  }
}

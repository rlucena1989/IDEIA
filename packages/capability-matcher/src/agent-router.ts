import { SemanticNeed, AgentRecommendation } from './semantic-types';

type AgentId = 'Analyst' | 'Architect' | 'Programmer' | 'Reviewer' | 'Tester' | 'DevOps';

interface AgentRule {
  agentId: AgentId;
  mode: string;
  keywords: string[];
  priority: number;
}

const AGENT_RULES: AgentRule[] = [
  { agentId: 'Analyst', mode: 'N1', keywords: ['idea', 'requirements', 'brainstorm', 'concept', 'planning', 'spec', 'analysis'], priority: 1 },
  { agentId: 'Architect', mode: 'N2', keywords: ['architecture', 'design', 'system', 'component', 'pattern', 'structure', 'diagram'], priority: 2 },
  { agentId: 'Programmer', mode: 'N3', keywords: ['implement', 'code', 'develop', 'build', 'create', 'feature', 'function', 'fix', 'bug'], priority: 3 },
  { agentId: 'Reviewer', mode: 'N2', keywords: ['review', 'quality', 'audit', 'lint', 'refactor', 'clean', 'best practice'], priority: 4 },
  { agentId: 'Tester', mode: 'N2', keywords: ['test', 'testing', 'coverage', 'spec', 'assert', 'mock', 'e2e', 'integration'], priority: 5 },
  { agentId: 'DevOps', mode: 'N2', keywords: ['deploy', 'ci', 'cd', 'pipeline', 'devops', 'infrastructure', 'docker', 'kubernetes', 'release'], priority: 6 },
];

const MULTI_AGENT_KEYWORDS = ['enterprise', 'distributed', 'multi-module', 'complex', 'full stack', 'full-stack', 'complete', 'end-to-end'];

export class AgentRouter {
  route(need: SemanticNeed): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];
    const text = `${need.description} ${need.techStack.join(' ')} ${need.domain}`.toLowerCase();
    const textWords = text.split(/[\s,;:.!?]+/).filter(Boolean);

    for (const rule of AGENT_RULES) {
      const matchedKeywords = rule.keywords.filter(kw => text.includes(kw));
      const keywordOverlap = textWords.filter(w => rule.keywords.includes(w)).length;

      if (matchedKeywords.length > 0 || this.isDomainMatch(need, rule)) {
        const confidence = this.calculateAgentConfidence(matchedKeywords.length, keywordOverlap, textWords.length);
        recommendations.push({
          agentId: rule.agentId,
          confidence,
          reason: this.buildAgentReason(rule.agentId, matchedKeywords),
          suggestedMode: rule.mode,
        });
      }
    }

    this.applyMultiAgentRules(recommendations, need);

    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations;
  }

  private isDomainMatch(need: SemanticNeed, rule: AgentRule): boolean {
    if (rule.agentId === 'DevOps' && (need.domain === 'devops' || need.techStack.some(t => ['docker', 'kubernetes', 'aws', 'gcp', 'azure'].includes(t)))) {
      return true;
    }
    if (rule.agentId === 'Reviewer' && need.description.toLowerCase().includes('review')) {
      return true;
    }
    return false;
  }

  private calculateAgentConfidence(matchedRules: number, keywordOverlap: number, totalWords: number): number {
    const ruleScore = Math.min(matchedRules / 3, 1);
    const overlapScore = totalWords > 0 ? Math.min(keywordOverlap / totalWords, 1) : 0;
    return Math.min(ruleScore * 0.6 + overlapScore * 0.4 + 0.1, 1);
  }

  private buildAgentReason(agentId: string, keywords: string[]): string {
    if (keywords.length === 0) {
      return `Recommended for ${agentId.toLowerCase()} tasks based on project profile`;
    }
    return `Matched keywords: ${keywords.join(', ')}`;
  }

  private applyMultiAgentRules(recommendations: AgentRecommendation[], need: SemanticNeed): void {
    const text = need.description.toLowerCase();
    const needsMultiAgent = MULTI_AGENT_KEYWORDS.some(kw => text.includes(kw)) ||
      need.complexity === 'complex' ||
      (need.domain === 'web' && need.techStack.length > 3);

    if (needsMultiAgent && !recommendations.some(r => r.agentId === 'Architect')) {
      recommendations.push({
        agentId: 'Architect',
        confidence: 0.7,
        reason: 'Multi-agent orchestration recommended for complex needs',
        suggestedMode: 'N2',
      });
    }

    if (needsMultiAgent && !recommendations.some(r => r.agentId === 'Reviewer')) {
      recommendations.push({
        agentId: 'Reviewer',
        confidence: 0.6,
        reason: 'Quality assurance recommended for complex needs',
        suggestedMode: 'N2',
      });
    }

    if (need.description.toLowerCase().includes('bug') || need.description.toLowerCase().includes('fix')) {
      if (!recommendations.some(r => r.agentId === 'Reviewer')) {
        recommendations.push({
          agentId: 'Reviewer',
          confidence: 0.7,
          reason: 'Code review paired with bug fix',
          suggestedMode: 'N1',
        });
      }
    }

    if (need.description.toLowerCase().includes('security')) {
      if (!recommendations.some(r => r.agentId === 'Reviewer')) {
        recommendations.push({
          agentId: 'Reviewer',
          confidence: 0.8,
          reason: 'Security review required',
          suggestedMode: 'N2',
        });
      }
      if (!recommendations.some(r => r.agentId === 'Analyst')) {
        recommendations.push({
          agentId: 'Analyst',
          confidence: 0.5,
          reason: 'Threat analysis recommended for security review',
          suggestedMode: 'N1',
        });
      }
    }
  }
}

import { SecurityIssue } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('scorer');

export interface PromptScore {
  overall: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categoryScores: Record<string, number>;
  matchedRuleCount: number;
  totalRuleCount: number;
  recommendations: string[];
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 10,
  high: 6,
  medium: 3,
  low: 1,
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  'api-key': 10,
  'github-token': 9,
  'private-key': 10,
  'aws-key': 9,
  'password': 8,
  'sql-injection': 9,
  'destructive-command': 10,
  'eval-usage': 9,
  'function-constructor': 9,
  'script-injection': 9,
  'jailbreak': 9,
  'instruction-override': 10,
  'prompt-leak': 10,
  'malware-generation': 10,
  'dangerous-content': 10,
  'privilege-escalation': 8,
  'remote-execution': 9,
  'hacking-tool': 10,
  'password-cracker': 10,
  'government-id': 10,
  'phi-data': 10,
  'policy-bypass': 10,
  'harmful-request': 8,
  'role-play': 6,
  'misinformation': 7,
  'base64_payload': 7,
  'hex_encoding': 6,
  'unicode_bypass': 7,
  'system_prompt_leak': 10,
  'many_shot': 5,
  'token_gradual': 5,
  'jailbreak_encoded': 9,
  'markdown_injection': 7,
  'xml_injection': 7,
  'json_injection': 6,
  'template_injection': 8,
  'indirect_injection': 8,
  'context_switching': 5,
  'authority_override': 7,
  'fact_confabulation': 6,
};

export class PromptScorer {
  private totalRuleCount: number;

  constructor(totalRuleCount = 31) {
    this.totalRuleCount = totalRuleCount;
  }

  score(issues: SecurityIssue[]): PromptScore {
    const categoryScores: Record<string, number> = {};
    let totalScore = 0;

    for (const issue of issues) {
      const severityWeight = SEVERITY_WEIGHTS[issue.severity] || 2;
      const categoryWeight = CATEGORY_WEIGHTS[issue.category] || 4;
      const score = severityWeight * categoryWeight;

      categoryScores[issue.category] = (categoryScores[issue.category] || 0) + score;
      totalScore += score;
    }

    const maxPossibleScore = Math.max(1, issues.length * 100);
    const normalizedScore = Math.min(100, (totalScore / maxPossibleScore) * 100);
    const overall = Math.round(Math.max(0, 100 - normalizedScore));

    const riskLevel = this.determineRiskLevel(overall, issues);
    const recommendations = this.buildRecommendations(categoryScores, riskLevel, issues);

    return {
      overall,
      riskLevel,
      categoryScores,
      matchedRuleCount: issues.length,
      totalRuleCount: this.totalRuleCount,
      recommendations,
    };
  }

  private determineRiskLevel(score: number, issues: SecurityIssue[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasHigh = issues.some(i => i.severity === 'high');

    if (hasCritical && score < 70) return 'critical';
    if (score >= 90) return 'low';
    if (score >= 75) return 'medium';
    if (score >= 55) return 'high';
    if (hasCritical) return 'critical';
    if (hasHigh && score < 70) return 'high';
    return 'medium';
  }

  private buildRecommendations(
    categoryScores: Record<string, number>,
    riskLevel: string,
    issues: SecurityIssue[],
  ): string[] {
    const recommendations: string[] = [];

    if (issues.length === 0) {
      recommendations.push('No security issues detected');
      return recommendations;
    }

    const sorted = Object.entries(categoryScores).sort(([, a], [, b]) => b - a);

    for (const [category, score] of sorted.slice(0, 5)) {
      if (score > 30) {
        recommendations.push(`Critical risk in "${category}": Immediate remediation required`);
      } else if (score > 15) {
        recommendations.push(`High risk in "${category}": Review and mitigate`);
      } else {
        recommendations.push(`Moderate risk in "${category}": Monitor and consider safeguards`);
      }
    }

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Overall risk level requires review before proceeding');
    }

    return recommendations;
  }
}

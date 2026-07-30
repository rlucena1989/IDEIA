import { SecurityRule } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('additional-rules');

export const ADDITIONAL_SECURITY_RULES: SecurityRule[] = [
  { pattern: /(?:sudo\s+|su\s+|doas\s+)/g, action: 'warn', severity: 'high', category: 'privilege-escalation', description: 'Privilege escalation command detected' },
  { pattern: /(?:chmod\s+777|chown\s+root)/g, action: 'warn', severity: 'high', category: 'permission-change', description: 'Dangerous permission change' },
  { pattern: /(?:wget\s+|curl\s+.*\s*\|\s*sh|curl.*bash)/g, action: 'block', severity: 'critical', category: 'remote-execution', description: 'Remote script execution detected' },
  { pattern: /(?:git\s+clone.*\.git|git\s+pull\s+origin)/g, action: 'warn', severity: 'medium', category: 'git-operation', description: 'Git operation in prompt' },
  { pattern: /(?:docker\s+run|docker\s+exec|kubectl\s+apply)/g, action: 'warn', severity: 'high', category: 'container-operation', description: 'Container operation detected' },
  { pattern: /(?:systemctl\s+|service\s+|init\.d)/g, action: 'warn', severity: 'high', category: 'service-control', description: 'Service control command' },
  { pattern: /(?:\/dev\/|\/proc\/|\/sys\/)/g, action: 'warn', severity: 'medium', category: 'system-path', description: 'System path access' },
  { pattern: /(?:ssh\s+|scp\s+|sftp\s+)/g, action: 'warn', severity: 'high', category: 'remote-access', description: 'Remote access command' },
  { pattern: /(?:nc\s+|netcat|telnet)/g, action: 'block', severity: 'critical', category: 'network-tool', description: 'Network reconnaissance tool' },
  { pattern: /(?:nmap\s+|masscan|zmap)/g, action: 'block', severity: 'critical', category: 'port-scanner', description: 'Port scanning tool' },
  { pattern: /(?:sqlmap|metasploit|burpsuite)/gi, action: 'block', severity: 'critical', category: 'hacking-tool', description: 'Hacking tool mentioned' },
  { pattern: /(?:crack|hashcat|john\s+the\s+ripper)/gi, action: 'block', severity: 'critical', category: 'password-cracker', description: 'Password cracking tool' },
  { pattern: /(?:bitcoin|ethereum|crypto|wallet|private\s+key)/gi, action: 'warn', severity: 'medium', category: 'cryptocurrency', description: 'Cryptocurrency-related content' },
  { pattern: /(?:dark\s+web|tor\s+browser|onion\s+site)/gi, action: 'warn', severity: 'medium', category: 'dark-web', description: 'Dark web reference' },
  { pattern: /(?:social\s+security|ssn|tax\s+id)/gi, action: 'block', severity: 'critical', category: 'government-id', description: 'Government ID reference' },
  { pattern: /(?:medical\s+record|health\s+data|patient\s+info)/gi, action: 'block', severity: 'critical', category: 'phi-data', description: 'Protected health information' },

  // === New rules (16) to reach 31 total ===
  { pattern: /(?:encode|convert|transform)\s+(?:as|into|to)\s+(?:base64|b64)/gi, action: 'warn', severity: 'high', category: 'jailbreak_encoded', description: 'Encoded jailbreak attempt via base64' },
  { pattern: /(?:you\s+are\s+(?:now|going\s+to\s+act))\s+as\s+/i, action: 'warn', severity: 'high', category: 'role_play', description: 'Role-play request to act as another entity' },
  { pattern: /(?:print|show|display|output|leak|expose|dump)\s+(?:the\s+)?(?:system|initial|original|full)\s+(?:prompt|instructions|message|directive)/i, action: 'block', severity: 'critical', category: 'system_prompt_leak', description: 'Attempt to leak system prompt' },
  { pattern: /(?:step\s+by\s+step|gradually|incrementally|one\s+by\s+one)\s+(?:reveal|expose|tell|show|bypass)/i, action: 'warn', severity: 'medium', category: 'token_gradual', description: 'Gradual token-by-token bypass attempt' },
  { pattern: /(?:repeat|reiterate|echo|mirror)\s+(?:back|the\s+above|the\s+following|the\s+previous)\s+(?:\d+|many|all|each)/i, action: 'warn', severity: 'medium', category: 'many_shot', description: 'Many-shot query pattern detected' },
  { pattern: /(?:[A-Za-z0-9+/]{40,}={0,2})/g, action: 'warn', severity: 'high', category: 'base64_payload', description: 'Base64 encoded payload detected' },
  { pattern: /(?:\\x[0-9a-fA-F]{2}){4,}/g, action: 'warn', severity: 'medium', category: 'hex_encoding', description: 'Hex encoded content detected' },
  { pattern: /(?:\\u[0-9a-fA-F]{4}){3,}/g, action: 'warn', severity: 'medium', category: 'unicode_bypass', description: 'Unicode encoded bypass attempt' },
  { pattern: /(?:```markdown\s*\n[\s\S]*?\n```)/gi, action: 'warn', severity: 'high', category: 'markdown_injection', description: 'Markdown injection via code block' },
  { pattern: /(?:<!\[CDATA\[[\s\S]*?\]\]>|<svg[\s\S]*?onload=)/gi, action: 'warn', severity: 'high', category: 'xml_injection', description: 'XML injection with CDATA or SVG event' },
  { pattern: /(?:```json\s*\n[\s\S]*?\n```)/gi, action: 'warn', severity: 'high', category: 'json_injection', description: 'JSON injection in code block bypass' },
  { pattern: /(?:{{[^{}]*}}|{{.*?}})/g, action: 'warn', severity: 'high', category: 'template_injection', description: 'Template injection pattern detected' },
  { pattern: /(?:ignore\s+(?:all\s+)?(?:above|below|context|instructions)|refer\s+to\s+(?:previous|prior)\s+(?:messages|context))/i, action: 'warn', severity: 'high', category: 'indirect_injection', description: 'Indirect prompt injection via context reference' },
  { pattern: /(?:now\s+(?:switch|change|shift|move)\s+(?:to|into)\s+(?:a\s+)?(?:different|new|another)\s+(?:role|persona|character|mode))/i, action: 'warn', severity: 'medium', category: 'context_switching', description: 'Context switching attempt to bypass restrictions' },
  { pattern: /(?:i\s+(?:am|have)\s+(?:the\s+)?(?:authority|permission|right|clearance|approval)\s+(?:to|for|from))/i, action: 'warn', severity: 'high', category: 'authority_override', description: 'Authority override claim detected' },
  { pattern: /(?:make\s+up|fabricate|invent|hallucinate|create\s+false|imagine\s+that)\s+(?:data|facts|evidence|citations|references|research)/i, action: 'warn', severity: 'high', category: 'fact_confabulation', description: 'Request to fabricate or confabulate facts' },
];

export interface SecurityScore {
  overall: number;
  categoryScores: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class SecurityScorer {
  private severityWeights: Record<string, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };

  private categoryWeights: Record<string, number> = {
    'api-key': 10,
    'private-key': 10,
    'password': 8,
    'sql-injection': 9,
    'xss-innerhtml': 8,
    'eval-usage': 9,
    'malware-generation': 10,
    'jailbreak': 9,
    'privilege-escalation': 7,
    'remote-execution': 9,
    'hacking-tool': 10,
    'password-cracker': 10,
    'government-id': 10,
    'phi-data': 10,
  };

  calculateScore(issues: Array<{ severity: string; category: string }>): SecurityScore {
    const categoryScores: Record<string, number> = {};
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const issue of issues) {
      const severityWeight = this.severityWeights[issue.severity] || 1;
      const categoryWeight = this.categoryWeights[issue.category] || 3;
      const score = severityWeight * categoryWeight;
      
      categoryScores[issue.category] = (categoryScores[issue.category] || 0) + score;
      totalScore += score;
      maxPossibleScore += 10 * 10;
    }

    const overall = maxPossibleScore > 0 ? Math.max(0, 100 - (totalScore / maxPossibleScore) * 100) : 100;
    
    const riskLevel = this.determineRiskLevel(overall);
    const recommendations = this.generateRecommendations(categoryScores);

    return {
      overall: Math.round(overall),
      categoryScores,
      riskLevel,
      recommendations,
    };
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  private generateRecommendations(categoryScores: Record<string, number>): string[] {
    const recommendations: string[] = [];
    const sortedCategories = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    for (const [category, score] of sortedCategories) {
      if (score > 20) {
        recommendations.push(`High risk in ${category}: Review and mitigate immediately`);
      } else if (score > 10) {
        recommendations.push(`Medium risk in ${category}: Consider additional safeguards`);
      } else {
        recommendations.push(`Low risk in ${category}: Monitor for changes`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('No significant security issues detected');
    }

    return recommendations;
  }
}

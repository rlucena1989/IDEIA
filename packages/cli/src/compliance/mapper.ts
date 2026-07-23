import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { getFramework, listFrameworks, FrameworkRequirement } from './frameworks';

/** Interface que define a estrutura de rule entry. */
export interface RuleEntry {
  text: string;
  source: string;
}

/** Interface que define a estrutura de compliance mapping. */
export interface ComplianceMapping {
  framework: string;
  frameworkName: string;
  matched: number;
  total: number;
  matches: Array<{ requirement: string; rule: string }>;
  gaps: string[];
  score: number;
}

/** Interface que define a estrutura de compliance report. */
export interface ComplianceReport {
  generatedAt: string;
  mappings: ComplianceMapping[];
  overallScore: number;
}

function loadRules(root: string): RuleEntry[] {
  const rules: RuleEntry[] = [];

  const lawsPath = path.join(root, '.ai/laws.yaml');
  if (fs.existsSync(lawsPath)) {
    try {
      const data = YAML.parse(fs.readFileSync(lawsPath, 'utf8'));
      const rawRules: string[] = data?.rules || [];
      for (const r of rawRules) {
        rules.push({ text: r, source: '.ai/laws.yaml' });
      }
    } catch { }
  }

  for (const policyDir of ['.ai/policies', '.ai/security', '.ai/quality']) {
    const fullDir = path.join(root, policyDir);
    if (!fs.existsSync(fullDir)) continue;
    for (const entry of fs.readdirSync(fullDir)) {
      if (!entry.endsWith('.md') && !entry.endsWith('.yaml')) continue;
      const content = fs.readFileSync(path.join(fullDir, entry), 'utf8');
      const lines = content.split('\n').filter(l => l.trim().startsWith('- '));
      for (const line of lines) {
        rules.push({ text: line.trim().replace(/^- /, ''), source: `${policyDir}/${entry}` });
      }
    }
  }

  return rules;
}

function matchRuleToRequirements(rule: string, requirements: FrameworkRequirement[]): string[] {
  const lower = rule.toLowerCase();
  return requirements
    .filter(req => req.keywords.some(kw => lower.includes(kw.toLowerCase())))
    .map(req => req.id);
}

/**
 * Mapeia rules to framework.
 * @param root - Valor root.
 * @param frameworkId - Valor id.
 * @returns O resultado da operação.
 */
export function mapRulesToFramework(root: string, frameworkId: string): ComplianceMapping {
  const framework = getFramework(frameworkId);
  if (!framework) {
    return { framework: frameworkId, frameworkName: frameworkId, matched: 0, total: 0, matches: [], gaps: ['Framework nao encontrado'], score: 0 };
  }

  const rules = loadRules(root);
  const matched: Array<{ requirement: string; rule: string }> = [];
  const matchedReqs = new Set<string>();

  for (const rule of rules) {
    const matchedReqIds = matchRuleToRequirements(rule.text, framework.requirements);
    for (const reqId of matchedReqIds) {
      matched.push({ requirement: reqId, rule: rule.text });
      matchedReqs.add(reqId);
    }
  }

  const gaps = framework.requirements
    .filter(req => !matchedReqs.has(req.id))
    .map(req => `${req.id} — ${req.title}`);

  const score = framework.requirements.length > 0
    ? Math.round((matchedReqs.size / framework.requirements.length) * 100)
    : 0;

  return {
    framework: frameworkId,
    frameworkName: framework.name,
    matched: matchedReqs.size,
    total: framework.requirements.length,
    matches: matched,
    gaps,
    score
  };
}

/**
 * Gera report.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function generateReport(root: string): ComplianceReport {
  const frameworkIds = listFrameworks();
  const mappings = frameworkIds.map(id => mapRulesToFramework(root, id));
  const overallScore = mappings.length > 0
    ? Math.round(mappings.reduce((sum, m) => sum + m.score, 0) / mappings.length)
    : 0;

  const report: ComplianceReport = {
    generatedAt: new Date().toISOString(),
    mappings,
    overallScore
  };

  const reportDir = path.join(root, '.ai/reports/compliance');
  fs.mkdirSync(reportDir, { recursive: true });

  for (const m of mappings) {
    fs.writeFileSync(path.join(reportDir, `${m.framework}.json`), JSON.stringify(m, null, 2));
  }

  return report;
}

import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

/** Interface que define a estrutura de baseline entry. */
export interface BaselineEntry {
  file: string;
  rules: SecurityRule[];
}

/** Interface que define a estrutura de security rule. */
export interface SecurityRule {
  id?: string;
  text: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const GOVERNANCE_FILES = ['.ai/laws.yaml', '.ai/policies/command-policy.md', '.ai/policies/ai-generated-code-policy.md'];
const BASELINE_FILE = '.ai/security/baseline.json';

function extractRulesFromLaws(root: string): SecurityRule[] {
  const lawsPath = path.join(root, '.ai/laws.yaml');
  if (!fs.existsSync(lawsPath)) return [];

  try {
    const data = YAML.parse(fs.readFileSync(lawsPath, 'utf8'));
    const rules: string[] = data?.rules || [];
    return rules.map((text: string) => ({ text, severity: 'high' as const }));
  } catch {
    return [];
  }
}

function extractRulesFromPolicy(filePath: string): SecurityRule[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim().startsWith('- '));
  return lines.map(l => ({ text: l.trim().replace(/^- /, ''), severity: 'medium' as const }));
}

/**
 * Processa severity.
 * @param text - Valor text.
 * @returns O resultado da operação.
 */
export function classifySeverity(text: string): 'critical' | 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase();
  if (lower.includes('senha') || lower.includes('credential') || lower.includes('secret') || lower.includes('password')) return 'critical';
  if (lower.includes('seguranca') || lower.includes('security') || lower.includes('block') || lower.includes('proibido')) return 'high';
  if (lower.includes('valid') || lower.includes('test') || lower.includes('cobertura') || lower.includes('coverage')) return 'medium';
  return 'low';
}

/**
 * Cria baseline.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function createBaseline(root: string): BaselineEntry[] {
  const entries: BaselineEntry[] = [];

  for (const relFile of GOVERNANCE_FILES) {
    const fullPath = path.join(root, relFile);
    if (!fs.existsSync(fullPath)) continue;

    let rules: SecurityRule[] = [];
    if (relFile.endsWith('.yaml')) {
      rules = extractRulesFromLaws(root);
    } else if (relFile.endsWith('.md')) {
      rules = extractRulesFromPolicy(fullPath);
    }

    rules = rules.map(r => ({ ...r, severity: classifySeverity(r.text) }));

    if (rules.length > 0) {
      entries.push({ file: relFile, rules });
    }
  }

  const baselineDir = path.dirname(path.join(root, BASELINE_FILE));
  fs.mkdirSync(baselineDir, { recursive: true });
  fs.writeFileSync(path.join(root, BASELINE_FILE), JSON.stringify(entries, null, 2));

  return entries;
}

/**
 * Carrega baseline.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function loadBaseline(root: string): BaselineEntry[] {
  const baselinePath = path.join(root, BASELINE_FILE);
  if (!fs.existsSync(baselinePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Obtém current rules.
 * @param root - Valor root.
 * @returns O resultado da operação.
 */
export function getCurrentRules(root: string): BaselineEntry[] {
  return createBaseline(root);
}

/** Interface que define a estrutura de downgrade finding. */
export interface DowngradeFinding {
  file: string;
  rule: string;
  severity: string;
  action: 'removed' | 'downgraded';
}

/**
 * Detecta downgrades.
 * @param baseline - Valor baseline.
 * @param current - Valor current.
 * @returns O resultado da operação.
 */
export function detectDowngrades(baseline: BaselineEntry[], current: BaselineEntry[]): DowngradeFinding[] {
  const findings: DowngradeFinding[] = [];

  for (const baseEntry of baseline) {
    const currentEntry = current.find(c => c.file === baseEntry.file);
    if (!currentEntry) {
      for (const rule of baseEntry.rules) {
        findings.push({ file: baseEntry.file, rule: rule.text, severity: rule.severity, action: 'removed' });
      }
      continue;
    }

    const currentTexts = new Set(currentEntry.rules.map(r => r.text));
    for (const baseRule of baseEntry.rules) {
      if (!currentTexts.has(baseRule.text)) {
        findings.push({ file: baseEntry.file, rule: baseRule.text, severity: baseRule.severity, action: 'removed' });
      }
    }
  }

  return findings;
}

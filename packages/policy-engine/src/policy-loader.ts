import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PolicyRule {
  id: string;
  description: string;
  pattern?: string;
  action: 'block' | 'ask' | 'auto';
  severity?: 'critical' | 'high' | 'medium' | 'low';
  resourcePattern?: string;
  actionPattern?: string;
  riskLevel?: 'high' | 'medium' | 'low';
}

export interface PolicyDocument {
  version: string;
  metadata: {
    name: string;
    description: string;
    updatedAt: string;
  };
  rules: PolicyRule[];
}

const DEFAULT_POLICY_DIR = path.resolve(process.cwd(), 'policies');

export function loadPolicyFile(filePath: string): PolicyDocument {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const doc = yaml.load(raw) as PolicyDocument;

  if (!doc.version || !doc.rules || !Array.isArray(doc.rules)) {
    throw new Error(`Invalid policy file: ${filePath}. Must have 'version' and 'rules[]'`);
  }

  return doc;
}

export function loadPolicyDirectory(dirPath: string = DEFAULT_POLICY_DIR): Map<string, PolicyDocument> {
  const policies = new Map<string, PolicyDocument>();

  if (!fs.existsSync(dirPath)) {
    return policies;
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.policy.yaml') || f.endsWith('.policy.yml'));

  for (const file of files) {
    try {
      const doc = loadPolicyFile(path.join(dirPath, file));
      policies.set(doc.metadata.name || file.replace(/\.policy\.ya?ml$/, ''), doc);
    } catch (_err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[PolicyLoader] Skipping ${file}: ${msg}`);
    }
  }

  return policies;
}

export function policyToInput(rule: PolicyRule): { actionType: string; resource?: string; riskLevel?: string } {
  return {
    actionType: rule.actionPattern || '*',
    resource: rule.resourcePattern,
    riskLevel: rule.riskLevel,
  };
}

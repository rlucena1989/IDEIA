import fs from 'fs';
import { createLogger } from '@ideia/logger';
import path from 'path';
import { CedarPolicySet } from './cedar-adapter';
const logger = createLogger('cedar-loader');

const DEFAULT_CEDAR_DIR = path.resolve(process.cwd(), 'policies');

export function loadCedarPolicyFile(filePath: string): CedarPolicySet {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const doc = JSON.parse(raw) as CedarPolicySet;
  if (!doc.version || !doc.policies || !Array.isArray(doc.policies)) {
    throw new Error(`Invalid Cedar policy file: ${filePath}. Must have 'version' and 'policies[]'`);
  }
  return doc;
}

export function loadCedarPolicyDirectory(dirPath: string = DEFAULT_CEDAR_DIR): CedarPolicySet[] {
  if (!fs.existsSync(dirPath)) return [];

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.cedar.json'));
  const sets: CedarPolicySet[] = [];

  for (const file of files) {
    try {
      sets.push(loadCedarPolicyFile(path.join(dirPath, file)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Skipping ${file}: ${msg}`);
    }
  }

  return sets;
}

export function mergeCedarPolicySets(sets: CedarPolicySet[]): CedarPolicySet {
  return {
    version: sets[0]?.version ?? '1.0',
    policies: sets.flatMap(s => s.policies),
  };
}
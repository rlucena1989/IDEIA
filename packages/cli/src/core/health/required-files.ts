import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

/** Tipo que define required file group. */
export type RequiredFileGroup = {
  id: string;
  label: string;
  required: string[];
  optional?: string[];
};

export interface HealthCheckResult {
  group: string;
  file: string;
  exists: boolean;
}

export interface HealthReport {
  passed: number;
  failed: number;
  total: number;
  checks: HealthCheckResult[];
}

export function runHealthChecks(): HealthReport {
  const cwd = process.cwd();
  const checks: HealthCheckResult[] = [];
  for (const group of REQUIRED_FILE_GROUPS) {
    for (const file of group.required) {
      const exists = fs.existsSync(path.resolve(cwd, file));
      checks.push({ group: group.label, file, exists });
    }
    for (const file of group.optional || []) {
      const exists = fs.existsSync(path.resolve(cwd, file));
      checks.push({ group: group.label, file, exists });
    }
  }
  const passed = checks.filter(c => c.exists).length;
  return { passed, failed: checks.length - passed, total: checks.length, checks };
}

/** Processa required file groups. */
export const REQUIRED_FILE_GROUPS: RequiredFileGroup[] = [
  {
    id: "context",
    label: "AI Context Freshness",
    required: [
      ".ai/context/ai-handoff.md"
    ]
  },
  {
    id: "architecture",
    label: "Architecture",
    required: [
      ".ai/project-manifest.yaml",
      ".ai/laws.yaml"
    ]
  },
  {
    id: "quality",
    label: "Quality",
    required: [
      ".ai/bin/verify.js",
      ".ai/bin/quality-agent.js"
    ]
  },
  {
    id: "security",
    label: "Security",
    required: [
      ".ai/policies/command-policy.md",
      ".ai/policies/ai-generated-code-policy.md"
    ]
  }
];

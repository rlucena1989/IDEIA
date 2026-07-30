import { DOCUMENT_REGISTRY, DocumentRegistryEntry } from './document-registry';
import { createLogger } from '@ideia/logger';
import { DEFAULT_DOCUMENT_POLICIES, DocumentPolicy } from './document-policy';

export interface DocumentConflict {
  taskType: string;
  documents: string[];
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  detail: string;
}

export interface ConflictResolved {
  document: string;
  reason: string;
  rule: string;
}

export interface AuditReport {
  conflicts: DocumentConflict[];
  resolved: ConflictResolved[];
  timestamp: string;
  totalDocuments: number;
  totalPolicies: number;
  status: 'clean' | 'warning' | 'blocked';
}

export function detectConflicts(): DocumentConflict[] {
  const conflicts: DocumentConflict[] = [];

  // Conflito 1: jest.config.js threshold 40% vs governance 80%
  conflicts.push({
    taskType: 'coverage',
    documents: ['jest.config.js', '.ai/laws.yaml', 'CLAUDE.md', 'AGENTS.md', '.ai/quality/ci-gate.md'],
    reason: 'Coverage threshold mismatch: jest.config.js defines 40% lines/statements/functions and 30% branches, but all governance documents require 80% minimum',
    severity: 'critical',
    recommendation: 'Update jest.config.js coverageThreshold to { lines: 80, statements: 80, functions: 80, branches: 70 } or document that Jest threshold is a soft floor and CI enforces 80%',
    detail: 'jest.config.js:13 → lines:40, branches:30 | .ai/laws.yaml → "Cobertura de testes minima: 80%"',
  });

  // Conflito 2: no-explicit-any off vs governance prohibition
  conflicts.push({
    taskType: 'architecture',
    documents: ['.eslintrc.js', '.ai/laws.yaml'],
    reason: 'ESLint no-explicit-any is "off" but architectural laws prohibit "any" without documented justification',
    severity: 'high',
    recommendation: 'Set @typescript-eslint/no-explicit-any to "warn" with allowTypedAlias, or create override requiring eslint-disable comment for any usage',
    detail: '.eslintrc.js:10 → no-explicit-any: off | .ai/laws.yaml rule 3 → "Proibido uso de any sem justificativa documentada"',
  });

  // Conflito 3: jest.e2e.config.js missing
  conflicts.push({
    taskType: 'tests',
    documents: ['package.json', 'jest.e2e.config.js'],
    reason: 'package.json script "test:e2e" references jest.e2e.config.js but file does not exist',
    severity: 'high',
    recommendation: 'Create jest.e2e.config.js or remove the test:e2e script from package.json',
    detail: 'package.json → "test:e2e": "jest --config jest.e2e.config.js --verbose" | File not found on disk',
  });

  // Conflito 4: Duplicated governance rules across 11+ AI instruction files
  conflicts.push({
    taskType: 'governance',
    documents: [
      'CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.clinerules', '.continuerules',
      '.rules', '.cursor/rules/ai-devkit.mdc', '.cursor/rules/ai-devkit-global.mdc',
      '.windsurf/rules/governance.md', '.amazonq/rules/governance.md',
      '.github/copilot-instructions.md', '.github/ai-instructions.md',
    ],
    reason: 'Same 9 architectural rules duplicated across 12+ AI instruction files with no single source of truth synchronization mechanism',
    severity: 'medium',
    recommendation: 'Consolidate in .ai/laws.yaml as single source of truth. AI instruction files should reference .ai/laws.yaml instead of duplicating content',
    detail: 'Each file independently copies the same 9 rules. Updates require manual sync across 12+ locations',
  });

  // Conflito 5: Multiple coverage metrics in different documents
  conflicts.push({
    taskType: 'metrics',
    documents: [
      'AI-ROI-ANALYSIS.md', 'plans/FUNCIONALIDADES_V2_METRICS.md',
      'docs/audit/audit-report-2026-07-09.md', 'docs/evolution-status.md',
      '.ai-devkit/metrics.json', 'coverage/coverage-summary.json',
    ],
    reason: 'Six documents report different coverage numbers: 84.28%, 84.28%, 32.62%, ~24%, 47%, 2.31% — no single authoritative metric',
    severity: 'high',
    recommendation: 'Define official coverage metric source in .ai/project-manifest.yaml. All documents should reference the same command output',
    detail: 'AI-ROI-ANALYSIS.md:84.28% | FUNCIONALIDADES_V2_METRICS.md:84.28% | audit-report:32.62% | evolution-status:~24% | metrics.json:47% | coverage-summary.json:2.31%',
  });

  return conflicts;
}

export function resolveConflict(conflict: DocumentConflict): ConflictResolved {
  const policy = DEFAULT_DOCUMENT_POLICIES.find(p => p.taskType === conflict.taskType);
  const rule = policy?.conflictRule ?? 'priority';

  // Apply conflict resolution rule
  if (rule === 'specificity') {
    // Most specific document wins (the one with most targeted scope)
    return {
      document: conflict.documents[0],
      reason: `Applied "specificity" rule: most specific document "${conflict.documents[0]}" takes precedence`,
      rule: 'specificity — documento específico vence genérico',
    };
  }

  if (rule === 'priority') {
    // Document with highest priority in registry wins
    const winner = conflict.documents
      .map(d => DOCUMENT_REGISTRY.find(r => r.path === d || r.id === d))
      .filter(Boolean) as DocumentRegistryEntry[];
    const sorted = winner.sort((a, b) => b.priority - a.priority);
    return {
      document: sorted[0]?.id ?? conflict.documents[0],
      reason: `Applied "priority" rule: highest priority document wins`,
      rule: 'priority — documento de maior prioridade vence',
    };
  }

  // block — requires human intervention
  return {
    document: 'HUMAN_INTERVENTION_REQUIRED',
    reason: `Conflict is structural (severity: ${conflict.severity}). Cannot auto-resolve. Requires human decision.`,
    rule: 'block — conflito estrutural bloqueia execução automática',
  };
}

export function runAudit(): AuditReport {
  const conflicts = detectConflicts();
  const resolved = conflicts.map(c => resolveConflict(c));

  const hasCritical = conflicts.some(c => c.severity === 'critical');
  const hasHigh = conflicts.some(c => c.severity === 'high');

  return {
    conflicts,
    resolved,
    timestamp: new Date().toISOString(),
    totalDocuments: DOCUMENT_REGISTRY.length,
    totalPolicies: DEFAULT_DOCUMENT_POLICIES.length,
    status: hasCritical ? 'blocked' : hasHigh ? 'warning' : 'clean',
  };
}

import { resolveDocument, resolveByTags } from '../governance/doc-resolver';
import { listActiveDocuments, findDocumentByTaskType, findDocumentsByCategory, findDocumentByPath } from '../governance/document-registry';
import { getPolicy, listPolicies } from '../governance/document-policy';
import { runAudit, detectConflicts } from '../governance/document-audit';
import { docsCommand } from '../commands/docs';

describe('document-registry', () => {
  it('listActiveDocuments returns active documents sorted by priority descending', () => {
    const docs = listActiveDocuments();
    expect(docs.length).toBeGreaterThan(0);
    for (let i = 0; i < docs.length - 1; i++) {
      expect(docs[i].priority).toBeGreaterThanOrEqual(docs[i + 1].priority);
    }
  });

  it('listActiveDocuments only returns active documents', () => {
    const docs = listActiveDocuments();
    expect(docs.every(d => d.active)).toBe(true);
  });

  it('findDocumentByTaskType finds by id', () => {
    const doc = findDocumentByTaskType('master-plan');
    expect(doc).toBeDefined();
    expect(doc!.id).toBe('master-plan');
  });

  it('findDocumentByTaskType finds by tag', () => {
    const doc = findDocumentByTaskType('execution');
    expect(doc).toBeDefined();
    expect(doc!.tags).toContain('execution');
  });

  it('findDocumentByTaskType returns undefined for unknown type', () => {
    const doc = findDocumentByTaskType('nonexistent-type-xyz');
    expect(doc).toBeUndefined();
  });

  it('findDocumentsByCategory filters by category', () => {
    const policies = findDocumentsByCategory('policy');
    expect(policies.length).toBeGreaterThanOrEqual(4);
    expect(policies.every(d => d.category === 'policy')).toBe(true);
  });

  it('findDocumentByPath finds by path', () => {
    const doc = findDocumentByPath('.ai/laws.yaml');
    expect(doc).toBeDefined();
    expect(doc!.id).toBe('laws');
  });

  it('findDocumentByPath returns undefined for unknown path', () => {
    const doc = findDocumentByPath('/nonexistent/path.md');
    expect(doc).toBeUndefined();
  });
});

describe('doc-resolver', () => {
  it('resolveDocument finds primary by id', () => {
    const result = resolveDocument('master-plan');
    expect(result.primary).toBeDefined();
    expect(result.primary!.id).toBe('master-plan');
    expect(result.blocked).toBe(false);
  });

  it('resolveDocument finds primary by tag when no id match', () => {
    const result = resolveDocument('coverage');
    expect(result.primary).toBeDefined();
    expect(result.blocked).toBe(false);
  });

  it('resolveDocument returns null primary and blocked=true for unknown type', () => {
    const result = resolveDocument('unknown-task-type-xyz');
    expect(result.primary).toBeNull();
    expect(result.blocked).toBe(true);
    expect(result.fallbacks.length).toBeGreaterThan(0);
  });

  it('resolveDocument fallbacks are sorted by priority', () => {
    const result = resolveDocument('unknown-task-type-xyz');
    for (let i = 0; i < result.fallbacks.length - 1; i++) {
      expect(result.fallbacks[i].priority).toBeGreaterThanOrEqual(result.fallbacks[i + 1].priority);
    }
  });

  it('resolveDocument fallbacks limited to 3', () => {
    const result = resolveDocument('unknown-task-type-xyz');
    expect(result.fallbacks.length).toBeLessThanOrEqual(3);
  });

  it('resolveByTags finds documents matching tags', () => {
    const result = resolveByTags(['tests']);
    expect(result.primary).toBeDefined();
    expect(result.blocked).toBe(false);
  });

  it('resolveByTags returns blocked for no match', () => {
    const result = resolveByTags(['nonexistent-tag-99']);
    expect(result.primary).toBeNull();
    expect(result.blocked).toBe(true);
  });
});

describe('document-policy', () => {
  it('getPolicy returns policy for known task type', () => {
    const policy = getPolicy('tests');
    expect(policy).toBeDefined();
    expect(policy!.taskType).toBe('tests');
    expect(policy!.primaryDocument).toBe('coverage-autonomy');
  });

  it('getPolicy returns undefined for unknown type', () => {
    const policy = getPolicy('nonexistent-type');
    expect(policy).toBeUndefined();
  });

  it('listPolicies returns all policies', () => {
    const policies = listPolicies();
    expect(policies.length).toBeGreaterThanOrEqual(7);
  });

  it('policies have required fields', () => {
    const policies = listPolicies();
    for (const p of policies) {
      expect(p.taskType).toBeTruthy();
      expect(p.primaryDocument).toBeTruthy();
      expect(p.conflictRule).toMatch(/^(specificity|priority|block)$/);
      expect(p.executionMode).toMatch(/^(read-only|plan-only|execute)$/);
    }
  });
});

describe('document-audit', () => {
  it('detectConflicts returns at least 5 known conflicts', () => {
    const conflicts = detectConflicts();
    expect(conflicts.length).toBeGreaterThanOrEqual(5);
  });

  it('coverage threshold conflict is critical', () => {
    const conflicts = detectConflicts();
    const covConflict = conflicts.find(c => c.taskType === 'coverage');
    expect(covConflict).toBeDefined();
    expect(covConflict!.severity).toBe('critical');
    expect(covConflict!.documents).toContain('jest.config.js');
  });

  it('no-explicit-any conflict is high', () => {
    const conflicts = detectConflicts();
    const anyConflict = conflicts.find(c => c.taskType === 'architecture');
    expect(anyConflict).toBeDefined();
    expect(anyConflict!.severity).toBe('high');
  });

  it('runAudit returns complete report', () => {
    const report = runAudit();
    expect(report.conflicts.length).toBeGreaterThanOrEqual(5);
    expect(report.resolved.length).toBe(report.conflicts.length);
    expect(report.timestamp).toBeTruthy();
    expect(report.totalDocuments).toBeGreaterThan(0);
    expect(report.totalPolicies).toBeGreaterThan(0);
    expect(['clean', 'warning', 'blocked']).toContain(report.status);
  });

  it('runAudit status is blocked when critical conflicts exist', () => {
    const report = runAudit();
    const hasCritical = report.conflicts.some(c => c.severity === 'critical');
    if (hasCritical) {
      expect(report.status).toBe('blocked');
    }
  });
});

describe('docs command', () => {
  it('creates a command', () => {
    const cmd = docsCommand();
    expect(cmd).toBeDefined();
  });

  it('has resolve subcommand', () => {
    const cmd = docsCommand();
    const resolveCmd = cmd.commands.find(c => c.name() === 'resolve');
    expect(resolveCmd).toBeDefined();
  });

  it('has audit subcommand', () => {
    const cmd = docsCommand();
    const auditCmd = cmd.commands.find(c => c.name() === 'audit');
    expect(auditCmd).toBeDefined();
  });

  it('has sources subcommand', () => {
    const cmd = docsCommand();
    const sourcesCmd = cmd.commands.find(c => c.name() === 'sources');
    expect(sourcesCmd).toBeDefined();
  });

  it('has policy subcommand', () => {
    const cmd = docsCommand();
    const policyCmd = cmd.commands.find(c => c.name() === 'policy');
    expect(policyCmd).toBeDefined();
  });

  it('has status subcommand', () => {
    const cmd = docsCommand();
    const statusCmd = cmd.commands.find(c => c.name() === 'status');
    expect(statusCmd).toBeDefined();
  });
});

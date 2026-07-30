import type { CliCommandResult, CommandContext } from '../types/cli-result';
import { createLogger } from '@ideia/logger';
import { success, failure } from '../types/cli-result';
import { resolveDocument, resolveByTags } from '../governance/doc-resolver';
import { listActiveDocuments, findDocumentsByCategory, findDocumentByPath } from '../governance/document-registry';
import { getPolicy, listPolicies } from '../governance/document-policy';
import { runAudit, detectConflicts } from '../governance/document-audit';

export interface DocResolveOutput {
  primary: unknown | null;
  fallbacks: unknown[];
  reason: string;
  blocked: boolean;
}

export function handleDocResolve(taskType: string): CliCommandResult<DocResolveOutput> {
  const result = resolveDocument(taskType);
  const output: DocResolveOutput = {
    primary: result.primary,
    fallbacks: result.fallbacks,
    reason: result.reason,
    blocked: result.blocked,
  };

  if (result.blocked) {
    return failure(`Bloqueado: ${result.reason}`, 1, output) as CliCommandResult<DocResolveOutput>;
  }

  return success(result.reason, output);
}

export interface DocAuditOutput {
  status: string;
  conflicts: unknown[];
}

export function handleDocAudit(): CliCommandResult<DocAuditOutput> {
  const report = runAudit();
  const output: DocAuditOutput = {
    status: report.status,
    conflicts: report.conflicts,
  };

  if (report.status === 'blocked') {
    return failure(`${report.conflicts.length} conflitos encontrados, alguns críticos`, 1, output) as CliCommandResult<DocAuditOutput>;
  }

  const _level = report.status === 'warning' ? 0 : 0;
  return success(`${report.conflicts.length} conflitos encontrados. Status: ${report.status}`, output);
}

export interface DocSourcesOutput {
  documents: unknown[];
  category?: string;
  total: number;
}

export function handleDocSources(category?: string): CliCommandResult<DocSourcesOutput> {
  const docs = category
    ? findDocumentsByCategory(category as 'task' | 'plan' | 'procedure' | 'metric' | 'roadmap' | 'policy' | 'reference')
    : listActiveDocuments();

  return success(`${docs.length} fontes de verdade ativas`, {
    documents: docs,
    category,
    total: docs.length,
  });
}

export interface DocPolicyOutput {
  policies: unknown[];
  taskType?: string;
}

export function handleDocPolicy(taskType?: string): CliCommandResult<DocPolicyOutput> {
  if (taskType) {
    const policy = getPolicy(taskType);
    return success(`Política para "${taskType}"`, {
      policies: policy ? [policy] : [],
      taskType,
    });
  }

  const allPolicies = listPolicies();
  return success(`${allPolicies.length} políticas documentais`, {
    policies: allPolicies,
  });
}

export interface DocStatusOutput {
  totalDocuments: number;
  totalPolicies: number;
  conflicts: number;
  status: string;
}

export function handleDocStatus(): CliCommandResult<DocStatusOutput> {
  const docs = listActiveDocuments();
  const policies = listPolicies();
  const report = runAudit();

  return success('Status da governança documental', {
    totalDocuments: docs.length,
    totalPolicies: policies.length,
    conflicts: report.conflicts.length,
    status: report.status,
  });
}

export function sampleResolveDocumentForTask(taskType: string): {
  primary: string | null;
  fallbacks: string[];
  reason: string;
  blocked: boolean;
} {
  if (taskType === 'tests') {
    return {
      primary: 'coverage-autonomy-procedure.md',
      fallbacks: ['teste-autonomy.md', 'master-plan.md'],
      reason: 'Tests must follow autonomy procedure first',
      blocked: false,
    };
  }

  if (taskType === 'strategy') {
    return {
      primary: 'master-plan.md',
      fallbacks: ['future-plans.md', 'AI-DEVKIT-CATALOGO-COMPLETO.md'],
      reason: 'Strategy must follow master plan',
      blocked: false,
    };
  }

  return {
    primary: 'current-task.md',
    fallbacks: ['backlog.md', 'master-plan.md'],
    reason: 'Default execution path',
    blocked: false,
  };
}

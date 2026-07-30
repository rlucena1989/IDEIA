import { OperationalContext } from './context-types';
import { createLogger } from '@ideia/logger';
import { ContextPriorityResult } from './context-prioritizer';
import { MergedContext } from './context-merge';
const logger = createLogger('context-report');

export interface ContextReport {
  generatedAt: string;
  totalContexts: number;
  activeCount: number;
  blockedCount: number;
  archivedCount: number;
  activeContext: OperationalContext | undefined;
  priorities: ContextPriorityResult[];
  merged?: MergedContext;
  summary: string[];
}

export function buildContextReport(params: {
  contexts: OperationalContext[];
  activeContext: OperationalContext | undefined;
  priorities: ContextPriorityResult[];
  merged?: MergedContext;
}): ContextReport {
  const activeCount = params.contexts.filter(c => c.status === 'active').length;
  const blockedCount = params.contexts.filter(c => c.status === 'blocked').length;
  const archivedCount = params.contexts.filter(c => c.status === 'archived').length;

  const summary: string[] = [
    `${params.contexts.length} contexto(s) registrado(s)`,
    `${activeCount} ativo(s), ${blockedCount} bloqueado(s), ${archivedCount} arquivado(s)`,
    `Contexto ativo: ${params.activeContext?.name ?? 'Nenhum'}`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    totalContexts: params.contexts.length,
    activeCount,
    blockedCount,
    archivedCount,
    activeContext: params.activeContext,
    priorities: params.priorities,
    merged: params.merged,
    summary,
  };
}

export type ConflictRule = 'specificity' | 'priority' | 'block';
export type ExecutionMode = 'read-only' | 'plan-only' | 'execute';

export interface DocumentPolicy {
  taskType: string;
  primaryDocument: string;
  fallbackDocuments: string[];
  conflictRule: ConflictRule;
  executionMode: ExecutionMode;
  requiresApproval: boolean;
  description: string;
}

export const DEFAULT_DOCUMENT_POLICIES: DocumentPolicy[] = [
  {
    taskType: 'execution',
    primaryDocument: 'current-task',
    fallbackDocuments: ['backlog', 'master-plan'],
    conflictRule: 'specificity',
    executionMode: 'execute',
    requiresApproval: false,
    description: 'Execução imediata: usa current-task.md como guia principal',
  },
  {
    taskType: 'tests',
    primaryDocument: 'coverage-autonomy',
    fallbackDocuments: ['test-autonomy', 'master-plan'],
    conflictRule: 'specificity',
    executionMode: 'plan-only',
    requiresApproval: false,
    description: 'Ciclo autônomo de testes: usa coverage-autonomy-procedure.md',
  },
  {
    taskType: 'coverage',
    primaryDocument: 'coverage-autonomy',
    fallbackDocuments: ['coverage-dashboard', 'master-plan'],
    conflictRule: 'specificity',
    executionMode: 'execute',
    requiresApproval: false,
    description: 'Melhoria de cobertura: usa procedimento autônomo + dashboard',
  },
  {
    taskType: 'strategy',
    primaryDocument: 'master-plan',
    fallbackDocuments: ['future-plans', 'catalog'],
    conflictRule: 'priority',
    executionMode: 'read-only',
    requiresApproval: true,
    description: 'Planejamento estratégico: master-plan.md é a referência',
  },
  {
    taskType: 'governance',
    primaryDocument: 'laws',
    fallbackDocuments: ['project-policy', 'quality-gates'],
    conflictRule: 'priority',
    executionMode: 'read-only',
    requiresApproval: true,
    description: 'Regras de governança: .ai/laws.yaml como fonte de verdade',
  },
  {
    taskType: 'architecture',
    primaryDocument: 'laws',
    fallbackDocuments: ['project-manifest', 'quality-gates'],
    conflictRule: 'specificity',
    executionMode: 'read-only',
    requiresApproval: true,
    description: 'Decisões arquiteturais: leis arquiteturais em .ai/laws.yaml',
  },
  {
    taskType: 'planning',
    primaryDocument: 'backlog',
    fallbackDocuments: ['master-plan', 'func-roadmap'],
    conflictRule: 'specificity',
    executionMode: 'plan-only',
    requiresApproval: false,
    description: 'Planejamento: backlog.md prioriza tarefas',
  },
  {
    taskType: 'metrics',
    primaryDocument: 'func-metrics',
    fallbackDocuments: ['coverage-dashboard', 'catalog'],
    conflictRule: 'priority',
    executionMode: 'read-only',
    requiresApproval: false,
    description: 'Métricas de sucesso: FUNCIONALIDADES_V2_METRICS.md',
  },
];

export function getPolicy(taskType: string): DocumentPolicy | undefined {
  return DEFAULT_DOCUMENT_POLICIES.find(policy => policy.taskType === taskType);
}

export function listPolicies(): DocumentPolicy[] {
  return [...DEFAULT_DOCUMENT_POLICIES];
}

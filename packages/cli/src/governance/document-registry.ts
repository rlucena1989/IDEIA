export type DocumentCategory =
  | 'task'
  | 'plan'
  | 'procedure'
  | 'metric'
  | 'roadmap'
  | 'policy'
  | 'reference';

export interface DocumentRegistryEntry {
  id: string;
  title: string;
  path: string;
  category: DocumentCategory;
  priority: number;
  active: boolean;
  tags: string[];
  updatedAt?: string;
}

export const DOCUMENT_REGISTRY: DocumentRegistryEntry[] = [
  {
    id: 'current-task',
    title: 'Current Task',
    path: '.ai/tasks/current-task.md',
    category: 'task',
    priority: 100,
    active: true,
    tags: ['execution', 'immediate', 'task'],
  },
  {
    id: 'coverage-autonomy',
    title: 'Coverage Autonomy Procedure',
    path: 'plans/coverage-autonomy-procedure.md',
    category: 'procedure',
    priority: 95,
    active: true,
    tags: ['tests', 'autonomy', 'coverage'],
  },
  {
    id: 'test-autonomy',
    title: 'Test Autonomy Matrix',
    path: 'plans/teste-autonomy.md',
    category: 'procedure',
    priority: 92,
    active: true,
    tags: ['tests', 'quality', 'autonomy'],
  },
  {
    id: 'backlog',
    title: 'Backlog',
    path: '.ai/tasks/backlog.md',
    category: 'plan',
    priority: 90,
    active: true,
    tags: ['prioritization', 'planning'],
  },
  {
    id: 'master-plan',
    title: 'Master Plan',
    path: '.ai/tasks/master-plan.md',
    category: 'plan',
    priority: 85,
    active: true,
    tags: ['strategy', 'planning'],
  },
  {
    id: 'devkit-adjustments',
    title: 'DevKit Adjustments F01',
    path: 'plans/devkit-adjustments-f01.md',
    category: 'plan',
    priority: 82,
    active: true,
    tags: ['governance', 'phase-0', 'adjustments'],
  },
  {
    id: 'func-roadmap',
    title: 'Functional Roadmap',
    path: 'plans/FUNCIONALIDADES_V2_ROADMAP.md',
    category: 'roadmap',
    priority: 80,
    active: true,
    tags: ['roadmap', 'planning'],
  },
  {
    id: 'func-metrics',
    title: 'Functional Metrics',
    path: 'plans/FUNCIONALIDADES_V2_METRICS.md',
    category: 'metric',
    priority: 75,
    active: true,
    tags: ['metrics', 'scorecard'],
  },
  {
    id: 'func-matrix',
    title: 'Functional Matrix',
    path: 'plans/FUNCIONALIDADES_V2_MATRIX.md',
    category: 'reference',
    priority: 70,
    active: true,
    tags: ['matrix', 'dependencies'],
  },
  {
    id: 'func-proposals',
    title: 'Functional Proposals',
    path: 'plans/FUNCIONALIDADES_V2_PROPOSALS.md',
    category: 'reference',
    priority: 65,
    active: true,
    tags: ['proposals', 'improvements'],
  },
  {
    id: 'future-plans',
    title: 'Future Plans',
    path: 'plans/future/future-plans.md',
    category: 'reference',
    priority: 60,
    active: true,
    tags: ['long-term', 'vision'],
  },
  {
    id: 'catalog',
    title: 'Complete Catalog',
    path: 'AI-DEVKIT-CATALOGO-COMPLETO.md',
    category: 'reference',
    priority: 50,
    active: true,
    tags: ['catalog', 'reference'],
  },
  {
    id: 'coverage-dashboard',
    title: 'Coverage Dashboard',
    path: '.ai-devkit/coverage-dashboard.md',
    category: 'metric',
    priority: 45,
    active: true,
    tags: ['coverage', 'metrics', 'dashboard'],
  },
  {
    id: 'laws',
    title: 'Architectural Laws',
    path: '.ai/laws.yaml',
    category: 'policy',
    priority: 100,
    active: true,
    tags: ['architecture', 'rules', 'governance'],
  },
  {
    id: 'project-manifest',
    title: 'Project Manifest',
    path: '.ai/project-manifest.yaml',
    category: 'policy',
    priority: 98,
    active: true,
    tags: ['manifest', 'stack', 'requirements'],
  },
  {
    id: 'quality-gates',
    title: 'Quality Gates',
    path: '.ai/quality/quality-gates.md',
    category: 'policy',
    priority: 93,
    active: true,
    tags: ['quality', 'gates'],
  },
  {
    id: 'project-policy',
    title: 'Project Policy',
    path: '.ai/policies/project-policy.yaml',
    category: 'policy',
    priority: 90,
    active: true,
    tags: ['policy', 'naming', 'structure'],
  },
];

export function listActiveDocuments(): DocumentRegistryEntry[] {
  return DOCUMENT_REGISTRY
    .filter(doc => doc.active)
    .sort((a, b) => b.priority - a.priority);
}

export function findDocumentByTaskType(taskType: string): DocumentRegistryEntry | undefined {
  return DOCUMENT_REGISTRY.find(
    doc => doc.active && (doc.tags.includes(taskType) || doc.id === taskType)
  );
}

export function findDocumentsByCategory(category: DocumentCategory): DocumentRegistryEntry[] {
  return DOCUMENT_REGISTRY
    .filter(doc => doc.active && doc.category === category)
    .sort((a, b) => b.priority - a.priority);
}

export function findDocumentByPath(path: string): DocumentRegistryEntry | undefined {
  return DOCUMENT_REGISTRY.find(doc => doc.path === path);
}

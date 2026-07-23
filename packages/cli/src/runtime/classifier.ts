/** Tipo que define task type. */
export type TaskType =
  | 'bugfix'
  | 'feature'
  | 'refactor'
  | 'documentation'
  | 'design_change'
  | 'security_review'
  | 'test_only'
  | 'dependency_update'
  | 'cleanup'
  | 'incident_response';

/** ALL_TASK_TYPES */
export const ALL_TASK_TYPES: TaskType[] = [
  'bugfix', 'feature', 'refactor', 'documentation', 'design_change',
  'security_review', 'test_only', 'dependency_update', 'cleanup', 'incident_response',
];

/** TASK_TYPE_LABELS */
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  bugfix: 'Bugfix',
  feature: 'Feature',
  refactor: 'Refactor',
  documentation: 'Documentação',
  design_change: 'Mudança de Design',
  security_review: 'Revisão de Segurança',
  test_only: 'Apenas Testes',
  dependency_update: 'Atualização de Dependência',
  cleanup: 'Limpeza',
  incident_response: 'Resposta a Incidente',
};

/** Interface que define a estrutura de classification factor. */
export interface ClassificationFactor {
  keyword: string;
  weight: number;
  source: 'description' | 'files';
}

/** Interface que define a estrutura de classification result. */
export interface ClassificationResult {
  taskType: TaskType;
  confidence: number;
  factors: ClassificationFactor[];
  secondaryTypes: { taskType: TaskType; confidence: number }[];
  requiresManualReview: boolean;
}

/** Interface que define a estrutura de classification request. */
export interface ClassificationRequest {
  description: string;
  files?: string[];
  title?: string;
  labels?: string[];
}

/** Interface que define a estrutura de type routing. */
export interface TypeRouting {
  pipeline: string[];
  context: string;
  agents: string[];
  budget: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

/** DEFAULT_ROUTING */
export const DEFAULT_ROUTING: Record<TaskType, TypeRouting> = {
  bugfix: {
    pipeline: ['validate-request', 'analyze-impact', 'read-git-diff', 'generate-patch', 'score-quality', 'score-risk'],
    context: 'forensic',
    agents: ['fixer', 'reviewer', 'tester'],
    budget: 'bugfix',
    risk: 'medium',
  },
  feature: {
    pipeline: ['validate-request', 'analyze-impact', 'get-repository-memory', 'read-git-diff', 'minimize-context', 'summarize-impact', 'generate-patch', 'score-quality', 'score-risk'],
    context: 'full',
    agents: ['planner', 'developer', 'reviewer', 'tester'],
    budget: 'feature',
    risk: 'high',
  },
  refactor: {
    pipeline: ['validate-request', 'analyze-impact', 'get-repository-memory', 'read-git-diff', 'minimize-context', 'summarize-impact', 'generate-patch', 'score-quality', 'score-risk'],
    context: 'architectural',
    agents: ['developer', 'reviewer'],
    budget: 'refactor',
    risk: 'high',
  },
  documentation: {
    pipeline: ['validate-request', 'analyze-impact', 'generate-patch', 'score-quality'],
    context: 'minimal',
    agents: ['writer', 'reviewer'],
    budget: 'docs',
    risk: 'low',
  },
  design_change: {
    pipeline: ['validate-request', 'analyze-impact', 'get-repository-memory', 'read-git-diff', 'minimize-context', 'generate-patch', 'score-quality'],
    context: 'design',
    agents: ['designer', 'developer', 'reviewer'],
    budget: 'feature',
    risk: 'medium',
  },
  security_review: {
    pipeline: ['validate-request', 'analyze-impact', 'read-git-diff', 'score-quality', 'score-risk'],
    context: 'forensic',
    agents: ['security-auditor', 'reviewer'],
    budget: 'bugfix',
    risk: 'critical',
  },
  test_only: {
    pipeline: ['validate-request', 'analyze-impact', 'read-git-diff', 'score-quality'],
    context: 'minimal',
    agents: ['tester', 'reviewer'],
    budget: 'docs',
    risk: 'low',
  },
  dependency_update: {
    pipeline: ['validate-request', 'analyze-impact', 'read-git-diff', 'score-risk'],
    context: 'minimal',
    agents: ['reviewer'],
    budget: 'docs',
    risk: 'medium',
  },
  cleanup: {
    pipeline: ['validate-request', 'analyze-impact', 'read-git-diff', 'generate-patch', 'score-quality'],
    context: 'minimal',
    agents: ['cleaner', 'reviewer'],
    budget: 'docs',
    risk: 'low',
  },
  incident_response: {
    pipeline: ['validate-request', 'analyze-impact', 'read-git-diff', 'generate-patch', 'score-quality', 'score-risk'],
    context: 'forensic',
    agents: ['fixer', 'security-auditor', 'reviewer'],
    budget: 'bugfix',
    risk: 'critical',
  },
};

interface KeywordEntry {
  type: TaskType;
  weight: number;
}

const DESCRIPTION_PATTERNS: Record<string, KeywordEntry[]> = {
  bugfix: [
    { type: 'bugfix', weight: 0.9 }, { type: 'bugfix', weight: 0.8 },
    { type: 'bugfix', weight: 0.7 }, { type: 'bugfix', weight: 0.7 },
    { type: 'bugfix', weight: 0.6 }, { type: 'bugfix', weight: 0.6 },
    { type: 'incident_response', weight: 0.5 }, { type: 'test_only', weight: 0.3 },
  ],
  feature: [
    { type: 'feature', weight: 0.9 }, { type: 'feature', weight: 0.8 },
    { type: 'feature', weight: 0.7 }, { type: 'feature', weight: 0.6 },
    { type: 'feature', weight: 0.6 }, { type: 'design_change', weight: 0.3 },
  ],
  refactor: [
    { type: 'refactor', weight: 0.9 }, { type: 'refactor', weight: 0.8 },
    { type: 'refactor', weight: 0.7 }, { type: 'refactor', weight: 0.6 },
    { type: 'cleanup', weight: 0.4 },
  ],
  documentation: [
    { type: 'documentation', weight: 0.9 }, { type: 'documentation', weight: 0.8 },
    { type: 'documentation', weight: 0.7 },
  ],
  design_change: [
    { type: 'design_change', weight: 0.8 }, { type: 'design_change', weight: 0.7 },
    { type: 'feature', weight: 0.3 },
  ],
  security_review: [
    { type: 'security_review', weight: 0.9 }, { type: 'security_review', weight: 0.8 },
    { type: 'security_review', weight: 0.7 }, { type: 'security_review', weight: 0.6 },
    { type: 'bugfix', weight: 0.2 }, { type: 'incident_response', weight: 0.4 },
  ],
  test_only: [
    { type: 'test_only', weight: 0.8 }, { type: 'test_only', weight: 0.7 },
  ],
  dependency_update: [
    { type: 'dependency_update', weight: 0.9 }, { type: 'dependency_update', weight: 0.8 },
    { type: 'feature', weight: 0.2 },
  ],
  cleanup: [
    { type: 'cleanup', weight: 0.8 }, { type: 'cleanup', weight: 0.7 },
    { type: 'refactor', weight: 0.3 },
  ],
  incident_response: [
    { type: 'incident_response', weight: 0.9 }, { type: 'incident_response', weight: 0.8 },
    { type: 'bugfix', weight: 0.3 },
  ],
};

const KEYWORD_MAP: Record<string, KeywordEntry[]> = (() => {
  const map: Record<string, KeywordEntry[]> = {};
  for (const [keyword, entries] of Object.entries(DESCRIPTION_PATTERNS)) {
    const patterns = [keyword];
    if (keyword === 'bugfix') patterns.push('bug fix', 'fix', 'corrig', 'erro', 'falha', 'crash', 'não funciona', 'quebrado', 'defeito', 'issue');
    else if (keyword === 'feature') patterns.push('feature', 'nova funcionalidade', 'adicionar', 'implementar', 'novo', 'melhoria', 'solicitação', 'request', 'enhancement');
    else if (keyword === 'refactor') patterns.push('refactor', 'refatorar', 'reestruturar', 'melhorar código', 'clean code', 'technical debt', 'dívida técnica');
    else if (keyword === 'documentation') patterns.push('documentação', 'docs', 'readme', 'doc', 'manual', 'wiki', 'guia', 'tutorial', 'comentário');
    else if (keyword === 'design_change') patterns.push('design', 'ui', 'ux', 'layout', 'estilo', 'visual', 'interface', 'tema', 'css');
    else if (keyword === 'security_review') patterns.push('segurança', 'security', 'vulnerabilidade', 'cve', 'audit', 'criptografia', 'auth', 'permissão', 'rbac', 'ssl', 'token');
    else if (keyword === 'test_only') patterns.push('test', 'teste', 'spec', 'unitário', 'e2e', 'coverage', 'cobertura', 'jest', 'assert');
    else if (keyword === 'dependency_update') patterns.push('dependency', 'dependência', 'update', 'upgrade', 'versão', 'package', 'npm', 'pip');
    else if (keyword === 'cleanup') patterns.push('cleanup', 'limpeza', 'remover', 'deletar', 'lixo', 'dead code', 'código morto', 'legado');
    else if (keyword === 'incident_response') patterns.push('incidente', 'incident', 'p0', 'p1', 'urgente', 'down', 'offline', 'crítico', 'produção', 'rollback');
    for (const p of patterns) map[normalizeText(p)] = entries;
  }
  return map;
})();

const FILE_PATTERNS: Record<string, TaskType[]> = {
  test: ['test_only'],
  spec: ['test_only'],
  '.test.': ['test_only'],
  '.spec.': ['test_only'],
  __tests__: ['test_only'],
  '.md': ['documentation'],
  '.txt': ['documentation'],
  'readme': ['documentation'],
  changelog: ['documentation'],
  'docs/': ['documentation'],
  '.css': ['design_change'],
  '.scss': ['design_change'],
  '.less': ['design_change'],
  'security': ['security_review'],
  'vulnerability': ['security_review'],
  'cve': ['security_review'],
  '.json': ['dependency_update'],
  'package.json': ['dependency_update'],
  'requirements.txt': ['dependency_update'],
  'yarn.lock': ['dependency_update'],
  'package-lock.json': ['dependency_update'],
  'dockerfile': ['dependency_update'],
  '.env': ['security_review'],
  'migration': ['refactor'],
  'legacy': ['cleanup', 'refactor'],
  'deprecated': ['cleanup'],
  'dead': ['cleanup'],
  'todo': ['feature'],
  'fixme': ['bugfix'],
  'hotfix': ['bugfix', 'incident_response'],
  'workaround': ['bugfix'],
};

/** normalizeText */
export function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** matchKeywords */
export function matchKeywords(
  text: string,
  taskType: TaskType,
): ClassificationFactor[] {
  const factors: ClassificationFactor[] = [];
  const normalized = normalizeText(text);
  for (const [pattern, entries] of Object.entries(KEYWORD_MAP)) {
    const hasMatch = normalized.includes(pattern);
    if (hasMatch) {
      for (const entry of entries) {
        if (entry.type === taskType) {
          factors.push({ keyword: pattern, weight: entry.weight, source: 'description' });
        }
      }
    }
  }
  return factors;
}

/** classifyByDescription */
export function classifyByDescription(request: ClassificationRequest): ClassificationResult {
  const text = `${request.title || ''} ${request.description}`.trim();
  if (!text) {
    return {
      taskType: 'feature',
      confidence: 0,
      factors: [],
      secondaryTypes: [],
      requiresManualReview: true,
    };
  }

  const normalized = normalizeText(text);
  const scores: Record<string, number> = {};
  const allFactors: ClassificationFactor[] = [];

  for (const [pattern, entries] of Object.entries(KEYWORD_MAP)) {
    if (normalized.includes(pattern)) {
      for (const entry of entries) {
        scores[entry.type] = (scores[entry.type] || 0) + entry.weight;
        allFactors.push({ keyword: pattern, weight: entry.weight, source: 'description' });
      }
    }
  }

  if (request.files && request.files.length > 0) {
    for (const file of request.files) {
      const lowerFile = file.toLowerCase();
      for (const [pattern, types] of Object.entries(FILE_PATTERNS)) {
        if (lowerFile.includes(pattern)) {
          for (const type of types) {
            scores[type] = (scores[type] || 0) + 0.3;
            allFactors.push({ keyword: `${pattern} in ${file}`, weight: 0.3, source: 'files' });
          }
        }
      }
    }
  }

  if (request.labels && request.labels.length > 0) {
    for (const label of request.labels) {
      const lowerLabel = normalizeText(label);
      for (const [pattern, entries] of Object.entries(KEYWORD_MAP)) {
        if (lowerLabel.includes(pattern)) {
          for (const entry of entries) {
            scores[entry.type] = (scores[entry.type] || 0) + entry.weight * 0.5;
            allFactors.push({ keyword: `label:${label}`, weight: entry.weight * 0.5, source: 'description' });
          }
        }
      }
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return {
      taskType: 'feature',
      confidence: 0,
      factors: [],
      secondaryTypes: [],
      requiresManualReview: true,
    };
  }

  const topType = entries[0]![0] as TaskType;
  const topScore = entries[0]![1];
  let totalScore = 0;
  const secondaryTypes: { taskType: TaskType; confidence: number }[] = [];

  for (const entry of entries) {
    totalScore += entry[1];
  }

  for (const entry of entries) {
    if (entry[0] !== topType) {
      secondaryTypes.push({ taskType: entry[0] as TaskType, confidence: Math.round((entry[1] / (totalScore || 1)) * 100) });
    }
  }

  secondaryTypes.sort((a, b) => b.confidence - a.confidence);

  const confidence = totalScore > 0 ? Math.round((topScore / totalScore) * 100) : 0;
  const requiresManualReview = confidence < 50;

  const topFactors = allFactors.filter(f => {
    for (const [type] of entries) {
      if (type === topType && Object.keys(KEYWORD_MAP).some(k => f.keyword.includes(k))) {
        return true;
      }
    }
    return false;
  }).slice(0, 5);

  return {
    taskType: topType,
    confidence,
    factors: topFactors.length > 0 ? topFactors : allFactors.slice(0, 3),
    secondaryTypes: secondaryTypes.slice(0, 3),
    requiresManualReview,
  };
}

/** classifyByFiles */
export function classifyByFiles(files: string[]): TaskType | null {
  if (!files || files.length === 0) return null;

  const scores: Record<string, number> = {};
  for (const file of files) {
    const lowerFile = file.toLowerCase();
    for (const [pattern, types] of Object.entries(FILE_PATTERNS)) {
      if (lowerFile.includes(pattern)) {
        for (const type of types) {
          scores[type] = (scores[type] || 0) + 0.3;
        }
      }
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return entries[0]![0] as TaskType;
}

/** classify */
export function classify(request: ClassificationRequest): ClassificationResult {
  const descResult = classifyByDescription(request);

  if (request.files && request.files.length > 0 && descResult.confidence < 70) {
    const fileType = classifyByFiles(request.files);
    if (fileType && descResult.taskType !== fileType) {
      const fileFactors: ClassificationFactor[] = request.files.map(f => ({
        keyword: `file:${f}`,
        weight: 0.3,
        source: 'files' as const,
      }));
      descResult.factors.push(...fileFactors);

      const existingIdx = descResult.secondaryTypes.findIndex(s => s.taskType === fileType);
      if (existingIdx >= 0) {
        descResult.secondaryTypes[existingIdx]!.confidence = Math.min(100, descResult.secondaryTypes[existingIdx]!.confidence + 15);
      } else {
        descResult.secondaryTypes.push({ taskType: fileType, confidence: 30 });
      }
    }
  }

  return descResult;
}

/** classifyAndExplain */
export function classifyAndExplain(request: ClassificationRequest): {
  result: ClassificationResult;
  explanation: string;
} {
  const result = classify(request);
  const lines: string[] = [];
  lines.push(`Classificação: ${TASK_TYPE_LABELS[result.taskType]}`);
  lines.push(`Confiança: ${result.confidence}%`);
  lines.push('');

  if (result.factors.length > 0) {
    lines.push('Fatores considerados:');
    for (const f of result.factors) {
      lines.push(`  - "${f.keyword}" (peso ${f.weight}, fonte: ${f.source})`);
    }
    lines.push('');
  }

  if (result.secondaryTypes.length > 0) {
    lines.push('Tipos secundários:');
    for (const s of result.secondaryTypes) {
      lines.push(`  - ${TASK_TYPE_LABELS[s.taskType]}: ${s.confidence}%`);
    }
    lines.push('');
  }

  if (result.requiresManualReview) {
    lines.push('⚠ Confiança baixa — revisão manual recomendada.');
    lines.push('');
  }

  const routing = DEFAULT_ROUTING[result.taskType];
  lines.push('Pipeline recomendado:');
  for (const step of routing.pipeline) {
    lines.push(`  - ${step}`);
  }
  lines.push('');
  lines.push(`Contexto: ${routing.context}`);
  lines.push(`Agentes: ${routing.agents.join(', ')}`);
  lines.push(`Budget: ${routing.budget}`);
  lines.push(`Risco: ${routing.risk}`);

  return { result, explanation: lines.join('\n') };
}

/** extractRouting */
export function extractRouting(taskType: TaskType): TypeRouting {
  return DEFAULT_ROUTING[taskType];
}

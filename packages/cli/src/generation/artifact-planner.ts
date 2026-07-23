import { ProductScope, ProductPlan, ProductArtifactSpec } from './product-model';

export function planArtifacts(scope: ProductScope): ProductPlan {
  const artifacts: ProductArtifactSpec[] = [
    {
      path: `docs/${scope.productName}/overview.md`,
      title: 'Visão geral',
      purpose: 'Resumo executivo do produto',
      sections: ['Objetivo', 'Escopo', 'Arquitetura', 'Checklist'],
      required: true,
      priority: 'high',
    },
    {
      path: `docs/${scope.productName}/implementation.md`,
      title: 'Implementação',
      purpose: 'Detalhes de execução',
      sections: ['Componentes', 'Fluxo', 'Decisões', 'Riscos'],
      required: true,
      priority: 'high',
    },
    {
      path: `docs/${scope.productName}/ops.md`,
      title: 'Operação',
      purpose: 'Uso operacional e prompts',
      sections: ['Comandos', 'Prompts', 'Validação', 'Fluxo de atuação'],
      required: true,
      priority: 'medium',
    },
  ];

  return {
    scope,
    artifacts,
    gaps: [],
    confidence: 0.92,
  };
}

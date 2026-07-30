import { TaskPlan, IntentClassification } from './pipeline-types';

const TASK_TEMPLATES: Record<string, Array<{ description: string; estimatedTokens: number }>> = {
  bugfix: [
    { description: 'Analisar logs e identificar causa raiz', estimatedTokens: 500 },
    { description: 'Implementar correção', estimatedTokens: 1500 },
    { description: 'Adicionar teste de regressão', estimatedTokens: 800 },
    { description: 'Verificar impacto em outros módulos', estimatedTokens: 500 },
  ],
  feature: [
    { description: 'Analisar requisitos e impacto', estimatedTokens: 500 },
    { description: 'Planejar implementação', estimatedTokens: 1000 },
    { description: 'Implementar funcionalidade', estimatedTokens: 3000 },
    { description: 'Escrever testes', estimatedTokens: 1500 },
    { description: 'Atualizar documentação', estimatedTokens: 500 },
  ],
  refactor: [
    { description: 'Mapear código existente', estimatedTokens: 1000 },
    { description: 'Criar nova estrutura', estimatedTokens: 2000 },
    { description: 'Migrar código', estimatedTokens: 2000 },
    { description: 'Verificar equivalência', estimatedTokens: 1000 },
  ],
};

export class TaskPlanner {
  plan(intent: IntentClassification): TaskPlan | undefined {
    if (intent.category === 'question') return undefined;
    const tasks = TASK_TEMPLATES[intent.category] || [
      { description: 'Analisar solicitação', estimatedTokens: 500 },
      { description: 'Executar tarefa', estimatedTokens: 2000 },
    ];
    const totalTokens = tasks.reduce((s, t) => s + t.estimatedTokens, 0);
    return { tasks: tasks.map((t, i) => ({ ...t, id: `task-${i + 1}` })), totalTokens, parallel: intent.scope === 'cross_module' };
  }
}

import { ProductPlan } from './product-model';
import { createLogger } from '@ideia/logger';
const logger = createLogger('artifact-content-generator');

export interface GeneratedDocument {
  path: string;
  content: string;
  source: string;
  generatedAt: string;
}

export function generateDocuments(plan: ProductPlan): GeneratedDocument[] {
  return plan.artifacts.map((artifact) => {
    const content = [
      `# ${artifact.title}`,
      '',
      '## Objetivo',
      artifact.purpose,
      '',
      '## Escopo',
      `- Produto: ${plan.scope.productName}`,
      `- Tipo: ${plan.scope.productType}`,
      `- Prioridade: ${artifact.priority}`,
      '',
      '## Seções',
      ...artifact.sections.map((section) => `- ${section}`),
      '',
      '## Checklist',
      '- [ ] Revisar aderência ao escopo',
      '- [ ] Validar completude',
      '- [ ] Sincronizar com o estado consolidado',
      '',
      '## Próximos passos',
      '- Registrar origem',
      '- Versionar saída',
      '- Validar consumo por IA',
    ].join('\n');

    return {
      path: artifact.path,
      content,
      source: 'ai-devkit generation pipeline',
      generatedAt: new Date().toISOString(),
    };
  });
}

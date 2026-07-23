import { GenerationPlan } from './artifact-types';
import { DevkitState } from '../state/state-types';

export interface GeneratedArtifact {
  path: string;
  content: string;
  createdAt: string;
}

export interface GeneratorContext {
  state?: DevkitState;
  templateVars?: Record<string, string>;
}

export function generateArtifacts(plan: GenerationPlan, ctx?: GeneratorContext): GeneratedArtifact[] {
  return plan.artifacts.map(artifact => {
    const content = buildArtifactContent(artifact.title, plan.scope.productName, plan.scope.productType, artifact.priority, artifact.sections, ctx);
    return {
      path: artifact.path,
      content,
      createdAt: new Date().toISOString(),
    };
  });
}

function buildArtifactContent(
  title: string,
  productName: string,
  productType: string,
  priority: string,
  sections: string[],
  ctx?: GeneratorContext
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push('## Objetivo');
  lines.push(`Artefato gerado sob demanda para o produto ${productName}.`);
  lines.push('');
  lines.push('## Escopo');
  lines.push(`- Tipo: ${productType}`);
  lines.push(`- Prioridade: ${priority}`);
  lines.push(`- Seções: ${sections.join(', ')}`);
  lines.push('');

  if (sections.includes('Resumo')) {
    lines.push('## Resumo');
    lines.push('Este artefato documenta os aspectos operacionais e técnicos necessários.');
    lines.push('');
  }

  if (sections.includes('Implementação')) {
    lines.push('## Implementação');
    lines.push('- Definir estrutura e contratos');
    lines.push('- Implementar lógica central');
    lines.push('- Adicionar testes e validação');
    lines.push('');
  }

  lines.push('## Checklist');
  lines.push('- [ ] Revisar conteúdo');
  lines.push('- [ ] Validar completude');
  lines.push('- [ ] Sincronizar com docs');
  lines.push('');

  if (sections.includes('Prompts')) {
    lines.push('## Prompts');
    lines.push('- Prompt de revisão: Revise o artefato para completude e consistência.');
    lines.push('- Prompt de validação: Valide se o artefato cobre todos os requisitos.');
    lines.push('');
  }

  if (ctx?.templateVars) {
    lines.push('## Variáveis');
    for (const [key, value] of Object.entries(ctx.templateVars)) {
      lines.push(`- ${key}: ${value}`);
    }
    lines.push('');
  }

  lines.push('## Próximos passos');
  lines.push('- Integrar com pipeline de geração');
  lines.push('- Registrar origem do conteúdo');

  return lines.join('\n');
}

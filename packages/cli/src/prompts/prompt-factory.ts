import { PromptDefinition, PromptContext, RenderedPrompt } from './prompt-types';
import { createLogger } from '@ideia/logger';
import { MASTER_PROMPT } from './prompt-master';

export function buildGenerationPrompt(context: PromptContext): string {
  const lines: string[] = [];
  lines.push('Gere os artefatos requeridos para o produto informado.');
  lines.push('Cada artefato deve conter:');
  lines.push('- objetivo');
  lines.push('- escopo');
  lines.push('- estrutura');
  lines.push('- checklist');
  lines.push('- próximos passos');
  lines.push('');
  lines.push('Regras:');
  lines.push('- não inventar escopo');
  lines.push('- não extrapolar prioridades');
  lines.push('- manter conteúdo condensado');
  lines.push('- registrar origem');
  lines.push('- apontar lacunas');
  lines.push('');

  if (context.productName) {
    lines.push(`Produto: ${context.productName}`);
  }
  if (context.gaps && context.gaps.length > 0) {
    lines.push('');
    lines.push('Gaps identificados:');
    for (const gap of context.gaps) lines.push(`- ${gap}`);
  }

  return lines.join('\n');
}

export function buildConsistencyPrompt(): string {
  return [
    'Compare documentação, código, testes, CLI e extensão.',
    'Retorne apenas:',
    '- áreas consistentes;',
    '- áreas parciais;',
    '- áreas bloqueadas;',
    '- gaps prioritários;',
    '- recomendação curta.',
    '',
    'Use formato condensado e estruturado.',
  ].join('\n');
}

export function buildHardeningPrompt(): string {
  return [
    'Avalie contratos, saídas e sincronização do ai-devkit.',
    'Identifique:',
    '- inconsistências',
    '- riscos',
    '- ausência de envelope',
    '- erros não padronizados',
    '- pontos de deriva',
    '',
    'Retorne um plano curto, priorizado e acionável.',
  ].join('\n');
}

export function renderPrompt(prompt: PromptDefinition, ctx?: PromptContext): RenderedPrompt {
  const parts: string[] = [
    prompt.role,
    '',
    'Objetivo:',
    prompt.goal,
    '',
    'Regras:',
    ...prompt.rules.map(r => `- ${r}`),
    '',
    'Fluxo:',
    ...prompt.flow.map((step, i) => `${i + 1}. ${step}`),
    '',
    'Saída esperada:',
    ...prompt.output.map(o => `- ${o}`),
  ];

  if (ctx?.gaps && ctx.gaps.length > 0) {
    parts.push('');
    parts.push('Gaps:');
    for (const gap of ctx.gaps) parts.push(`- ${gap}`);
  }

  return {
    id: prompt.id,
    content: parts.join('\n'),
    version: prompt.version,
    renderedAt: new Date().toISOString(),
  };
}

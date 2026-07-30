import { createLogger } from '@ideia/logger';
import {
  DecisionRequest,
  DecisionOption,
  DecisionRecord,
  RiskLevel,
  OrchestrationCheckpoint,
} from './orchestration-types';

/** Interface que define a estrutura de decision prompt. */
export interface DecisionPrompt {
  title: string;
  summary: string;
  reason: string;
  impact: string;
  recommendedAction: string;
  options: DecisionOption[];
  customAllowed: boolean;
  formatted: string;
}

/**
 * Constrói decision request.
 * @param title - Valor title.
 * @param summary - Valor summary.
 * @param reason - Valor reason.
 * @param context - Valor context.
 * @param checkpoint - Valor checkpoint.
 * @param recommendedAction - Valor action.
 * @param _options - Valor _options.
 * @returns O resultado da operação.
 */
export function buildDecisionRequest(
  title: string,
  summary: string,
  reason: string,
  context: string,
  checkpoint: OrchestrationCheckpoint,
  recommendedAction: string,
  _options?: DecisionOption[],
): DecisionRequest {
  const options: DecisionOption[] = [
    {
      id: 'A',
      label: 'Conservador',
      description: 'Manter a abordagem de menor risco.',
      riskLevel: 'low',
      impact: 'Menor mudanca estrutural. Avanco lento mas seguro.',
    },
    {
      id: 'B',
      label: 'Recomendado',
      description: 'Seguir a recomendacao do sistema.',
      riskLevel: 'low',
      impact: 'Melhor equilibrio entre avancar e manter seguranca.',
      recommended: true,
    },
    {
      id: 'C',
      label: 'Agressivo',
      description: 'Aumentar velocidade e escopo.',
      riskLevel: 'high',
      impact: 'Maior ganho potencial, maior risco de retrabalho.',
    },
    {
      id: 'D',
      label: 'Resposta Aberta',
      description: 'Escreva sua propria decisao detalhada.',
      riskLevel: 'medium',
      impact: 'Personalizado conforme sua analise.',
    },
  ];

  return {
    id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    summary,
    context,
    reason,
    recommendedAction,
    options,
    customAllowed: true,
    checkpointId: checkpoint.id,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verifica decision completeness.
 * @param request - Valor request.
 * @returns O resultado da operação.
 */
export function checkDecisionCompleteness(request: DecisionRequest): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  const optionIds = request.options.map(o => o.id);

  if (!optionIds.includes('A')) missing.push('Opcao A ausente');
  if (!optionIds.includes('B')) missing.push('Opcao B ausente');
  if (!optionIds.includes('C')) missing.push('Opcao C ausente');
  if (!optionIds.includes('D')) missing.push('Opcao D ausente');

  if (!request.options.some(o => o.recommended)) missing.push('Nenhuma opcao marcada como recomendada');

  if (!request.customAllowed) missing.push('customAllowed deve ser true');

  return { complete: missing.length === 0, missing };
}

/**
 * Constrói decision prompt.
 * @param req - Valor req.
 * @returns O resultado da operação.
 */
export function buildDecisionPrompt(req: DecisionRequest): DecisionPrompt {
  const quickHelp = [
    '## Ajuda rapida (3-6 linhas)',
    '- Opcao A: caminho conservador, menor risco',
    '- Opcao B: caminho recomendado, equilibrio risco/avanca',
    '- Opcao C: caminho agressivo, maior ganho potencial',
    '- Opcao D: resposta aberta, escreva sua decisao manualmente',
  ].join('\n');

  const formatted = [
    `# Decisao necessaria: ${req.title}`,
    '',
    `## Contexto`,
    req.context,
    '',
    `## Motivo`,
    req.reason,
    '',
    `## Impacto`,
    req.options.find(o => o.recommended)?.impact ?? 'Impacto a definir.',
    '',
    `## Recomendacao do sistema`,
    req.recommendedAction,
    '',
    `## Opcoes`,
    ...req.options.map(o =>
      `  ${o.id}. ${o.label}${o.recommended ? ' (recomendado)' : ''}\n     ${o.description}\n     Risco: ${o.riskLevel} | Impacto: ${o.impact}`
    ),
    '',
    quickHelp,
    '',
    `## Resposta esperada`,
    `Escolha A, B${req.customAllowed ? ', C ou D' : ' ou C'} e, se quiser, escreva uma instrucao personalizada.`,
  ].join('\n');

  return {
    title: req.title,
    summary: req.summary,
    reason: req.reason,
    impact: req.options.find(o => o.recommended)?.impact ?? '',
    recommendedAction: req.recommendedAction,
    options: req.options,
    customAllowed: req.customAllowed,
    formatted,
  };
}

/**
 * Resolve decision.
 * @param request - Valor request.
 * @param selectedOptionId - Valor option id.
 * @param customValue - Valor value.
 * @param rationale - Valor rationale.
 * @returns O resultado da operação.
 */
export function resolveDecision(
  request: DecisionRequest,
  selectedOptionId?: string,
  customValue?: string,
  rationale?: string,
): DecisionRecord {
  return {
    decisionRequestId: request.id,
    selectedOptionId,
    customValue,
    rationale,
    decidedAt: new Date().toISOString(),
  };
}

/**
 * Obtém option by id.
 * @param request - Valor request.
 * @param optionId - Valor id.
 * @returns O resultado da operação.
 */
export function getOptionById(request: DecisionRequest, optionId: string): DecisionOption | undefined {
  return request.options.find(o => o.id === optionId);
}

/**
 * Estima decision risk.
 * @param request - Valor request.
 * @param selectedOptionId - Valor option id.
 * @returns O resultado da operação.
 */
export function estimateDecisionRisk(
  request: DecisionRequest,
  selectedOptionId: string,
): { riskLevel: RiskLevel; reasons: string[] } {
  const option = getOptionById(request, selectedOptionId);
  if (!option) return { riskLevel: 'medium', reasons: ['Opcao desconhecida'] };
  return { riskLevel: option.riskLevel, reasons: [option.description] };
}

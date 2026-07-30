import { ChangeIntent } from './consistency-engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('intent-expander');

/** Interface que define a estrutura de expanded intent. */
export interface ExpandedIntent {
  original: ChangeIntent;
  expanded: string[];
  risk: 'low' | 'medium' | 'high';
  impactAreas: string[];
  recommendations: string[];
  scope: 'local' | 'module' | 'cross-cutting';
}

/** Interface que define a estrutura de risk assessment. */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: RiskFactor[];
  overall: string;
  mitigatedRisk: 'low' | 'medium' | 'high';
}

/** Interface que define a estrutura de risk factor. */
export interface RiskFactor {
  name: string;
  description: string;
  impact: number;
  probability: number;
  severity: number;
  mitigation: string;
}

const INTENT_EXPANSIONS: Record<ChangeIntent, { expanded: string[]; impactAreas: string[]; recommendations: string[] }> = {
  new_feature: {
    expanded: ['criar novos arquivos', 'adicionar endpoints', 'implementar casos de uso', 'cobrir com testes', 'atualizar documentacao'],
    impactAreas: ['api', 'dominio', 'testes', 'documentacao'],
    recommendations: ['Criar use cases antes de controllers', 'DTOs com validacao', 'Testes de integracao obrigatorios'],
  },
  bugfix: {
    expanded: ['identificar causa raiz', 'corrigir logica', 'adicionar regressao', 'verificar impacto colateral'],
    impactAreas: ['logica de negocio', 'testes'],
    recommendations: ['Criar teste que reproduz o bug primeiro', 'Verificar se mesma correcao se aplica em outros lugares'],
  },
  refactor: {
    expanded: ['extrair funcoes', 'renomear variaveis', 'simplificar condicionais', 'remover duplicacao', 'atualizar imports'],
    impactAreas: ['estrutura de codigo', 'arquivos importados'],
    recommendations: ['Manter API publica inalterada', 'Executar testes apos cada passo', 'Usar pequenos commits'],
  },
  optimization: {
    expanded: ['analisar gargalos', 'otimizar queries', 'adicionar cache', 'reduzir bundle'],
    impactAreas: ['performance', 'infraestrutura'],
    recommendations: ['Medir antes e depois', 'Benchmark com baseline', 'Verificar tradeoff memoria vs CPU'],
  },
  security: {
    expanded: ['revisar autenticacao', 'sanitizar entradas', 'atualizar dependencias', 'adicionar rate limiting'],
    impactAreas: ['autenticacao', 'dados sensiveis', 'rede'],
    recommendations: ['Nunca commitar secrets', 'Usar helmet/seguranca por padrao', 'Revisao de codigo obrigatoria'],
  },
  docs: {
    expanded: ['atualizar README', 'adicionar JSDoc', 'criar exemplos de uso', 'atualizar CHANGELOG'],
    impactAreas: ['documentacao', 'exemplos'],
    recommendations: ['Documentar o "por que" nao o "o que"', 'Incluir exemplos de uso'],
  },
  unknown: {
    expanded: ['analisar codigo fonte', 'identificar padroes', 'verificar contexto'],
    impactAreas: ['geral'],
    recommendations: ['Definir objetivo claro antes de implementar'],
  },
};

const DEFAULT_RISK_FACTORS: RiskFactor[] = [
  { name: 'Complexidade', description: 'Alta complexidade ciclomatica', impact: 0.4, probability: 0.3, severity: 0, mitigation: 'Dividir em funcoes menores' },
  { name: 'Dependencias', description: 'Muitas dependencias externas', impact: 0.3, probability: 0.2, severity: 0, mitigation: 'Usar injecao de dependencia' },
  { name: 'Dados sensiveis', description: 'Manipulacao de dados sensiveis', impact: 0.5, probability: 0.1, severity: 0, mitigation: 'Revisao de seguranca obrigatoria' },
  { name: 'Breaking changes', description: 'Mudancas na API publica', impact: 0.4, probability: 0.3, severity: 0, mitigation: 'Versionamento semantico' },
  { name: 'Testes ausentes', description: 'Area sem cobertura de testes', impact: 0.3, probability: 0.4, severity: 0, mitigation: 'Adicionar testes primeiro' },
];

/**
 * Processa intent.
 * @param intent - Valor intent.
 * @param code - Valor code.
 * @returns O resultado da operação.
 */
export function expandIntent(intent: ChangeIntent, _code: string): ExpandedIntent {
  const expansion = INTENT_EXPANSIONS[intent];
  let risk: 'low' | 'medium' | 'high' = 'low';
  if (intent === 'security') risk = 'high';
  else if (intent === 'bugfix' || intent === 'refactor') risk = 'medium';

  return {
    original: intent,
    expanded: expansion.expanded,
    risk,
    impactAreas: expansion.impactAreas,
    recommendations: expansion.recommendations,
    scope: intent === 'refactor' || intent === 'optimization' ? 'module' : intent === 'unknown' ? 'local' : 'cross-cutting',
  };
}

/**
 * Processa risk.
 * @param intent - Valor intent.
 * @param complexity - Valor complexity.
 * @param code - Valor code.
 * @param factors - Valor factors.
 * @returns O resultado da operação.
 */
export function assessRisk(intent: ChangeIntent, complexity: number, code: string, factors?: RiskFactor[]): RiskAssessment {
  const allFactors = (factors || DEFAULT_RISK_FACTORS).map(f => {
    let probabilityAdjustment = 0;
    if (complexity > 7) probabilityAdjustment += 0.2;
    if (intent === 'security') probabilityAdjustment += 0.3;
    if (intent === 'refactor') probabilityAdjustment += 0.1;

    const adjustedProbability = Math.min(1, f.probability + probabilityAdjustment);
    const severity = f.impact * adjustedProbability;

    return { ...f, probability: Math.round(adjustedProbability * 100) / 100, severity: Math.round(severity * 100) / 100 };
  });

  const maxSeverity = Math.max(...allFactors.map(f => f.severity), 0);

  let level: 'low' | 'medium' | 'high';
  if (maxSeverity >= 0.3) level = 'high';
  else if (maxSeverity >= 0.15) level = 'medium';
  else level = 'low';

  const mitigated = allFactors.reduce((min, f) => Math.min(min, f.severity - 0.2), level === 'high' ? 0.3 : level === 'medium' ? 0.15 : 0);
  const mitigatedLevel: 'low' | 'medium' | 'high' = mitigated >= 0.3 ? 'high' : mitigated >= 0.15 ? 'medium' : 'low';

  return {
    level,
    score: Math.round(maxSeverity * 100),
    factors: allFactors,
    overall: `Risco ${level.toUpperCase()} (score: ${Math.round(maxSeverity * 100)}). ${allFactors.filter(f => f.severity > 0.2).map(f => f.name).join(', ')}`,
    mitigatedRisk: mitigatedLevel,
  };
}

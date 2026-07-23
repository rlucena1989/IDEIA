/** Interface que define a estrutura de ambiguity signal. */
export interface AmbiguitySignal {
  type: 'vague_term' | 'missing_scope' | 'missing_target' | 'conflicting_intent' | 'missing_format' | 'unclear_reference';
  text: string;
  position: number;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

/** Interface que define a estrutura de enrichment suggestion. */
export interface EnrichmentSuggestion {
  field: string;
  value: string;
  confidence: number;
  source: string;
}

/** Interface que define a estrutura de ambiguity report. */
export interface AmbiguityReport {
  signals: AmbiguitySignal[];
  total: number;
  overallAmbiguity: 'low' | 'medium' | 'high';
  suggestions: EnrichmentSuggestion[];
  enrichedDescription: string;
}

const VAGUE_TERMS = ['coisa', 'negocio', 'parada', 'trem', 'bagulho', 'algo', 'aquilo', 'isso', 'fazer', 'coisar', 'melhorar', 'ajustar', 'arrumar'];
const VAGUE_PATTERNS = [
  { pattern: /\b(isto|aquilo|algo|lugar|lá|cá)\b/i, suggestion: 'Seja mais especifico sobre o que se refere' },
  { pattern: /\b(melhorar|otimizar|aprimorar)\s+\w*\b/i, suggestion: 'Especifique qual metrica deseja melhorar' },
  { pattern: /\b(fazer|criar|implementar)\s*$/i, suggestion: 'O que exatamente deseja criar?' },
  { pattern: /\barrumar|concertar|ajeitar\b/i, suggestion: 'O que esta quebrado? Qual o comportamento esperado?' },
  { pattern: /\b(como|onde|quando|por que)\s*$/i, suggestion: 'Complete a pergunta com mais contexto' },
];

/**
 * Detecta ambiguity.
 * @param content - Valor content.
 * @returns O resultado da operação.
 */
export function detectAmbiguity(content: string): AmbiguityReport {
  const signals: AmbiguitySignal[] = [];
  const suggestions: EnrichmentSuggestion[] = [];
  const lower = content.toLowerCase();

  for (const v of VAGUE_TERMS) {
    let idx = lower.indexOf(v);
    while (idx !== -1) {
      signals.push({
        type: 'vague_term',
        text: v,
        position: idx,
        suggestion: `Termo vago "${v}" detectado. Substitua por algo mais especifico.`,
        severity: 'medium',
      });
      idx = lower.indexOf(v, idx + 1);
    }
  }

  for (const p of VAGUE_PATTERNS) {
    const match = content.match(p.pattern);
    if (match) {
      signals.push({
        type: 'vague_term',
        text: match[0],
        position: match.index || 0,
        suggestion: p.suggestion,
        severity: 'high',
      });
    }
  }

  if (content.length < 20) {
    signals.push({
      type: 'missing_scope',
      text: content,
      position: 0,
      suggestion: 'Descricao muito curta. Adicione contexto: o que, onde, por que, como.',
      severity: 'high',
    });
    suggestions.push({ field: 'context', value: 'Adicione contexto (arquivo, funcionalidade, objetivo)', confidence: 0.9, source: 'ambiguity-detector' });
  }

  const hasFile = /(?:em|no|na|arquivo|file|src\/|packages\/|app\/)/i.test(content);
  if (!hasFile && content.length > 30) {
    signals.push({
      type: 'missing_target',
      text: content,
      position: 0,
      suggestion: 'Nenhum arquivo ou diretorio mencionado. Especifique onde aplicar a mudanca.',
      severity: 'medium',
    });
    suggestions.push({ field: 'target', value: 'Informe o caminho do arquivo ou diretorio alvo', confidence: 0.8, source: 'ambiguity-detector' });
  }

  const intents = ['criar', 'corrigir', 'refatorar', 'testar', 'deletar'];
  const foundIntents = intents.filter(i => lower.includes(i));
  if (foundIntents.length > 2) {
    signals.push({
      type: 'conflicting_intent',
      text: `Multiplas intencoes: ${foundIntents.join(', ')}`,
      position: 0,
      suggestion: 'Foco em uma unica intencao por requisicao.',
      severity: 'medium',
    });
  }

  let overallAmbiguity: 'low' | 'medium' | 'high' = 'low';
  const highCount = signals.filter(s => s.severity === 'high').length;
  const medCount = signals.filter(s => s.severity === 'medium').length;
  if (highCount >= 2 || medCount >= 4) overallAmbiguity = 'high';
  else if (highCount >= 1 || medCount >= 2) overallAmbiguity = 'medium';

  const enrichedDescription = signals.length > 0
    ? `${content}\n\n[Ambiguidade ${overallAmbiguity.toUpperCase()}: ${signals.length} sinais detectados. Considere: ${signals.slice(0, 3).map(s => s.suggestion).join('; ')}]`
    : content;

  return { signals, total: signals.length, overallAmbiguity, suggestions, enrichedDescription };
}

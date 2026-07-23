/** Tipo que define input source. */
export type InputSource = 'text' | 'voice' | 'structured' | 'hybrid' | 'visual';
/** Tipo que define input mode. */
export type InputMode = 'natural_language' | 'structured_command' | 'template' | 'hybrid';

/** Interface que define a estrutura de raw request. */
export interface RawRequest {
  source: InputSource;
  content: string;
  metadata?: Record<string, string>;
}

/** Interface que define a estrutura de normalized request. */
export interface NormalizedRequest {
  source: InputSource;
  original: string;
  normalized: string;
  mode: InputMode;
  priority: number;
  intents: string[];
  entities: string[];
  confidence: number;
}

const STOP_WORDS = new Set(['o', 'a', 'os', 'as', 'de', 'da', 'do', 'em', 'para', 'com', 'um', 'uma', 'se', 'por', 'que', 'e', 'nao', 'sim', 'no', 'na']);

function classifyMode(content: string): InputMode {
  if (content.startsWith('/') || content.startsWith('ai-devkit')) return 'structured_command';
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length >= 3 && lines.some(l => l.includes(':') || l.includes('=>'))) return 'hybrid';
  return 'natural_language';
}

function extractEntities(content: string): string[] {
  const tokens = content.toLowerCase().split(/[\s,.;!?()[\]]{}"']+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));
  return [...new Set(tokens)];
}

function extractIntents(content: string): string[] {
  const intents: string[] = [];
  const lower = content.toLowerCase();
  if (/criar|create|novo?|new|adicionar|add|implementar|implement/.test(lower)) intents.push('create');
  if (/corrigir|fix|bug|error|consertar|issue/.test(lower)) intents.push('fix');
  if (/refatorar|refactor|melhorar|improve|otimizar|optimize/.test(lower)) intents.push('refactor');
  if (/deletar|remove|remover|excluir|delete/.test(lower)) intents.push('delete');
  if (/testar|test|cobertura|coverage/.test(lower)) intents.push('test');
  if (/doc|documentar|document|readme/.test(lower)) intents.push('document');
  if (/deploy|publicar|publish|release/.test(lower)) intents.push('deploy');
  if (intents.length === 0) intents.push('unknown');
  return intents;
}

function computePriority(intents: string[], _source: InputSource): number {
  if (intents.includes('fix') || intents.includes('deploy')) return 5;
  if (intents.includes('create')) return 4;
  if (intents.includes('refactor') || intents.includes('test')) return 3;
  if (intents.includes('document')) return 2;
  return 1;
}

/**
 * Normaliza request.
 * @param raw - Valor raw.
 * @returns O resultado da operação.
 */
export function normalizeRequest(raw: RawRequest): NormalizedRequest {
  const mode = classifyMode(raw.content);
  const intents = extractIntents(raw.content);
  const entities = extractEntities(raw.content);

  let normalized = raw.content.trim();
  if (mode === 'natural_language') {
    normalized = normalized.replace(/^(poderia|pode|quero|gostaria|preciso|necessito)\s+/i, '');
    normalized = normalized.replace(/[?.!]+$/g, '').trim();
  }

  return {
    source: raw.source,
    original: raw.content,
    normalized,
    mode,
    priority: computePriority(intents, raw.source),
    intents,
    entities,
    confidence: mode === 'structured_command' ? 0.95 : mode === 'hybrid' ? 0.8 : 0.6,
  };
}

/**
 * Formata request overview.
 * @param req - Valor req.
 * @returns O resultado da operação.
 */
export function formatRequestOverview(req: NormalizedRequest): string {
  return `  prioridade=${req.priority} modo=${req.mode} confianca=${req.confidence}%\n` +
      `  Original: ${req.original}\n` +
      `  Normalizado: ${req.normalized}\n` +
      `  Intencoes: ${req.intents.join(", ")}\n` +
      `  Entidades: ${req.entities.join(", ")}`;
}

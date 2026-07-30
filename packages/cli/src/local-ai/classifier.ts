import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';

/** Interface que define a estrutura de inference log entry. */
export interface InferenceLogEntry {
  timestamp: string;
  route: string;
  model: string;
  prompt_hash: string;
  tokens?: number;
  duration_ms?: number;
  success: boolean;
  error?: string;
}

/** Interface que define a estrutura de audit entry. */
export interface AuditEntry {
  timestamp: string;
  route: string;
  model: string;
  prompt_hash: string;
  tokens?: number;
  allow_write: boolean;
  offline: boolean;
}

const TFIDF_CATEGORIES: Record<string, string[]> = {
  feature: ['implementar', 'criar', 'adicionar', 'nova', 'feature', 'funcionalidade', 'implement'],
  bug: ['bug', 'erro', 'falha', 'crash', 'exception', 'não funciona', 'quebrado', 'broken'],
  refactor: ['refatorar', 'refactor', 'melhorar', 'otimizar', 'optimize', 'extrair', 'extract', 'renomear'],
  docs: ['documentar', 'doc', 'readme', 'changelog', 'comentário', 'comment', 'docs'],
  chore: [' chore', 'setup', 'config', 'dependência', 'dependency', 'update', 'atualizar'],
};

/**
 * Processa classify.
 * @param text - Valor text.
 * @returns O resultado da operação.
 */
export function tfidfClassify(text: string): { category: string; confidence: number } {
  const lower = text.toLowerCase();
  let best = 'chore';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(TFIDF_CATEGORIES)) {
    let score = 0;
    for (const kw of keywords) {
      let count = 0;
      let idx = 0;
      while ((idx = lower.indexOf(kw, idx)) !== -1) {
        count++;
        idx += kw.length;
      }
      score += count;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }

  const maxPossible = Math.max(...Object.values(TFIDF_CATEGORIES).map(kw => kw.length));
  const confidence = Math.min(1, bestScore / maxPossible);

  return { category: best, confidence };
}

/**
 * Processa prompt.
 * @param prompt - Valor prompt.
 * @returns O resultado da operação.
 */
export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

/**
 * Constrói classify prompt.
 * @param fileContent - Valor content.
 * @returns O resultado da operação.
 */
export function buildClassifyPrompt(fileContent: string): string {
  return `Classifique a tarefa abaixo em uma das categorias: feature, bug, refactor, docs, chore.
Responda apenas com o nome da categoria.

${fileContent.slice(0, 2000)}`;
}

/**
 * Constrói summarize prompt.
 * @param fileContent - Valor content.
 * @param profile - Valor profile.
 * @returns O resultado da operação.
 */
export function buildSummarizePrompt(fileContent: string, profile: string): string {
  return `Sumarize o contexto abaixo para o perfil "${profile}".
Mantenha apenas informacoes relevantes para este perfil.

${fileContent.slice(0, 3000)}`;
}

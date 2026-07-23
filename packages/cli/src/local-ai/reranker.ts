import { DenseVectorDoc } from './vector-store';
import { computeFreshnessScore } from './freshness';
import { cosineSimilarity } from './embeddings';

/** Interface que define a estrutura de ranked result. */
export interface RankedResult {
  doc: DenseVectorDoc;
  semanticScore: number;
  freshnessScore: number;
  lexicalScore: number;
  hybridScore: number;
}

/** Tipo que define ranking strategy. */
export type RankingStrategy = 'hybrid' | 'semantic' | 'freshness' | 'lexical';

/** Interface que define a estrutura de reranker config. */
export interface RerankerConfig {
  semanticWeight: number;
  freshnessWeight: number;
  lexicalWeight: number;
  strategy: RankingStrategy;
}

const DEFAULT_RERANKER_CONFIG: RerankerConfig = {
  semanticWeight: 0.5,
  freshnessWeight: 0.25,
  lexicalWeight: 0.25,
  strategy: 'hybrid',
};

/**
 * Processa lexical score.
 * @param content - Valor content.
 * @param queryTerms - Consulta terms.
 * @returns O resultado da operação.
 */
export function computeLexicalScore(content: string, queryTerms: string[]): number {
  const lower = content.toLowerCase();
  const lowerTerms = queryTerms.map(t => t.toLowerCase());
  let hits = 0;
  for (const term of lowerTerms) {
    const idx = lower.indexOf(term);
    if (idx !== -1) hits++;
  }
  if (hits === 0) return 0;
  const termScore = hits / queryTerms.length;
  const proximityBonus = Math.min(hits > 1 ? 0.1 : 0, 0.1);
  return Math.min(termScore + proximityBonus, 1.0);
}

/**
 * Processa hybrid score.
 * @param semanticScore - Valor score.
 * @param freshnessScore - Valor score.
 * @param lexicalScore - Valor score.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function computeHybridScore(
  semanticScore: number,
  freshnessScore: number,
  lexicalScore: number,
  config?: Partial<RerankerConfig>
): number {
  const cfg = { ...DEFAULT_RERANKER_CONFIG, ...config };
  return (semanticScore * cfg.semanticWeight)
       + (freshnessScore * cfg.freshnessWeight)
       + (lexicalScore * cfg.lexicalWeight);
}

/**
 * Processa rerank.
 * @param docs - Valor docs.
 * @param queryVector - Consulta vector.
 * @param queryTerms - Consulta terms.
 * @param config - Valor config.
 * @returns O resultado da operação.
 */
export function rerank(
  docs: DenseVectorDoc[],
  queryVector: number[],
  queryTerms: string[],
  config?: Partial<RerankerConfig>
): RankedResult[] {
  const cfg = { ...DEFAULT_RERANKER_CONFIG, ...config };
  const qvLen = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));

  const results: RankedResult[] = docs.map((doc) => {
    const dvLen = Math.sqrt(doc.vector.reduce((s, v) => s + v * v, 0));
    const dot = doc.vector.reduce((s, v, i) => s + v * (queryVector[i] ?? 0), 0);
    const semanticScore = (qvLen === 0 || dvLen === 0) ? 0 : dot / (qvLen * dvLen);

    const freshnessScore = doc.mtimeMs ? computeFreshnessScore(doc.mtimeMs) : 0;
    const lexicalScore = computeLexicalScore(doc.content, queryTerms);

    let hybridScore: number;
    switch (cfg.strategy) {
      case 'semantic': hybridScore = semanticScore; break;
      case 'freshness': hybridScore = freshnessScore; break;
      case 'lexical': hybridScore = lexicalScore; break;
      default: hybridScore = computeHybridScore(semanticScore, freshnessScore, lexicalScore, cfg); break;
    }

    return { doc, semanticScore, freshnessScore, lexicalScore, hybridScore };
  });

  results.sort((a, b) => b.hybridScore - a.hybridScore);
  return results;
}

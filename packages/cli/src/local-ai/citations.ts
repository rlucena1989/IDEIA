import path from 'node:path';
import { DenseVectorDoc } from './vector-store';
import { RankedResult } from './reranker';

/** Interface que define a estrutura de citation. */
export interface Citation {
  filePath: string;
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  snippet: string;
  relevanceScore: number;
  source: 'dense' | 'tfidf' | 'hybrid';
  indexedAt: string;
}

/** Interface que define a estrutura de citation group. */
export interface CitationGroup {
  filePath: string;
  fileName: string;
  citations: Citation[];
  totalRelevance: number;
}

/**
 * Constrói citation.
 * @param doc - Valor doc.
 * @param score - Valor score.
 * @param source - Valor source.
 * @returns O resultado da operação.
 */
export function buildCitation(doc: DenseVectorDoc, score: number, source: Citation['source'] = 'hybrid'): Citation {
  return {
    filePath: doc.path,
    fileName: path.basename(doc.path),
    chunkIndex: doc.chunkIndex,
    totalChunks: doc.totalChunks,
    snippet: doc.content.length > 200 ? doc.content.slice(0, 200) + '...' : doc.content,
    relevanceScore: Math.round(score * 100) / 100,
    source,
    indexedAt: doc.indexedAt,
  };
}

/**
 * Constrói citations from results.
 * @param results - Valor results.
 * @param source - Valor source.
 * @returns O resultado da operação.
 */
export function buildCitationsFromResults(results: RankedResult[], source: Citation['source'] = 'hybrid'): Citation[] {
  return results.map((r) => buildCitation(r.doc, r.hybridScore, source));
}

/**
 * Agrupa citations by file.
 * @param citations - Valor citations.
 * @returns O resultado da operação.
 */
export function groupCitationsByFile(citations: Citation[]): CitationGroup[] {
  const groups = new Map<string, Citation[]>();
  for (const cit of citations) {
    const existing = groups.get(cit.filePath) || [];
    existing.push(cit);
    groups.set(cit.filePath, existing);
  }
  return Array.from(groups.entries())
    .map(([filePath, citList]) => ({
      filePath,
      fileName: citList[0]!.fileName,
      citations: citList,
      totalRelevance: citList.reduce((s, c) => s + c.relevanceScore, 0),
    }))
    .sort((a, b) => b.totalRelevance - a.totalRelevance);
}

/**
 * Formata citations md.
 * @param citations - Valor citations.
 * @returns O resultado da operação.
 */
export function formatCitationsMd(citations: Citation[]): string {
  const groups = groupCitationsByFile(citations);
  let output = '';
  for (const group of groups) {
    output += `### ${group.fileName}\n\n`;
    output += `_Fonte: \`${group.filePath}\`_ — Relevância total: ${group.totalRelevance.toFixed(2)}\n\n`;
    for (const cit of group.citations) {
      output += `> ${cit.snippet}\n>\n`;
      output += `> — Chunk ${cit.chunkIndex + 1}/${cit.totalChunks} (score: ${cit.relevanceScore})\n\n`;
    }
  }
  return output;
}

/**
 * Constrói prompt with citations.
 * @param question - Valor question.
 * @param citations - Valor citations.
 * @returns O resultado da operação.
 */
export function buildPromptWithCitations(question: string, citations: Citation[]): string {
  const citationBlock = citations
    .map((c) => `[${c.fileName}:${c.chunkIndex + 1}] ${c.snippet}`)
    .join('\n\n');

  return `You are an AI assistant with access to the project's documentation and source code.

Use the following context to answer the user's question. Each source is cited as [filename:chunk].
If the context doesn't contain enough information, say so.

<context>
${citationBlock}
</context>

Question: ${question}

Answer (cite sources as [filename:chunk] where applicable):`;
}

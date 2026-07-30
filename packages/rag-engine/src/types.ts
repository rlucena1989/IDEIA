export interface Chunk {
  id: string;
  path: string;
  content: string;
  index: number;
  totalChunks: number;
  startOffset: number;
  endOffset: number;
  metadata: Record<string, string>;
}

export interface Document {
  path: string;
  source: DocumentSource;
  category: DocumentCategory;
  content: string;
  mtimeMs: number;
  size: number;
}

export type DocumentSource = 'study' | 'source' | 'test' | 'config' | 'other';

export type DocumentCategory =
  | 'architecture'
  | 'implementation'
  | 'ux'
  | 'security'
  | 'performance'
  | 'integration'
  | 'testing'
  | 'deployment'
  | 'governance'
  | 'general';

export interface Citation {
  filePath: string;
  fileName: string;
  chunkIndex: number;
  totalChunks: number;
  snippet: string;
  relevanceScore: number;
  source: DocumentSource;
  category: DocumentCategory;
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
  semanticScore: number;
  keywordScore: number;
  citation: Citation;
}

export interface RagConfig {
  chunkSize: number;
  chunkOverlap: number;
  maxResults: number;
  minScore: number;
  semanticWeight: number;
  keywordWeight: number;
  rerankEnable: boolean;
  rerankDiversity: number;
}

export const DEFAULT_RAG_CONFIG: RagConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  maxResults: 10,
  minScore: 0.1,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  rerankEnable: true,
  rerankDiversity: 0.3,
};

export interface RagStats {
  totalDocuments: number;
  totalChunks: number;
  indexedPaths: string[];
  indexBuiltAt: string;
  indexSizeBytes: number;
}

export interface SearchFilter {
  source?: DocumentSource[];
  category?: DocumentCategory[];
  pathPattern?: string;
  minScore?: number;
  maxResults?: number;
}

export interface IndexOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  reindex?: boolean;
  extensions?: string[];
  ignorePatterns?: string[];
}
